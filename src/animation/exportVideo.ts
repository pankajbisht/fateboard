import type { Canvas } from 'fabric';

export type ExportMode = 'mp4-fast' | 'realtime' | 'png';
export type ContainerFormat = 'mp4' | 'webm';

export const WEBCODECS_UNSUPPORTED = 'WEBCODECS_UNSUPPORTED';

export interface BaseOptions {
    canvas: Canvas;
    /** ms range to render */
    from: number;
    to: number;
    fps: number;
    width: number;
    height: number;
    /** bits per second */
    bitrate: number;
    background: string;
    /** Put the scene at time `t` (ms) on the canvas. */
    renderFrame: (t: number) => void;
    signal?: AbortSignal;
    onProgress?: (p: number) => void;
}

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
const abortError = () => new DOMException('Export cancelled', 'AbortError');
const yieldToUi = () => new Promise<void>((r) => setTimeout(r, 0));

/* ───────────────────────── capability detection ───────────────────────── */

export const supportsWebCodecs = () =>
    typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';

const REALTIME_MIME: Record<ContainerFormat, string[]> = {
    mp4: ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4'],
    webm: ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'],
};
const mrSupports = (m: string) =>
    typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m);

export const getRealtimeFormats = (): ContainerFormat[] =>
    (['mp4', 'webm'] as ContainerFormat[]).filter((f) => REALTIME_MIME[f].some(mrSupports));

/* ───────────────────────── frame compositor ───────────────────────── */

/** Letterboxes the (re-rendered, crisp) Fabric canvas onto a fixed-size output canvas. */
function makeCompositor(canvas: Canvas, width: number, height: number, background: string) {
    const out = document.createElement('canvas');
    out.width = width;
    out.height = height;
    const ctx = out.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not create a 2D context for export.');
    const scale = Math.min(width / canvas.getWidth(), height / canvas.getHeight());

    const draw = () => {
        // toCanvasElement re-renders the scene at `scale`, so 1080p output is sharp, not an upscaled screenshot.
        const frame = canvas.toCanvasElement(scale);
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(frame, (width - frame.width) / 2, (height - frame.height) / 2);
    };
    return { out, draw };
}

/* ───────────────────────── 1. MP4, offline (WebCodecs) ───────────────────────── */

/**
 * Frame-exact export: renders frame i at exactly i/fps, encodes with H.264 via WebCodecs and muxes to MP4.
 * Not tied to wall-clock time, so it is usually faster than realtime, never drops frames, and the file
 * has correct duration metadata. Requires `npm i mp4-muxer`.
 */
export async function renderMp4Fast(opts: BaseOptions): Promise<Blob> {
    if (!supportsWebCodecs()) throw new Error(WEBCODECS_UNSUPPORTED);
    const { canvas, from, to, fps, bitrate, background, renderFrame, signal, onProgress } = opts;
    const width = even(opts.width);
    const height = even(opts.height);

    let muxerLib: typeof import('mp4-muxer');
    try {
        muxerLib = await import('mp4-muxer');
    } catch {
        throw new Error(WEBCODECS_UNSUPPORTED);
    }

    let codec: string | null = null;
    for (const c of ['avc1.640033', 'avc1.4d0033', 'avc1.42003e', 'avc1.42001f']) {
        const res = await VideoEncoder.isConfigSupported({
            codec: c,
            width,
            height,
            bitrate,
            framerate: fps,
        });
        if (res.supported) {
            codec = c;
            break;
        }
    }
    if (!codec) throw new Error(WEBCODECS_UNSUPPORTED);

    const target = new muxerLib.ArrayBufferTarget();
    const muxer = new muxerLib.Muxer({
        target,
        video: { codec: 'avc', width, height, frameRate: fps },
        fastStart: 'in-memory',
    });

    let encoderError: Error | null = null;
    const encoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => (encoderError = e instanceof Error ? e : new Error(String(e))),
    });
    encoder.configure({ codec, width, height, bitrate, framerate: fps });

    const { out, draw } = makeCompositor(canvas, width, height, background);
    const span = Math.max(1, to - from);
    const total = Math.max(1, Math.floor((span / 1000) * fps) + 1);
    const frameUs = 1_000_000 / fps;

    try {
        for (let i = 0; i < total; i++) {
            if (signal?.aborted) throw abortError();
            if (encoderError) throw encoderError;

            renderFrame(Math.min(to, from + (i * 1000) / fps));
            draw();

            const frame = new VideoFrame(out, {
                timestamp: Math.round(i * frameUs),
                duration: Math.round(frameUs),
            });
            encoder.encode(frame, { keyFrame: i % Math.max(1, Math.round(fps * 2)) === 0 });
            frame.close();

            while (encoder.encodeQueueSize > 6) await yieldToUi(); // back-pressure
            if (i % 3 === 0) {
                onProgress?.(i / total);
                await yieldToUi();
            }
        }
        await encoder.flush();
        if (encoderError) throw encoderError;
        muxer.finalize();
        onProgress?.(1);
        return new Blob([target.buffer], { type: 'video/mp4' });
    } finally {
        if (encoder.state !== 'closed') encoder.close();
    }
}

/* ───────────────────────── 2. Realtime (MediaRecorder) ───────────────────────── */

/** Compatibility path: plays the timeline live and records it. Takes as long as the clip. */
export async function renderRealtime(
    opts: BaseOptions & { format: ContainerFormat },
): Promise<{ blob: Blob; ext: ContainerFormat }> {
    const { canvas, from, to, fps, bitrate, background, renderFrame, signal, onProgress } = opts;

    const order: ContainerFormat[] = opts.format === 'mp4' ? ['mp4', 'webm'] : ['webm', 'mp4'];
    let picked: { mime: string; ext: ContainerFormat } | null = null;
    for (const ext of order) {
        const mime = REALTIME_MIME[ext].find(mrSupports);
        if (mime) {
            picked = { mime, ext };
            break;
        }
    }
    if (!picked)
        throw new Error('This browser cannot record video (MediaRecorder is unavailable).');

    const width = even(opts.width);
    const height = even(opts.height);
    const { out, draw } = makeCompositor(canvas, width, height, background);

    let stream = out.captureStream(0);
    let track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };
    if (typeof track.requestFrame !== 'function') {
        stream = out.captureStream(fps);
        track = stream.getVideoTracks()[0];
    }

    const recorder = new MediaRecorder(stream, {
        mimeType: picked.mime,
        videoBitsPerSecond: bitrate,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const finished = new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: picked!.mime.split(';')[0] }));
        recorder.onerror = () => reject(new Error('Recording failed.'));
    });

    const span = Math.max(1, to - from);
    const frame = (t: number) => {
        renderFrame(from + t);
        draw();
        track.requestFrame?.();
    };

    frame(0);
    recorder.start(500);
    const t0 = performance.now();

    try {
        await new Promise<void>((resolve, reject) => {
            const step = (now: number) => {
                if (signal?.aborted) return reject(abortError());
                const t = Math.min(now - t0, span);
                frame(t);
                onProgress?.(t / span);
                if (t >= span) return resolve();
                requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        });
        await new Promise((r) => setTimeout(r, Math.max(120, 2000 / fps)));
    } catch (err) {
        if (recorder.state !== 'inactive') recorder.stop();
        stream.getTracks().forEach((t) => t.stop());
        throw err;
    }

    if (recorder.state !== 'inactive') recorder.stop();
    const blob = await finished;
    stream.getTracks().forEach((t) => t.stop());
    return { blob, ext: picked.ext };
}

/* ───────────────────────── 3. PNG still ───────────────────────── */

export async function renderStill(
    opts: Pick<BaseOptions, 'canvas' | 'width' | 'height' | 'background'>,
): Promise<Blob> {
    const { canvas, background } = opts;
    const width = Math.round(opts.width);
    const height = Math.round(opts.height);
    const { out, draw } = makeCompositor(canvas, width, height, background);
    draw();
    return new Promise<Blob>((resolve, reject) =>
        out.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Could not encode PNG.'))),
            'image/png',
        ),
    );
}

export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
