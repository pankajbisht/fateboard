/**
 * BUG-189: the transform panel (X Y W H R) and Flip must not move, resize, rotate or mirror a
 * locked object or a locked multi-selection; the panel shows the object's real values again.
 */
import { describe, expect, it, vi } from 'vitest';
import * as fabric from 'fabric';
import { createCanvasSlice } from '@/store/slices/createCanvasSlice';
import { createTransformSlice } from '@/store/slices/createTransformSlice';
import { createLayersSlice } from '@/store/slices/createLayersSlice';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { createHarness } from '@/test/sliceHarness';

/* eslint-disable @typescript-eslint/no-explicit-any */

const box = (left: number) =>
    new fabric.Rect({
        width: 100,
        height: 50,
        left,
        top: 100,
        strokeWidth: 0,
        originX: 'left',
        originY: 'top',
    });

function setup() {
    const canvas = createFakeCanvas() as any;
    const h = createHarness(
        [createCanvasSlice as any, createTransformSlice as any, createLayersSlice as any],
        {
            canvas,
            saveState: vi.fn(),
            persist: vi.fn(),
            filterUnlockedSelection: () => false,
            clearGradientSession: vi.fn(),
            installShapeBehavior: vi.fn(),
        },
    );
    h.set({ canvas }); // the canvas slice's initial `canvas: null` overrides the harness extra
    h.get().registerCanvasEvents(canvas);
    const a = box(200);
    const b = box(400);
    canvas.add(a, b);
    return { canvas, h, a, b };
}

const state = (o: any) => ({
    left: o.left,
    top: o.top,
    scaleX: o.scaleX,
    angle: o.angle,
    flipX: o.flipX,
});

describe('transform panel respects lock (BUG-189)', () => {
    it('X / W / R edits and flips leave a locked object as it is', () => {
        const { canvas, h, a } = setup();
        canvas.setActiveObject(a);
        canvas.fire('selection:created', { selected: [a] });
        h.get().lock();
        const before = state(a);
        h.get().setTransform('x', 999);
        h.get().setTransform('width', 300);
        h.get().setTransform('rotation', 45);
        h.get().flipX();
        expect(state(a)).toEqual(before);
        // the panel shows the real values again, not the refused ones
        expect(h.get().transform.width).toBeCloseTo(100);
        expect(h.get().transform.rotation).toBeCloseTo(0);
    });

    it('a locked multi-selection is not moved through the panel either', () => {
        const { canvas, h, a, b } = setup();
        const sel = new fabric.ActiveSelection([a, b], { canvas });
        canvas.setActiveObject(sel);
        canvas.fire('selection:created', { selected: [a, b] });
        h.get().lock();
        const before = state(sel);
        h.get().setTransform('x', 999);
        h.get().flipY();
        expect(state(sel)).toEqual(before);
        expect(sel.flipY).toBe(false);
    });

    it('an unlocked object still follows the panel', () => {
        const { canvas, h, a } = setup();
        canvas.setActiveObject(a);
        canvas.fire('selection:created', { selected: [a] });
        h.get().setTransform('width', 300);
        expect(a.getScaledWidth()).toBeCloseTo(300);
    });
});
