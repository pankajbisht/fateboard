/**
 * BUG-026: video / PNG export renders what the board shows. It used to reset the viewport to identity
 * (whiteboard: exported the scene's top-left corner, not the view you were looking at).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const seen: number[][] = [];
vi.mock('@/animation/exportVideo', async (orig) => {
    const real: any = await orig();
    return {
        ...real,
        renderStill: vi.fn(async (o: any) => {
            seen.push([...o.canvas.viewportTransform]);
            return new Blob(['png']);
        }),
        downloadBlob: vi.fn(),
    };
});

import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';

let prev: any;
let canvas: any;
beforeEach(() => {
    prev = { ...useStore.getState() };
    seen.length = 0;
    canvas = createFakeCanvas();
    canvas.setViewportTransform([2, 0, 0, 2, 30, 40]); // whiteboard: zoomed + panned
    useStore.setState({ canvas } as any);
});
afterEach(() => useStore.setState({ canvas: prev.canvas } as any));

describe('export frame (BUG-026)', () => {
    it('renders with the current view and leaves it unchanged', async () => {
        await (useStore.getState() as any).exportVideo({
            mode: 'png',
            container: 'webm',
            range: 'full',
            width: 0,
            height: 0,
            bitrate: 1,
            background: '#ffffff',
        });
        expect(seen).toEqual([[2, 0, 0, 2, 30, 40]]);
        expect(canvas.viewportTransform).toEqual([2, 0, 0, 2, 30, 40]);
    });
});
