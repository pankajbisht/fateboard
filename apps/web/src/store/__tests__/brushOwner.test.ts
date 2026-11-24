/**
 * BUG-021: the brush slice is the only writer of `canvas.freeDrawingBrush`. Picking the draw tool used
 * to overwrite the built brush with a plain colour + width, so translucent / glowing brushes lost their look.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';

/* eslint-disable @typescript-eslint/no-explicit-any */
let canvas: any;
let prev: any;
const state = () => useStore.getState() as any;

beforeEach(() => {
    prev = { ...useStore.getState() };
    canvas = createFakeCanvas();
    canvas.setCursor = () => undefined;
    canvas.contextTop = document.createElement('canvas').getContext('2d');
    useStore.setState({ canvas } as any);
});
afterEach(() => {
    state().setActiveTool('select');
    useStore.setState({ canvas: prev.canvas } as any);
});

describe('one brush writer (BUG-021)', () => {
    it('the draw tool keeps the brush the brush slice built (translucent marker stays translucent)', () => {
        state().setBrush({ brush: 'marker', color: '#ff0000', brushOpacity: 0.5 });
        const built = canvas.freeDrawingBrush;
        const builtColor = built.color;
        expect(String(builtColor)).toMatch(/rgba\(255,\s*0,\s*0,\s*0\.5\)/);

        state().setActiveTool('draw');
        expect(canvas.isDrawingMode).toBe(true);
        expect(String(canvas.freeDrawingBrush.color)).toBe(String(builtColor));
    });
});
