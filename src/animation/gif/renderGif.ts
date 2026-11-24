import type { Canvas } from 'fabric';
import { abortError, makeCompositor, yieldToUi, type BaseOptions } from '../exportVideo';
import { GifEncoder, gifDelays, type GifInit } from './gifEncoder';
import type { GifWorkerReply, GifWorkerRequest } from './gif.worker';
import { GIF_MAX_MS } from './gifSettings';
import { ColorHistogram, buildPalette } from './palette';

/**
 * Animated GIF export: frame-exact like the MP4 fast path (frame i at exactly i / fps, never tied to the
 * clock), in two passes so memory stays flat:
 *  1. a palette from up to 32 frames spread over the range (sampled pixels);
 *  2. every frame rendered again and handed to the encoder worker (inline when there is no worker).
 * Loaded on demand (`exportRun`), with its worker in its own chunk.
 */
export { GIF_MAX_MS } from './gifSettings';
const PALETTE_FRAMES = 32;
/** Pixels sampled per frame for the palette, at most. */
const PALETTE_SAMPLES = 100_000;
/** Frames queued in the worker at most (back-pressure). */
const MAX_IN_FLIGHT = 4;

export interface GifOptions extends Omit<BaseOptions, 'bitrate' | 'background'> {
    /** colour behind the page; ignored when `transparent` */
    background: string;
    loop: boolean;
    dither: boolean;
    transparent: boolean;
}

export interface GifSink {
    add(rgba: Uint8ClampedArray, delay: number): Promise<void>;
    finish(): Promise<Uint8Array>;
    close(): void;
}

export interface GifDeps {
    /** Pixels of the scene as it is now (default: the export compositor, read back). */
    frameSource?: (o: {
        canvas: Canvas;
        width: number;
        height: number;
        background: string | null;
    }) => () => Uint8ClampedArray;
    createSink?: (init: GifInit) => GifSink | Promise<GifSink>;
    /** How the encoder worker is started (default: the bundled `gif.worker.ts`). */
    createWorker?: () => Worker;
}

function compositorSource(o: {
    canvas: Canvas;
    width: number;
    height: number;
    background: string | null;
}) {
    const { ctx, draw } = makeCompositor(o.canvas, o.width, o.height, o.background, true);
    return () => {
        draw();
        return ctx.getImageData(0, 0, o.width, o.height).data;
    };
}

export function inlineSink(init: GifInit): GifSink {
    const encoder = new GifEncoder(init);
    return {
        add: async (rgba, delay) => encoder.addFrame(rgba, delay),
        finish: async () => encoder.finish(),
        close: () => {},
    };
}

const newWorker = () => new Worker(new URL('./gif.worker.ts', import.meta.url), { type: 'module' });

/**
 * The encoder in a Web Worker. Resolves once the worker says it is ready, so a worker that cannot start
 * (its script blocked, a load error) rejects here, before any frame is handed over, and the caller can
 * encode on the page instead. Up to `MAX_IN_FLIGHT` frames are queued; `add` waits for the worker after that.
 */
export function workerSink(init: GifInit, create: () => Worker = newWorker): Promise<GifSink> {
    return new Promise<GifSink>((resolveReady, rejectReady) => {
        const worker = create();
        const send = (m: GifWorkerRequest, transfer: Transferable[] = []) =>
            worker.postMessage(m, transfer);
        let ready = false;
        let failure: Error | null = null;
        let inFlight = 0;
        let wake: (() => void) | null = null;
        let finished: { resolve: (b: Uint8Array) => void; reject: (e: Error) => void } | null =
            null;
        const fail = (err: Error) => {
            if (!ready) {
                worker.terminate();
                rejectReady(err);
                return;
            }
            failure = err;
            const w = wake;
            wake = null;
            w?.();
            finished?.reject(err);
        };
        const sink: GifSink = {
            async add(rgba, delay) {
                if (failure) throw failure;
                inFlight++;
                send({ type: 'frame', rgba, delay }, [rgba.buffer]);
                while (inFlight > MAX_IN_FLIGHT && !failure)
                    await new Promise<void>((resolve) => (wake = resolve));
                if (failure) throw failure;
            },
            finish: () =>
                new Promise<Uint8Array>((resolve, reject) => {
                    if (failure) return reject(failure);
                    finished = { resolve, reject };
                    send({ type: 'finish' });
                }),
            close: () => worker.terminate(),
        };
        worker.onmessage = (e: MessageEvent<GifWorkerReply>) => {
            const m = e.data;
            if (m.type === 'ready') {
                ready = true;
                resolveReady(sink);
            } else if (m.type === 'ack') {
                inFlight--;
                const w = wake;
                wake = null;
                w?.();
            } else if (m.type === 'done') finished?.resolve(m.bytes);
            else fail(new Error(m.message));
        };
        worker.onerror = (e) => {
            e.preventDefault();
            fail(new Error(e.message || 'The GIF encoder stopped.'));
        };
        send({ type: 'init', init });
    });
}

/** The worker when the browser can start one, else the same encoder on the page. */
export async function openSink(
    init: GifInit,
    createWorker: (() => Worker) | null = typeof Worker === 'undefined' ? null : newWorker,
): Promise<GifSink> {
    if (!createWorker) return inlineSink(init);
    try {
        return await workerSink(init, createWorker);
    } catch (err) {
        // handled: the export still works, only slower (warning, not an error)
        console.warn('[gif] worker unavailable, encoding on the page', err);
        return inlineSink(init);
    }
}

/** Up to `max` frame numbers spread evenly over `total` (first and last included). */
export function sampleFrames(total: number, max: number): number[] {
    if (total <= max) return Array.from({ length: total }, (_, i) => i);
    return Array.from({ length: max }, (_, i) => Math.round((i * (total - 1)) / (max - 1)));
}

export async function renderGif(opts: GifOptions, deps: GifDeps = {}): Promise<Blob> {
    const { canvas, from, to, fps, renderFrame, signal, onProgress } = opts;
    if (to - from > GIF_MAX_MS)
        throw new Error(
            `A GIF can be at most ${GIF_MAX_MS / 1000} s long. Set a work area to export a part.`,
        );
    const width = Math.max(1, Math.round(opts.width));
    const height = Math.max(1, Math.round(opts.height));
    const grab = (deps.frameSource ?? compositorSource)({
        canvas,
        width,
        height,
        background: opts.transparent ? null : opts.background,
    });
    const total = Math.max(1, Math.floor(((to - from) / 1000) * fps) + 1);
    const timeOf = (i: number) => Math.min(to, from + (i * 1000) / fps);
    const check = () => {
        if (signal?.aborted) throw abortError();
    };

    // 1. palette
    const histogram = new ColorHistogram();
    const step = Math.max(1, Math.floor(Math.sqrt((width * height) / PALETTE_SAMPLES)));
    const sampled = sampleFrames(total, PALETTE_FRAMES);
    for (let n = 0; n < sampled.length; n++) {
        check();
        renderFrame(timeOf(sampled[n]));
        histogram.add(grab(), width, height, step);
        onProgress?.((0.2 * (n + 1)) / sampled.length);
        if (n % 4 === 3) await yieldToUi();
    }

    // 2. frames
    const init: GifInit = {
        width,
        height,
        palette: buildPalette(histogram).colors,
        loop: opts.loop,
        dither: opts.dither,
        transparent: opts.transparent,
    };
    const sink = await (deps.createSink
        ? deps.createSink(init)
        : openSink(init, deps.createWorker));
    try {
        const delays = gifDelays(total, fps);
        for (let i = 0; i < total; i++) {
            check();
            renderFrame(timeOf(i));
            await sink.add(grab(), delays[i]);
            onProgress?.(0.2 + (0.78 * (i + 1)) / total);
            if (i % 2 === 1) await yieldToUi();
        }
        check();
        const bytes = await sink.finish();
        onProgress?.(1);
        return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'image/gif' });
    } finally {
        sink.close();
    }
}
