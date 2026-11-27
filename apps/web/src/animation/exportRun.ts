import type { Canvas } from 'fabric';
import { applyTimelineAt } from './clips';
import type { Tracks } from './engine';
import { GIF_DEFAULTS, type GifSettings } from './gif/gifSettings';
import {
    WEBCODECS_UNSUPPORTED,
    downloadBlob,
    renderMp4Fast,
    renderRealtime,
    renderStill,
    type ContainerFormat,
    type ExportMode,
} from './exportVideo';

/**
 * One export from the timeline: render, then download. Moved out of the Animation slice (its file was at
 * its size ceiling) when GIF was added; the slice keeps the state (progress, cancel, the playhead) and loads
 * this module on the first export.
 */
export type { GifSettings } from './gif/gifSettings';

export interface ExportSettings {
    mode: ExportMode;
    container: ContainerFormat; // used by 'realtime'
    range: 'full' | 'work';
    /** 0 = the board's size */
    width: number;
    /** 0 = from `width` and the board's proportions (or the board's height when `width` is 0 too) */
    height: number;
    fps?: number;
    bitrate: number;
    background: string;
    fileName?: string;
    gif?: GifSettings;
}

/** Output size: a 0 height keeps the board's proportions. */
export function exportSize(canvas: Canvas, width: number, height: number) {
    const cw = canvas.getWidth();
    const ch = canvas.getHeight();
    if (!width) return { width: cw, height: height || ch };
    return { width, height: height || Math.max(1, Math.round((width * ch) / cw)) };
}

/** Renders and downloads; resolves to the file name. Rejects with an `AbortError` when cancelled. */
export async function runExport(o: {
    canvas: Canvas;
    tracks: Tracks;
    settings: ExportSettings;
    from: number;
    to: number;
    fps: number;
    /** the playhead: the frame a PNG shows */
    still: number;
    signal: AbortSignal;
    onProgress: (p: number) => void;
}): Promise<string> {
    const { canvas, tracks, settings, signal } = o;
    const name = settings.fileName || 'animation';
    const base = {
        canvas,
        from: o.from,
        to: o.to,
        fps: o.fps,
        ...exportSize(canvas, settings.width, settings.height),
        bitrate: settings.bitrate,
        background: settings.background,
        onProgress: o.onProgress,
        renderFrame: (t: number) => applyTimelineAt(canvas, tracks, t, false),
    };

    if (settings.mode === 'png') {
        base.renderFrame(o.still);
        downloadBlob(await renderStill(base), `${name}.png`);
        return `${name}.png`;
    }
    if (settings.mode === 'gif') {
        const { renderGif } = await import('./gif/renderGif');
        const blob = await renderGif({ ...base, ...GIF_DEFAULTS, ...settings.gif, signal });
        downloadBlob(blob, `${name}.gif`);
        return `${name}.gif`;
    }
    if (settings.mode === 'mp4-fast') {
        try {
            downloadBlob(await renderMp4Fast({ ...base, signal }), `${name}.mp4`);
            return `${name}.mp4`;
        } catch (err) {
            if (!(err instanceof Error && err.message === WEBCODECS_UNSUPPORTED)) throw err;
            // no WebCodecs: fall through to realtime
        }
    }
    const { blob, ext } = await renderRealtime({ ...base, signal, format: settings.container });
    downloadBlob(blob, `${name}.${ext}`);
    return `${name}.${ext}`;
}
