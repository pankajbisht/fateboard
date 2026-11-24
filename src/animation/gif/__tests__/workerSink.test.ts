/**
 * The GIF encoder worker as the page sees it (fate-reviewer 2026-11-17: these paths had no tests): the
 * ready handshake, back-pressure, a failure in the middle, and a worker that cannot start (the export then
 * encodes on the page). A fake Worker stands in for the real one (jsdom has none).
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- a fake Worker */
import { describe, expect, it, vi } from 'vitest';
import { openSink, renderGif, workerSink } from '../renderGif';
import type { GifInit } from '../gifEncoder';
import { decodeGif } from './decodeGif';

const init: GifInit = {
    width: 2,
    height: 1,
    palette: new Uint8Array([0, 0, 0, 255, 255, 255]),
    loop: true,
    dither: false,
    transparent: false,
};

class FakeWorker {
    onmessage: ((e: { data: unknown }) => void) | null = null;
    onerror: ((e: { message: string; preventDefault: () => void }) => void) | null = null;
    posted: any[] = [];
    terminated = false;
    private readonly on: (m: any, w: FakeWorker) => void;
    constructor(on: (m: any, w: FakeWorker) => void = () => {}) {
        this.on = on;
    }
    postMessage(m: any) {
        this.posted.push(m);
        this.on(m, this);
    }
    terminate() {
        this.terminated = true;
    }
    reply(data: unknown) {
        this.onmessage?.({ data });
    }
    crash(message: string) {
        this.onerror?.({ message, preventDefault: () => {} });
    }
}

const frame = () => new Uint8ClampedArray(8);
const settled = async <T>(p: Promise<T>) => {
    let done = false;
    p.then(
        () => (done = true),
        () => (done = true),
    );
    await new Promise((r) => setTimeout(r, 0));
    return done;
};

describe('worker sink', () => {
    it('is ready only when the worker says so, then sends frames and gets the file', async () => {
        const w = new FakeWorker((m, self) => {
            if (m.type === 'init') queueMicrotask(() => self.reply({ type: 'ready' }));
            if (m.type === 'frame') queueMicrotask(() => self.reply({ type: 'ack' }));
            if (m.type === 'finish')
                queueMicrotask(() => self.reply({ type: 'done', bytes: new Uint8Array([7]) }));
        });
        const sink = await workerSink(init, () => w as any);
        expect(w.posted[0]).toEqual({ type: 'init', init });
        await sink.add(frame(), 10);
        expect(w.posted[1]).toMatchObject({ type: 'frame', delay: 10 });
        expect(await sink.finish()).toEqual(new Uint8Array([7]));
        sink.close();
        expect(w.terminated).toBe(true);
    });

    it('waits for the worker after 4 queued frames (memory stays flat)', async () => {
        const w = new FakeWorker((m, self) => {
            if (m.type === 'init') queueMicrotask(() => self.reply({ type: 'ready' }));
        });
        const sink = await workerSink(init, () => w as any);
        for (let i = 0; i < 4; i++) expect(await settled(sink.add(frame(), 10))).toBe(true);
        const fifth = sink.add(frame(), 10);
        expect(await settled(fifth)).toBe(false); // 5 in flight: waits
        w.reply({ type: 'ack' });
        expect(await settled(fifth)).toBe(true);
    });

    it('a failure in the middle rejects the waiting frame, later frames and the file', async () => {
        const w = new FakeWorker((m, self) => {
            if (m.type === 'init') queueMicrotask(() => self.reply({ type: 'ready' }));
        });
        const sink = await workerSink(init, () => w as any);
        for (let i = 0; i < 4; i++) await sink.add(frame(), 10);
        const waiting = sink.add(frame(), 10);
        w.reply({ type: 'error', message: 'out of memory' });
        await expect(waiting).rejects.toThrow('out of memory');
        await expect(sink.add(frame(), 10)).rejects.toThrow('out of memory');
        await expect(sink.finish()).rejects.toThrow('out of memory');
    });

    it('a worker that cannot start rejects before any frame, and is stopped', async () => {
        const w = new FakeWorker((m, self) => {
            if (m.type === 'init') queueMicrotask(() => self.crash('script blocked'));
        });
        await expect(workerSink(init, () => w as any)).rejects.toThrow('script blocked');
        expect(w.terminated).toBe(true);
        expect(w.posted).toHaveLength(1); // only init
    });

    it('then the export encodes on the page instead', async () => {
        const error = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const broken = () =>
            new FakeWorker((m, self) => {
                if (m.type === 'init') queueMicrotask(() => self.crash('script blocked'));
            }) as any;
        const sink = await openSink(init, broken);
        await sink.add(new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]), 10);
        expect(decodeGif(await sink.finish()).frames).toHaveLength(1);
        expect(error).toHaveBeenCalledWith(
            '[gif] worker unavailable, encoding on the page',
            expect.any(Error),
        );

        // end to end: renderGif with a worker that cannot start still makes a GIF
        let t = 0;
        const blob = await renderGif(
            {
                canvas: {} as any,
                from: 0,
                to: 200,
                fps: 10,
                width: 2,
                height: 1,
                background: '#fff',
                renderFrame: (ms) => (t = ms),
                loop: true,
                dither: false,
                transparent: false,
            },
            {
                frameSource: () => () =>
                    new Uint8ClampedArray(
                        t < 100 ? [0, 0, 0, 255, 0, 0, 0, 255] : [255, 255, 255, 255, 0, 0, 0, 255],
                    ),
                createWorker: broken,
            },
        );
        expect(decodeGif(new Uint8Array(await blob.arrayBuffer())).frames).toHaveLength(2);
        error.mockRestore();
    });

    it('no Worker at all (old browsers, tests): on the page', async () => {
        const sink = await openSink(init, null);
        await sink.add(new Uint8ClampedArray(8).fill(255), 10);
        expect(decodeGif(await sink.finish()).width).toBe(2);
    });
});
