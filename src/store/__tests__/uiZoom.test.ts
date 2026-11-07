import { describe, expect, it } from 'vitest';
import { createUISlice } from '@/store/slices/createUiSlice';
import { createPageSlice } from '@/store/slices/createPageSlice';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { createHarness } from '@/test/sliceHarness';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('toolbar zoom on the design board', () => {
    const setup = () => {
        const canvas = createFakeCanvas() as any;
        let vptWrites = 0;
        canvas.setViewportTransform = () => (vptWrites += 1);
        canvas.setZoom = () => (vptWrites += 1);
        const h = createHarness([createPageSlice as any, createUISlice as any], { canvas });
        h.get().setBoardMode('design');
        h.set({ scale: 0.5 }); // fit scale published by CanvasBoard
        return { h, writes: () => vptWrites };
    };

    it('Actual Size = 100% on screen (zoom = 1 / fit scale), no viewport writes', () => {
        const { h, writes } = setup();
        h.get().actualSize();
        expect(h.get().zoom).toBe(2);
        expect(writes()).toBe(0);
    });

    it('Fit to Screen resets the zoom to fit, no viewport writes', () => {
        const { h, writes } = setup();
        h.get().setZoom(3);
        h.get().zoomFit();
        expect(h.get().zoom).toBe(1);
        expect(writes()).toBe(0);
    });
});
