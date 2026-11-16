import { describe, expect, it, vi } from 'vitest';
import * as fabric from 'fabric';
import { reflection, rotation } from '@/lib/canvas/symmetry';
import { addSymmetryCopies, symmetryClones, transformBy } from '../symmetryCopies';

const rect = () =>
    new fabric.Rect({
        left: 110,
        top: 40,
        width: 20,
        height: 10,
        originX: 'left',
        originY: 'top',
        fill: '#f00',
        strokeWidth: 0,
    });

describe('symmetry copies', () => {
    it('a mirror becomes a flip (positive scale) at the mirrored place', () => {
        const r = rect();
        transformBy(r, reflection({ x: 100, y: 0 }, 90)); // vertical axis at x = 100
        expect(r.scaleX).toBeCloseTo(1);
        expect(r.scaleY).toBeCloseTo(1);
        expect(r.flipX !== r.flipY).toBe(true); // one mirror = one flip (with a half turn if needed)
        const c = r.getCenterPoint();
        expect(c.x).toBeCloseTo(80); // centre 120 -> 80
        expect(c.y).toBeCloseTo(45);
    });

    it('a rotation copy turns about the centre', () => {
        const r = rect();
        transformBy(r, rotation({ x: 100, y: 45 }, 180));
        const c = r.getCenterPoint();
        expect(c.x).toBeCloseTo(80);
        expect(c.y).toBeCloseTo(45);
        expect(Math.abs(r.angle % 360)).toBeCloseTo(180);
    });

    it('clones keep the stroke props and are added in one go', async () => {
        const r = rect();
        (r as unknown as Record<string, unknown>).isFreehand = true;
        const copies = await symmetryClones(r, [rotation({ x: 0, y: 0 }, 90)]);
        expect((copies[0] as unknown as Record<string, unknown>).isFreehand).toBe(true);
        const canvas = { add: vi.fn(), requestRenderAll: vi.fn() } as unknown as fabric.Canvas;
        await addSymmetryCopies(
            canvas,
            r,
            { symmetry: 'radial', symmetryCenter: null, symmetryCount: 6 },
            { x: 0, y: 0 },
        );
        expect((canvas.add as ReturnType<typeof vi.fn>).mock.calls[0]).toHaveLength(5);
        await addSymmetryCopies(
            canvas,
            r,
            { symmetry: 'none', symmetryCenter: null },
            { x: 0, y: 0 },
        );
        expect(canvas.add).toHaveBeenCalledTimes(1);
    });
});
