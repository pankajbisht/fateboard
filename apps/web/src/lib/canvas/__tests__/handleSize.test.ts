import { describe, expect, it } from 'vitest';
import { Canvas, Rect } from 'fabric';
import {
    CORNER_CSS,
    MIN_OBJECT_CSS,
    TOUCH_CORNER_CSS,
    clampMinScale,
    enforceMinSize,
    handleStyle,
    sizeActiveHandles,
} from '../handleSize';

const rect = (w = 100, h = 50) =>
    new Rect({
        left: 0,
        top: 0,
        width: w,
        height: h,
        originX: 'left',
        originY: 'top',
        strokeWidth: 0,
    });

const transform = (action: string, scaleX = 1, scaleY = 1) => ({
    action,
    originX: 'left' as const,
    originY: 'top' as const,
    original: { scaleX, scaleY },
});

describe('selection handles keep a screen size', () => {
    it('scale with the canvas px per CSS px, bigger for a finger', () => {
        expect(handleStyle(3, 'fine').cornerSize).toBe(CORNER_CSS.fine * 3);
        expect(handleStyle(1, 'coarse').cornerSize).toBe(CORNER_CSS.coarse);
        expect(handleStyle(2, 'coarse').touchCornerSize).toBe(TOUCH_CORNER_CSS * 2);
    });

    it('are applied to the active object once, then are a no-op', () => {
        const canvas = new Canvas(document.createElement('canvas'), { width: 200, height: 200 });
        const r = rect();
        canvas.add(r);
        canvas.setActiveObject(r);
        expect(sizeActiveHandles(canvas, 'coarse')).toBe(true);
        expect(r.cornerSize).toBe(CORNER_CSS.coarse); // jsdom: no layout, 1 canvas px per CSS px
        expect(sizeActiveHandles(canvas, 'coarse')).toBe(false);
        canvas.dispose();
    });
});

describe('scaling has a minimum size', () => {
    it('stops a free scale at the floor on each axis, keeping the anchor corner', () => {
        const r = rect(100, 50);
        r.set({ scaleX: 0.05, scaleY: 0.1 }); // 5 x 5 px
        expect(clampMinScale(r, transform('scale'), 20)).toBe(true);
        expect(r.width * r.scaleX).toBeCloseTo(20);
        expect(r.height * r.scaleY).toBeCloseTo(20);
        expect(r.left).toBeCloseTo(0);
        expect(r.top).toBeCloseTo(0);
    });

    it('keeps a proportional corner drag proportional', () => {
        const r = rect(100, 50);
        r.set({ scaleX: 0.1, scaleY: 0.1 }); // 10 x 5
        clampMinScale(r, transform('scale'), 20);
        expect(r.scaleX).toBeCloseTo(r.scaleY);
        expect(r.height * r.scaleY).toBeCloseTo(20);
    });

    it('lets a side handle change only its own axis', () => {
        const r = rect(100, 2); // thin bar, already under the floor in height
        r.set({ scaleX: 0.01 });
        clampMinScale(r, transform('scaleX'), 20);
        expect(r.width * r.scaleX).toBeCloseTo(20);
        expect(r.scaleY).toBe(1);
    });

    it('never forces a thin line bigger, but stops it shrinking further', () => {
        const r = rect(100, 2);
        r.set({ scaleX: 0.5, scaleY: 0.5 }); // 50 x 1, started 100 x 2
        clampMinScale(r, transform('scale'), 20);
        expect(r.height * r.scaleY).toBeCloseTo(2);
        expect(r.scaleX).toBeCloseTo(r.scaleY);
    });

    it('leaves a big enough object alone', () => {
        const r = rect(100, 50);
        r.set({ scaleX: 0.9, scaleY: 0.9 });
        expect(clampMinScale(r, transform('scale'), 20)).toBe(false);
        expect(r.scaleX).toBe(0.9);
    });

    it('measures the floor in screen px: zooming out raises it in scene px', () => {
        const canvas = new Canvas(document.createElement('canvas'), { width: 200, height: 200 });
        canvas.setZoom(0.5);
        const r = rect(100, 100);
        r.set({ scaleX: 0.1, scaleY: 0.1 });
        enforceMinSize(canvas, { target: r, transform: transform('scale') }, 'fine');
        expect(r.width * r.scaleX).toBeCloseTo(MIN_OBJECT_CSS.fine / 0.5);
        canvas.dispose();
    });
});

describe('dragging a corner past the opposite one (real Fabric control)', () => {
    it('stops at the floor instead of flipping the shape across its anchor', async () => {
        const { controlsUtils, util } = await import('fabric');
        const { applyFabricChrome } = await import('@/lib/fabricChrome');
        const { handleSizeEvents } = await import('../handleSize');
        applyFabricChrome();
        const canvas = new Canvas(document.createElement('canvas'), { width: 400, height: 400 });
        Object.entries(handleSizeEvents(canvas, () => {})).forEach(([name, fn]) =>
            canvas.on(name as 'before:render', fn as () => void),
        );
        const r = rect(100, 100);
        canvas.add(r);
        const t = {
            target: r,
            action: 'scale',
            corner: 'br',
            originX: 'left',
            originY: 'top',
            signX: 1,
            signY: 1,
            ex: 100,
            ey: 100,
            original: { ...util.saveObjectTransform(r), originX: 'left', originY: 'top' },
        };
        const e = new MouseEvent('mousemove');
        const drag = (x: number, y: number) =>
            controlsUtils.scalingEqually(e as never, t as never, x, y);

        drag(5, 5); // below the floor
        drag(-60, -60); // past the anchor corner
        expect(r.flipX).toBe(false);
        expect(r.flipY).toBe(false);
        const box = r.getBoundingRect();
        expect(box.left).toBeCloseTo(0);
        expect(box.top).toBeCloseTo(0);
        expect(r.width * r.scaleX).toBeCloseTo(MIN_OBJECT_CSS.fine);
        canvas.dispose();
    });
});
