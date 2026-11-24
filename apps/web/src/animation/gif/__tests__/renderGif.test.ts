/**
 * GIF export end to end without a browser canvas: a fake scene (a square that moves with the playhead)
 * goes through the two passes and the real encoder (inline: jsdom has no Worker), and the file is read
 * back with the independent decoder.
 */
import { describe, expect, it, vi } from 'vitest';
import { GIF_MAX_MS, renderGif, sampleFrames } from '../renderGif';
import { compose, decodeGif } from './decodeGif';

/* eslint-disable @typescript-eslint/no-explicit-any -- the canvas is never touched by the fake source */
const W = 20;
const H = 10;

function scene() {
    let t = 0;
    const renders: number[] = [];
    const frameSource = vi.fn((o: { background: string | null }) => () => {
        const px = new Uint8ClampedArray(W * H * 4);
        const sx = Math.min(W - 2, Math.floor(t / 100)); // 1 px per 100 ms
        for (let y = 0; y < H; y++)
            for (let x = 0; x < W; x++) {
                const inSquare = x >= sx && x < sx + 2 && y >= 4 && y < 6;
                const bg = o.background === null ? [0, 0, 0, 0] : [255, 255, 255, 255];
                px.set(inSquare ? [0, 0, 255, 255] : bg, (y * W + x) * 4);
            }
        return px;
    });
    const renderFrame = (ms: number) => {
        t = ms;
        renders.push(ms);
    };
    return { frameSource, renderFrame, renders };
}

const base = (s: ReturnType<typeof scene>, extra: Record<string, unknown> = {}) => ({
    canvas: {} as any,
    from: 0,
    to: 1000,
    fps: 10,
    width: W,
    height: H,
    background: '#ffffff',
    renderFrame: s.renderFrame,
    loop: true,
    dither: false,
    transparent: false,
    ...extra,
});

const read = async (blob: Blob) => decodeGif(new Uint8Array(await blob.arrayBuffer()));

describe('renderGif', () => {
    it('renders every frame at its exact time; the file lasts as long as the range', async () => {
        const s = scene();
        const progress: number[] = [];
        const blob = await renderGif(
            { ...base(s), onProgress: (p) => progress.push(p) },
            { frameSource: s.frameSource },
        );
        expect(blob.type).toBe('image/gif');
        const gif = await read(blob);
        expect(gif).toMatchObject({ width: W, height: H, loop: true });
        // 0 … 1000 ms at 10 fps = 11 frames of 10 cs, every one different (the square moves 1 px)
        expect(gif.frames).toHaveLength(11);
        expect(gif.frames.reduce((a, f) => a + f.delay, 0)).toBe(110);
        // pass 2 rendered 0, 100, …, 1000 ms after the palette pass
        expect(s.renders.slice(-11)).toEqual([
            0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
        ]);
        // the last frame shows the square at x = 10
        const last = compose(gif).at(-1)!;
        const blue = (x: number) => [
            ...gif.palette.slice(last[5 * W + x] * 3, last[5 * W + x] * 3 + 3),
        ];
        expect(blue(10)).toEqual([0, 0, 255]);
        expect(blue(9)).toEqual([255, 255, 255]);
        // progress only goes up, and ends at 100 %
        expect(progress).toEqual([...progress].sort((a, b) => a - b));
        expect(progress.at(-1)).toBe(1);
    });

    it('keeps transparency when asked (no background, full frames cleared in between)', async () => {
        const s = scene();
        const gif = await read(
            await renderGif(base(s, { transparent: true, loop: false }), {
                frameSource: s.frameSource,
            }),
        );
        expect(s.frameSource.mock.calls[0][0].background).toBeNull();
        expect(gif.loop).toBe(false);
        expect(gif.frames.every((f) => f.disposal === 2 && f.w === W)).toBe(true);
        expect(compose(gif)[0][0]).toBe(-1);
    });

    it('stops when cancelled and frees the encoder', async () => {
        const s = scene();
        const ctl = new AbortController();
        const close = vi.fn();
        const add = vi.fn(async () => {
            if (add.mock.calls.length === 3) ctl.abort();
        });
        const run = renderGif(base(s, { signal: ctl.signal }), {
            frameSource: s.frameSource,
            createSink: () => ({ add, finish: async () => new Uint8Array(), close }),
        });
        await expect(run).rejects.toMatchObject({ name: 'AbortError' });
        expect(add).toHaveBeenCalledTimes(3);
        expect(close).toHaveBeenCalled();
    });

    it(`refuses more than ${GIF_MAX_MS / 1000} s (a GIF that long is huge)`, async () => {
        const s = scene();
        await expect(
            renderGif(base(s, { to: GIF_MAX_MS + 1 }), { frameSource: s.frameSource }),
        ).rejects.toThrow(/at most 30 s/);
        expect(s.renders).toEqual([]);
    });

    it('the palette looks at frames spread over the whole range', () => {
        expect(sampleFrames(5, 32)).toEqual([0, 1, 2, 3, 4]);
        const many = sampleFrames(301, 32);
        expect(many).toHaveLength(32);
        expect(many[0]).toBe(0);
        expect(many.at(-1)).toBe(300);
    });
});
