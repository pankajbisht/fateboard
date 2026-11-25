/**
 * GIF export through the store (2026-11-17): the slice hands the settings to `exportRun`, which loads the
 * GIF renderer on demand, keeps the board's proportions for a width-only size, and downloads `name.gif`.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- mocked modules and a fake canvas */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const gifCalls: any[] = [];
const downloads: string[] = [];
vi.mock('@/animation/gif/renderGif', () => ({
    renderGif: vi.fn(async (o: any) => {
        gifCalls.push(o);
        o.onProgress?.(0.5);
        return new Blob(['GIF89a'], { type: 'image/gif' });
    }),
}));
vi.mock('@/animation/exportVideo', async (orig) => ({
    ...((await orig()) as any),
    downloadBlob: vi.fn((_b: Blob, name: string) => downloads.push(name)),
}));

import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { exportSize } from '../exportRun';

let prev: any;
beforeEach(() => {
    prev = useStore.getState().canvas;
    gifCalls.length = 0;
    downloads.length = 0;
    const canvas = createFakeCanvas();
    canvas.getWidth = () => 1920;
    canvas.getHeight = () => 1080;
    useStore.setState({ canvas, exportState: { status: 'idle', progress: 0 } } as any);
});
afterEach(() => useStore.setState({ canvas: prev } as any));

describe('GIF export from the timeline', () => {
    it('renders a GIF at the chosen width and the board proportions, and downloads it', async () => {
        await useStore.getState().exportVideo({
            mode: 'gif',
            container: 'webm',
            range: 'full',
            width: 480,
            height: 0,
            fps: 15,
            bitrate: 0,
            background: '#ffffff',
            fileName: 'logo',
            gif: { loop: false, dither: true, transparent: false },
        });
        expect(gifCalls).toHaveLength(1);
        expect(gifCalls[0]).toMatchObject({
            width: 480,
            height: 270,
            fps: 15,
            from: 0,
            to: useStore.getState().animDuration,
            loop: false,
            dither: true,
            transparent: false,
        });
        expect(gifCalls[0].signal).toBeInstanceOf(AbortSignal);
        expect(downloads).toEqual(['logo.gif']);
        expect(useStore.getState().exportState).toMatchObject({
            status: 'done',
            message: 'Saved logo.gif',
        });
    });

    it('an error is shown, not thrown', async () => {
        const { renderGif } = await import('@/animation/gif/renderGif');
        vi.mocked(renderGif).mockRejectedValueOnce(new Error('A GIF can be at most 30 s long.'));
        await useStore.getState().exportVideo({
            mode: 'gif',
            container: 'webm',
            range: 'full',
            width: 320,
            height: 0,
            bitrate: 0,
            background: '#ffffff',
        });
        expect(useStore.getState().exportState).toMatchObject({
            status: 'error',
            message: 'A GIF can be at most 30 s long.',
        });
        expect(downloads).toEqual([]);
    });

    it('sizes: 0 = the board; a width alone keeps its proportions', () => {
        const c: any = { getWidth: () => 800, getHeight: () => 600 };
        expect(exportSize(c, 0, 0)).toEqual({ width: 800, height: 600 });
        expect(exportSize(c, 400, 0)).toEqual({ width: 400, height: 300 });
        expect(exportSize(c, 1280, 720)).toEqual({ width: 1280, height: 720 });
    });
});
