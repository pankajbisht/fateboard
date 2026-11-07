import { describe, it, expect } from 'vitest';
import { createBrushSlice } from '@/store/slices/createBrushSlice';
import { createHarness } from '@/test/sliceHarness';
import { createFakeCanvas } from '@/test/fakeCanvas';

/* eslint-disable @typescript-eslint/no-explicit-any */

// The old version of this file stubbed a canvas without `on()`; the slice now installs canvas hooks
// (before:path:created etc.), so it uses the shared fake canvas.
function setup() {
    const canvas: any = createFakeCanvas();
    const h = createHarness([createBrushSlice as never], { canvas });
    return { canvas, h };
}

describe('createBrushSlice', () => {
    it('setBrush stores the options and installs a brush on the canvas', () => {
        const { canvas, h } = setup();
        h.get().setBrush({ brush: 'pencil', color: '#aabbcc', width: 10, cursor: 'url()' });
        expect(h.get().color).toBe('#aabbcc');
        expect(h.get().width).toBe(10);
        expect(canvas.freeDrawingBrush).toBeTruthy();
        expect(canvas.freeDrawingBrush.width).toBe(10);
        expect(canvas.freeDrawingCursor).toBe('url()');
    });

    it('switching brush type applies that preset’s defaults', () => {
        const { h } = setup();
        h.get().setBrush({ brush: 'highlighter' });
        expect(h.get().brush).toBe('highlighter');
        expect(h.get().opacity).toBeLessThan(1);
    });

    it('setBrushWidth updates state and the canvas brush', () => {
        const { canvas, h } = setup();
        h.get().setBrushWidth({ width: 7 });
        expect(h.get().width).toBe(7);
        expect(canvas.freeDrawingBrush.width).toBe(7);
        expect(canvas.renderCount()).toBeGreaterThan(0);
    });

    it('setBrushColor accepts a string or an object', () => {
        const { h } = setup();
        h.get().setBrushColor('#112233');
        expect(h.get().color).toBe('#112233');
        h.get().setBrushColor({ color: '#445566' });
        expect(h.get().color).toBe('#445566');
    });

    it('commitRecentColor keeps 8 unique colours, newest first', () => {
        const { h } = setup();
        for (let i = 0; i < 10; i++) h.get().commitRecentColor(`#00000${i}`);
        h.get().commitRecentColor('#000003');
        const recent = h.get().recentColors;
        expect(recent).toHaveLength(8);
        expect(recent[0]).toBe('#000003');
        expect(new Set(recent).size).toBe(8);
    });

    it('does nothing to the canvas before one exists', () => {
        const h = createHarness([createBrushSlice as never], { canvas: null });
        expect(() => h.get().setBrushWidth(5)).not.toThrow();
        expect(h.get().width).toBe(5);
    });
});
