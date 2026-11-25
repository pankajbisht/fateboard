/**
 * Anchor (reference point) transforms - Settings: header origin selector.
 * Rule (Illustrator-style reference point): X/Y show the anchor; typing X/Y moves the anchor there;
 * rotation, width, height keep the anchor fixed; flip mirrors across a line through the anchor.
 * Checked on real Fabric objects, unrotated and rotated, for all 9 anchors.
 */
import { describe, expect, it } from 'vitest';
import * as fabric from 'fabric';
import { createTransformSlice } from '@/store/slices/createTransformSlice';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { createHarness } from '@/test/sliceHarness';

/* eslint-disable @typescript-eslint/no-explicit-any */

type Anchor = {
    id: string;
    originX: 'left' | 'center' | 'right';
    originY: 'top' | 'center' | 'bottom';
};
const ANCHORS: Anchor[] = [
    { id: 'tl', originX: 'left', originY: 'top' },
    { id: 't', originX: 'center', originY: 'top' },
    { id: 'tr', originX: 'right', originY: 'top' },
    { id: 'l', originX: 'left', originY: 'center' },
    { id: 'c', originX: 'center', originY: 'center' },
    { id: 'r', originX: 'right', originY: 'center' },
    { id: 'bl', originX: 'left', originY: 'bottom' },
    { id: 'b', originX: 'center', originY: 'bottom' },
    { id: 'br', originX: 'right', originY: 'bottom' },
];
const F = { left: -0.5, center: 0, right: 0.5, top: -0.5, bottom: 0.5 } as const;
const MIRROR_X = { left: 'right', center: 'center', right: 'left' } as const;
const MIRROR_Y = { top: 'bottom', center: 'center', bottom: 'top' } as const;

function setup(angle = 0) {
    const canvas = createFakeCanvas() as any;
    const rect = new fabric.Rect({
        width: 100,
        height: 50,
        originX: 'center',
        originY: 'center',
        left: 200,
        top: 100,
        angle,
        strokeWidth: 0,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    const h = createHarness([createTransformSlice as any], { canvas });
    h.get().updateFromFabric(rect);
    return { h, rect };
}

/** Where the anchor of `obj` is on the canvas right now (independent of the slice's math). */
function anchorPoint(obj: fabric.FabricObject, a: Anchor) {
    const w = (obj.width ?? 0) * Math.abs(obj.scaleX ?? 1);
    const h = (obj.height ?? 0) * Math.abs(obj.scaleY ?? 1);
    const local = new fabric.Point(F[a.originX] * w, F[a.originY] * h);
    return local.rotate(fabric.util.degreesToRadians(obj.angle ?? 0)).add(obj.getCenterPoint());
}

const close = (p: { x: number; y: number }, q: { x: number; y: number }) => {
    expect(p.x).toBeCloseTo(q.x, 1);
    expect(p.y).toBeCloseTo(q.y, 1);
};

describe.each([0, 30])('anchor transforms (object rotated %i°)', (angle) => {
    describe.each(ANCHORS)('anchor $id', (a) => {
        it('X/Y show the anchor position', () => {
            const { h, rect } = setup(angle);
            h.get().setOrigin(a);
            const t = h.get().transform;
            close({ x: t.x, y: t.y }, anchorPoint(rect, a));
        });

        it('typing X/Y moves the object so the anchor lands there (size and angle unchanged)', () => {
            const { h, rect } = setup(angle);
            h.get().setOrigin(a);
            h.get().setTransform('x', 500);
            h.get().setTransform('y', 300);
            close(anchorPoint(rect, a), { x: 500, y: 300 });
            expect(rect.angle).toBeCloseTo(angle);
            expect(rect.getScaledWidth()).toBeCloseTo(100);
        });

        it('rotation keeps the anchor fixed', () => {
            const { h, rect } = setup(angle);
            h.get().setOrigin(a);
            const before = anchorPoint(rect, a);
            h.get().setTransform('rotation', angle + 45);
            expect(rect.angle).toBeCloseTo(angle + 45);
            close(anchorPoint(rect, a), before);
        });

        it('width / height (scale) keep the anchor fixed', () => {
            const { h, rect } = setup(angle);
            h.get().setOrigin(a);
            const before = anchorPoint(rect, a);
            h.get().setTransform('width', 160);
            h.get().setTransform('height', 20);
            expect(rect.getScaledWidth()).toBeCloseTo(160);
            expect(rect.getScaledHeight()).toBeCloseTo(20);
            close(anchorPoint(rect, a), before);
        });

        it('flip X reflects the object across the anchor (vertical line through it)', () => {
            const { h, rect } = setup(angle);
            h.get().setOrigin(a);
            const anchorBefore = anchorPoint(rect, a);
            const centerBefore = rect.getCenterPoint();

            h.get().flipX();
            expect(rect.flipX).toBe(true);
            // the object lands on the other side of the anchor, along its own x axis
            const rad = fabric.util.degreesToRadians(rect.angle ?? 0);
            const shift = rect.getCenterPoint().subtract(centerBefore);
            const along = shift.x * Math.cos(rad) + shift.y * Math.sin(rad);
            const across = -shift.x * Math.sin(rad) + shift.y * Math.cos(rad);
            expect(along).toBeCloseTo(2 * F[a.originX] * 100, 1);
            expect(across).toBeCloseTo(0, 1);
            // the anchor stays on the same canvas spot: it is now the mirrored point (tl -> tr)
            const mirrored = { ...a, originX: MIRROR_X[a.originX] };
            expect(h.get().transform.originX).toBe(mirrored.originX);
            close(anchorPoint(rect, mirrored), anchorBefore);
            close({ x: h.get().transform.x, y: h.get().transform.y }, anchorBefore);

            h.get().flipX(); // flipping again reflects back: restored exactly
            expect(rect.flipX).toBe(false);
            close(rect.getCenterPoint(), centerBefore);
            expect(h.get().transform.id).toBe(a.id);
        });

        it('flip Y reflects the object across the anchor (horizontal line through it)', () => {
            const { h, rect } = setup(angle);
            h.get().setOrigin(a);
            const anchorBefore = anchorPoint(rect, a);
            const centerBefore = rect.getCenterPoint();

            h.get().flipY();
            expect(rect.flipY).toBe(true);
            const rad = fabric.util.degreesToRadians(rect.angle ?? 0);
            const shift = rect.getCenterPoint().subtract(centerBefore);
            const down = -shift.x * Math.sin(rad) + shift.y * Math.cos(rad);
            expect(down).toBeCloseTo(2 * F[a.originY] * 50, 1);
            const mirrored = { ...a, originY: MIRROR_Y[a.originY] };
            expect(h.get().transform.originY).toBe(mirrored.originY);
            close(anchorPoint(rect, mirrored), anchorBefore);

            h.get().flipY();
            close(rect.getCenterPoint(), centerBefore);
            expect(h.get().transform.id).toBe(a.id);
        });
    });
});

describe('anchor bookkeeping', () => {
    it('changing the anchor never moves the object', () => {
        const { h, rect } = setup(30);
        const before = rect.getCenterPoint();
        for (const a of ANCHORS) h.get().setOrigin(a);
        close(rect.getCenterPoint(), before);
    });

    it('the selector state persists across selections', () => {
        const { h } = setup();
        h.get().setOrigin(ANCHORS[0]);
        h.get().updateFromFabric(new fabric.Rect({ width: 10, height: 10, left: 0, top: 0 }));
        expect(h.get().transform.id).toBe('tl');
    });
});

describe('multi-selection uses the same anchor rules', () => {
    it('X/Y/W/H/R apply to the whole selection around its anchor', () => {
        const canvas = createFakeCanvas() as any;
        const a1 = new fabric.Rect({
            width: 50,
            height: 50,
            left: 100,
            top: 100,
            originX: 'left',
            originY: 'top',
        });
        const a2 = new fabric.Rect({
            width: 50,
            height: 50,
            left: 250,
            top: 150,
            originX: 'left',
            originY: 'top',
        });
        canvas.add(a1, a2);
        const sel = new fabric.ActiveSelection([a1, a2]);
        canvas.setActiveObject(sel);
        const h = createHarness([createTransformSlice as any], { canvas });
        h.get().updateFromFabric(sel);

        const tl = ANCHORS[0];
        h.get().setOrigin(tl);
        const before = anchorPoint(sel, tl);
        close({ x: h.get().transform.x, y: h.get().transform.y }, before);

        h.get().setTransform('width', 400);
        expect(sel.getScaledWidth()).toBeCloseTo(400);
        close(anchorPoint(sel, tl), before);

        h.get().setTransform('rotation', 90);
        close(anchorPoint(sel, tl), before);
    });
});
