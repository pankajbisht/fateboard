/**
 * The export runner moved out of the Animation slice (2026-11-17). fate-reviewer: the moved branches had no
 * tests. These pin the behaviour the slice had: MP4 falls back to realtime only when WebCodecs is missing,
 * other errors reach the user, PNG shows the playhead's frame, and a cancel leaves no error and puts the
 * playhead back.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- mocked modules and a fake canvas */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const calls: string[] = [];
const ev = vi.hoisted(() => ({
    renderMp4Fast: vi.fn(),
    renderRealtime: vi.fn(),
    renderStill: vi.fn(),
    downloadBlob: vi.fn(),
}));
vi.mock('@/animation/exportVideo', async (orig) => ({ ...((await orig()) as any), ...ev }));

import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { WEBCODECS_UNSUPPORTED } from '../exportVideo';
import { runExport } from '../exportRun';

const blob = new Blob(['x']);
const settings = (extra: Record<string, unknown> = {}) =>
    ({
        mode: 'mp4-fast',
        container: 'webm',
        range: 'full',
        width: 1280,
        height: 720,
        bitrate: 1,
        background: '#fff',
        fileName: 'clip',
        ...extra,
    }) as any;
const run = (s = settings()) =>
    runExport({
        canvas: createFakeCanvas() as any,
        tracks: {},
        settings: s,
        from: 0,
        to: 1000,
        fps: 30,
        still: 400,
        signal: new AbortController().signal,
        onProgress: () => {},
    });

beforeEach(() => {
    calls.length = 0;
    Object.values(ev).forEach((f) => f.mockReset());
    ev.downloadBlob.mockImplementation((_b: Blob, name: string) => calls.push(name));
    ev.renderRealtime.mockResolvedValue({ blob, ext: 'webm' });
    ev.renderStill.mockResolvedValue(blob);
});

describe('runExport', () => {
    it('MP4 fast: downloads name.mp4', async () => {
        ev.renderMp4Fast.mockResolvedValue(blob);
        expect(await run()).toBe('clip.mp4');
        expect(calls).toEqual(['clip.mp4']);
        expect(ev.renderRealtime).not.toHaveBeenCalled();
    });

    it('no WebCodecs: falls back to realtime in the chosen container', async () => {
        ev.renderMp4Fast.mockRejectedValue(new Error(WEBCODECS_UNSUPPORTED));
        expect(await run()).toBe('clip.webm');
        expect(ev.renderRealtime).toHaveBeenCalledWith(expect.objectContaining({ format: 'webm' }));
    });

    it('any other MP4 error reaches the user (no silent realtime fallback)', async () => {
        ev.renderMp4Fast.mockRejectedValue(new Error('encoder crashed'));
        await expect(run()).rejects.toThrow('encoder crashed');
        expect(ev.renderRealtime).not.toHaveBeenCalled();
        expect(calls).toEqual([]);
    });

    it('PNG: the frame at the playhead, as name.png', async () => {
        expect(await run(settings({ mode: 'png' }))).toBe('clip.png');
        expect(ev.renderStill).toHaveBeenCalledWith(
            expect.objectContaining({ width: 1280, height: 720 }),
        );
    });
});

describe('cancel from the store', () => {
    let prev: any;
    beforeEach(() => {
        prev = useStore.getState().canvas;
        useStore.setState({
            canvas: createFakeCanvas(),
            exportState: { status: 'idle', progress: 0 },
        } as any);
        useStore.getState().seek(1200);
    });
    afterEach(() => useStore.setState({ canvas: prev } as any));

    it('Cancel ends with no error, and the playhead is back where it was', async () => {
        ev.renderMp4Fast.mockImplementation(
            ({ signal, renderFrame }: any) =>
                new Promise((_, reject) => {
                    renderFrame(3000); // the export moves the scene
                    signal.addEventListener('abort', () =>
                        reject(new DOMException('Export cancelled', 'AbortError')),
                    );
                }),
        );
        const exporting = useStore.getState().exportVideo(settings());
        await vi.waitFor(() => expect(ev.renderMp4Fast).toHaveBeenCalled());
        expect(useStore.getState().exportState.status).toBe('rendering');
        useStore.getState().cancelExport();
        await exporting;
        expect(useStore.getState().exportState).toEqual({ status: 'idle', progress: 0 });
        expect(useStore.getState().currentTime).toBe(1200);
        expect(calls).toEqual([]);
    });
});
