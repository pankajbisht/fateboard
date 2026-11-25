/**
 * Calligraphy pen (brush `nib`, Inkscape Calligraphy tool): the Draw tool paints with a flat nib whose options
 * (thinning, angle, fixation, caps) live in `nibStyle`; changing them rebuilds the open brush.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fabric from 'fabric';
import { useStore } from '@store';
import { NibBrush } from '../brushes/nibBrush';
import { DEFAULT_NIB_STYLE } from '../nibStyle';

/* eslint-disable @typescript-eslint/no-explicit-any -- the store and Fabric brush internals are untyped here */
const state = () => useStore.getState() as any;
let canvas: fabric.Canvas;
let prev: any;

beforeEach(() => {
    prev = { ...useStore.getState() };
    canvas = new fabric.Canvas(document.createElement('canvas'), { width: 800, height: 600 });
    useStore.setState({ canvas, boardMode: 'whiteboard', activeTool: 'select' } as any);
});

afterEach(() => {
    state().setActiveTool('select');
    state().setNibStyle(DEFAULT_NIB_STYLE);
    state().setBrush({ brush: prev.brush });
    useStore.setState({ canvas: prev.canvas } as any);
    canvas.dispose();
});

describe('Calligraphy pen brush', () => {
    it('is a brush preset and the Draw tool paints with a NibBrush', () => {
        state().setBrush({ brush: 'nib' });
        state().setActiveTool('draw');
        expect(state().brush).toBe('nib');
        expect(canvas.freeDrawingBrush).toBeInstanceOf(NibBrush);
        expect((canvas.freeDrawingBrush as any).nib).toEqual(DEFAULT_NIB_STYLE);
    });

    it('setNibStyle clamps the values and rebuilds the open brush', () => {
        state().setBrush({ brush: 'nib' });
        state().setActiveTool('draw');
        state().setNibStyle({ angle: 200, fixation: -1, thinning: 0.4, caps: 'x' });
        expect(state().nibStyle).toMatchObject({ angle: 90, fixation: 0, thinning: 0.4, caps: 0 });
        expect((canvas.freeDrawingBrush as any).nib.angle).toBe(90);
    });

    it('a stroke becomes one filled path in the brush color', () => {
        state().setBrush({ brush: 'nib', color: '#112233', width: 20 });
        state().setActiveTool('draw');
        const brush = canvas.freeDrawingBrush as any;
        const ctx = new Proxy({}, { get: () => () => undefined }); // a 2D context that ignores calls
        Object.defineProperty(canvas, 'contextTop', { value: ctx, configurable: true });
        (canvas as any).clearContext = () => undefined;
        brush.onMouseDown({ x: 100, y: 100 }, { e: { button: 0 } });
        brush.onMouseMove({ x: 140, y: 160 }, { e: {} });
        brush.onMouseMove({ x: 200, y: 220 }, { e: {} });
        brush.onMouseUp();
        const [path] = canvas.getObjects() as any[];
        expect(path).toBeInstanceOf(fabric.Path);
        expect(path.strokeWidth).toBe(0);
        expect(String(path.fill)).toMatch(/rgba?\(17, 34, 51|#112233/i);
    });
});
