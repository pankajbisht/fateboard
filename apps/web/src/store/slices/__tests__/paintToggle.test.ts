/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Dock fill / stroke toggles: Remove ⇄ Add on the selection, one undo step per click, defaults on
 * re-add, groups painted through their children, text per-letter styles cleared too.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fabric from 'fabric';
import { createHarness } from '@/test/sliceHarness';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { createShapeStyleSlice } from '@/store/slices/createShapeStyleSlice';
import { PAINT_DEFAULTS } from '@/lib/paintToggle';

let h: ReturnType<typeof createHarness<any>>;
let canvas: any;
let modified: ReturnType<typeof vi.fn>;

const select = (...objs: any[]) => {
    objs.forEach((o) => canvas.add(o));
    canvas.setActiveObject(objs.length === 1 ? objs[0] : objs);
    // fakeCanvas keeps a list of active objects
    if (objs.length > 1) canvas.getActiveObjects = () => objs;
};

beforeEach(() => {
    canvas = createFakeCanvas();
    modified = vi.fn();
    canvas.on('object:modified', modified);
    h = createHarness([createShapeStyleSlice as any], {
        canvas,
        saveState: vi.fn(),
    });
});

describe('toggleStroke', () => {
    it('removes the stroke, then adds the default stroke back (one modified event per click)', () => {
        const rect = new fabric.Rect({ width: 50, height: 50, stroke: '#ff0000', strokeWidth: 6 });
        select(rect);

        expect(h.get().toggleStroke()).toBe(true);
        expect(rect.strokeWidth).toBe(0);
        expect(rect.stroke).toBeNull();
        expect(h.get().strokeWidth).toBe(0); // footer width mirrors the selection
        expect(modified).toHaveBeenCalledTimes(1);
        // history is recorded by the action itself (canvas history listeners are not wired: BUG-090)
        expect(h.get().saveState).toHaveBeenCalledTimes(1);

        h.get().toggleStroke();
        expect(rect.stroke).toBe(PAINT_DEFAULTS.shape.stroke);
        expect(rect.strokeWidth).toBe(PAINT_DEFAULTS.shape.strokeWidth);
        expect(h.get().strokeWidth).toBe(PAINT_DEFAULTS.shape.strokeWidth);
        expect(h.get().stroke).toBe(PAINT_DEFAULTS.shape.stroke);
        expect(modified).toHaveBeenCalledTimes(2);
    });

    it('mixed selection: removes from all; then adds to all', () => {
        const a = new fabric.Rect({ stroke: '#000', strokeWidth: 2 });
        const b = new fabric.Rect({ stroke: null, strokeWidth: 0 });
        select(a, b);
        h.get().toggleStroke();
        expect([a.strokeWidth, b.strokeWidth]).toEqual([0, 0]);
        h.get().toggleStroke();
        expect([a.strokeWidth, b.strokeWidth]).toEqual([2, 2]);
    });

    it('groups: strokes the shapes inside (the group box itself has no visible stroke)', () => {
        const a = new fabric.Rect({ stroke: '#000', strokeWidth: 2 });
        const b = new fabric.Circle({ radius: 5, stroke: '#000', strokeWidth: 2 });
        const g = new fabric.Group([a, b]);
        select(g);
        h.get().toggleStroke();
        expect([a.strokeWidth, b.strokeWidth]).toEqual([0, 0]);
    });

    it('text: outline on / off like the Text panel, clearing per-letter outline styles', () => {
        const t = new fabric.Textbox('Hi', { stroke: '#f00', strokeWidth: 3 });
        t.setSelectionStyles({ stroke: '#0f0', strokeWidth: 4 }, 0, 1);
        select(t);
        h.get().toggleStroke();
        expect(t.strokeWidth).toBe(0);
        expect(t.getSelectionStyles(0, 1)[0].stroke).toBeUndefined();
        h.get().toggleStroke();
        expect(t.stroke).toBe(PAINT_DEFAULTS.text.stroke);
        expect(t.paintFirst).toBe('stroke'); // outline behind the letters
    });

    it('nothing selected: does nothing and does not change defaults', () => {
        expect(h.get().toggleStroke()).toBe(false);
        expect(h.get().strokeWidth).toBe(1);
        expect(modified).not.toHaveBeenCalled();
        expect(h.get().saveState).not.toHaveBeenCalled();
    });
});

describe('toggleFill', () => {
    it('removes the fill (gradient too), then adds the default fill back', () => {
        const rect = new fabric.Rect({
            fill: new fabric.Gradient({ type: 'linear', colorStops: [] }),
        });
        select(rect);
        const clearGradientSession = vi.fn();
        h.set({ clearGradientSession }); // the slice's own one is replaced by a spy here
        h.get().toggleFill();
        expect(rect.fill).toBe('rgba(0,0,0,0)');
        expect(clearGradientSession).toHaveBeenCalled();
        expect(h.get().fillMode).toBe('solid');
        h.get().toggleFill();
        expect(rect.fill).toBe(PAINT_DEFAULTS.shape.fill);
        expect(h.get().fill).toBe(PAINT_DEFAULTS.shape.fill);
        expect(h.get().saveState).toHaveBeenCalledTimes(2); // one undo step per click
    });

    it('text gets the text default (dark), not white; per-letter colors are cleared on remove', () => {
        const t = new fabric.Textbox('Hi', { fill: '#123456' });
        t.setSelectionStyles({ fill: '#ff0000' }, 0, 1);
        select(t);
        h.get().toggleFill();
        expect(t.fill).toBe('rgba(0,0,0,0)');
        expect(t.getSelectionStyles(0, 1)[0].fill).toBeUndefined();
        h.get().toggleFill();
        expect(t.fill).toBe(PAINT_DEFAULTS.text.fill);
    });

    it('images have no fill: the toggle does nothing', () => {
        const img = new fabric.FabricImage(document.createElement('img'));
        select(img);
        expect(h.get().toggleFill()).toBe(false);
        expect(modified).not.toHaveBeenCalled();
    });

    it('nothing selected: no change to the default fill or the brush color', () => {
        const setBrushColor = vi.fn();
        h.set({ setBrushColor });
        expect(h.get().toggleFill()).toBe(false);
        expect(h.get().fill).toBe('rgba(0, 0, 0, 0)');
        expect(setBrushColor).not.toHaveBeenCalled();
    });
});
