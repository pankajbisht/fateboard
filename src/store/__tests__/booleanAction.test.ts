import { describe, expect, it, vi } from 'vitest';
import * as fabric from 'fabric';
import { createShapeStyleSlice } from '@/store/slices/createShapeStyleSlice';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { createHarness } from '@/test/sliceHarness';

/* eslint-disable @typescript-eslint/no-explicit-any */

const rect = (left: number, fill: string) =>
    new fabric.Rect({
        left,
        top: 0,
        width: 100,
        height: 100,
        fill,
        originX: 'left',
        originY: 'top',
        strokeWidth: 0,
    });

function setup(selectionOrder: 'back-first' | 'front-first') {
    const canvas = createFakeCanvas() as any;
    const other = rect(500, '#cccccc');
    const back = rect(0, '#ff0000');
    const front = rect(50, '#0000ff');
    canvas.add(other, back, front); // stacking: other, back, front
    const picked = selectionOrder === 'back-first' ? [back, front] : [front, back];
    canvas.setActiveObject(new fabric.ActiveSelection(picked));
    const saveState = vi.fn();
    const alertDialog = vi.fn(() => Promise.resolve());
    const h = createHarness([createShapeStyleSlice as any], { canvas, saveState, alertDialog });
    return { canvas, h, back, front, saveState, alertDialog };
}

describe('booleanOperation (store action)', () => {
    it.each(['back-first', 'front-first'] as const)(
        'subtract uses stacking order, not click order (%s)',
        async (order) => {
            const { canvas, h, back, front, saveState } = setup(order);
            await h.get().subtractSelected();
            const objs = canvas.getObjects();
            expect(objs).not.toContain(back);
            expect(objs).not.toContain(front);
            const result = canvas.getActiveObject();
            const b = result.getBoundingRect();
            expect([Math.round(b.left), Math.round(b.width)]).toEqual([0, 50]);
            expect(result.fill).toBe('#ff0000');
            // the result takes the place of the originals in the stack (above "other")
            expect(objs.indexOf(result)).toBe(1);
            expect(saveState).toHaveBeenCalledTimes(1);
        },
    );

    it('the old duplicate actions map to the real operations', async () => {
        const { canvas, h } = setup('back-first');
        await h.get().punchSelected(); // = subtract
        const b = canvas.getActiveObject().getBoundingRect();
        expect([Math.round(b.left), Math.round(b.width)]).toEqual([0, 50]);
    });

    it('divide leaves separate, selected pieces', async () => {
        const { canvas, h } = setup('front-first');
        await h.get().divideSelected();
        const sel = canvas.getActiveObject();
        expect(sel.type).toBe('activeselection');
        expect(sel.getObjects()).toHaveLength(3);
    });

    it('tells the user when nothing would remain (no overlap)', async () => {
        const canvas = createFakeCanvas() as any;
        const a = rect(0, '#000');
        const b = rect(400, '#000');
        canvas.add(a, b);
        canvas.setActiveObject(new fabric.ActiveSelection([a, b]));
        const alertDialog = vi.fn(() => Promise.resolve());
        const h = createHarness([createShapeStyleSlice as any], {
            canvas,
            saveState: vi.fn(),
            alertDialog,
        });
        await h.get().intersectSelected();
        expect(alertDialog).toHaveBeenCalled();
        expect(canvas.getObjects()).toEqual([a, b]); // originals untouched
    });
});

describe('mask (clip)', () => {
    it.each(['back-first', 'front-first'] as const)(
        'the TOP shape clips the one below (%s)',
        async (order) => {
            const { canvas, h, back, front } = setup(order);
            await h.get().clipSelectedObject();
            const objs = canvas.getObjects();
            expect(objs).toContain(back);
            expect(objs).not.toContain(front);
            expect(back.clipPath).toBeTruthy();
            expect(back.clipPath!.absolutePositioned).toBe(true);
            expect(Math.round(back.clipPath!.getBoundingRect().left)).toBe(50);
        },
    );
});
