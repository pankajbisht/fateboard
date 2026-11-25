/**
 * The transform panel (X Y W H R + anchor) must follow the canvas: after dragging / scaling /
 * rotating with the mouse, the next panel edit or flip must start from where the object IS
 * (before: the store only synced on selection change, so edits snapped objects back).
 */
import { describe, expect, it, vi } from 'vitest';
import * as fabric from 'fabric';
import { createCanvasSlice } from '@/store/slices/createCanvasSlice';
import { createTransformSlice } from '@/store/slices/createTransformSlice';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { createHarness } from '@/test/sliceHarness';

/* eslint-disable @typescript-eslint/no-explicit-any */

function setup() {
    const canvas = createFakeCanvas() as any;
    const h = createHarness([createCanvasSlice as any, createTransformSlice as any], {
        canvas,
        saveState: vi.fn(),
        persist: vi.fn(),
        filterUnlockedSelection: () => false,
        clearGradientSession: vi.fn(),
        installShapeBehavior: vi.fn(),
    });
    h.set({ canvas }); // the canvas slice's initial `canvas: null` overrides the harness extra
    h.get().registerCanvasEvents(canvas);
    const rect = new fabric.Rect({
        width: 100,
        height: 50,
        left: 200,
        top: 100,
        originX: 'center',
        originY: 'center',
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.fire('selection:created', { selected: [rect] });
    return { canvas, h, rect };
}

describe('transform panel follows mouse transforms', () => {
    it.each(['object:moving', 'object:scaling', 'object:rotating', 'object:modified'])(
        '%s re-syncs X/Y/W/H/R',
        (event) => {
            const { canvas, h, rect } = setup();
            rect.set({ left: 400, top: 300, scaleX: 2, angle: 15 });
            canvas.fire(event, { target: rect });
            const t = h.get().transform;
            expect(t.x).toBeCloseTo(400);
            expect(t.y).toBeCloseTo(300);
            expect(t.width).toBeCloseTo(200);
            expect(t.rotation).toBeCloseTo(15);
        },
    );

    it('a panel edit after a drag starts from the new position (no snap back)', () => {
        const { canvas, h, rect } = setup();
        rect.set({ left: 400, top: 300 });
        canvas.fire('object:moving', { target: rect });
        canvas.fire('object:modified', { target: rect });
        h.get().setTransform('width', 150);
        expect(rect.getCenterPoint().x).toBeCloseTo(400);
        expect(rect.getCenterPoint().y).toBeCloseTo(300);
        h.get().flipX();
        expect(rect.getCenterPoint().x).toBeCloseTo(400);
    });

    it('multi-selection fills the panel; deselect clears it', () => {
        const { canvas, h, rect } = setup();
        const other = new fabric.Rect({
            width: 50,
            height: 50,
            left: 400,
            top: 100,
            originX: 'center',
            originY: 'center',
        });
        canvas.add(other);
        const sel = new fabric.ActiveSelection([rect, other]);
        canvas.setActiveObject(sel);
        canvas.fire('selection:updated', { selected: [rect, other] });
        expect(h.get().transform.width).toBeCloseTo(sel.getScaledWidth());
        expect(h.get().hasSelection).toBe(true);

        canvas.discardActiveObject();
        canvas.fire('selection:cleared', {});
        expect(h.get().hasSelection).toBe(false);
    });
});
