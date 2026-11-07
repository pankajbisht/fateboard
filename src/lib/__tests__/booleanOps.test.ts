/**
 * Boolean operations (footer). Industry rules (Figma / Illustrator): stacking order decides,
 * never click order. Checked with real Fabric shapes and real Paper.js geometry.
 */
import { describe, expect, it } from 'vitest';
import * as fabric from 'fabric';
import { computeBoolean } from '../booleanOps';

const rect = (left: number, top: number, w: number, h: number, fill: string) =>
    new fabric.Rect({
        left,
        top,
        width: w,
        height: h,
        fill,
        originX: 'left',
        originY: 'top',
        strokeWidth: 0,
    });

const bounds = (o: fabric.FabricObject) => {
    const b = o.getBoundingRect();
    return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)];
};

// back (red) 0..100, front (blue) 50..150, both 0..100 tall
const back = () => rect(0, 0, 100, 100, '#ff0000');
const front = () => rect(50, 0, 100, 100, '#0000ff');

describe('computeBoolean', () => {
    it('union merges into one shape covering both, in place', async () => {
        const out = await computeBoolean('union', [back(), front()]);
        expect(out).toHaveLength(1);
        expect(bounds(out[0])).toEqual([0, 0, 150, 100]);
    });

    it('subtract removes the FRONT shape from the BACK one and keeps the back style', async () => {
        const out = await computeBoolean('subtract', [back(), front()]);
        expect(out).toHaveLength(1);
        expect(bounds(out[0])).toEqual([0, 0, 50, 100]);
        expect(out[0].fill).toBe('#ff0000');
    });

    it('intersect keeps the overlap only', async () => {
        const out = await computeBoolean('intersect', [back(), front()]);
        expect(bounds(out[0])).toEqual([50, 0, 50, 100]);
    });

    it('exclude removes the overlap (one shape, two islands)', async () => {
        const out = await computeBoolean('exclude', [back(), front()]);
        expect(out).toHaveLength(1);
        expect(bounds(out[0])).toEqual([0, 0, 150, 100]);
    });

    it('divide splits into separate pieces that keep their own colour', async () => {
        const out = await computeBoolean('divide', [back(), front()]);
        expect(out.map(bounds).sort()).toEqual(
            [
                [0, 0, 50, 100],
                [50, 0, 50, 100],
                [100, 0, 50, 100],
            ].sort(),
        );
        const overlap = out.find((o) => bounds(o)[0] === 50)!;
        expect(overlap.fill).toBe('#0000ff'); // the overlap shows the front shape's colour
        expect(out.find((o) => bounds(o)[0] === 0)!.fill).toBe('#ff0000');
    });

    it('crop trims the shapes below to the TOP shape and drops the top shape', async () => {
        const out = await computeBoolean('crop', [back(), front()]);
        expect(out).toHaveLength(1);
        expect(bounds(out[0])).toEqual([50, 0, 50, 100]);
        expect(out[0].fill).toBe('#ff0000');
    });

    it('works on 3 shapes (subtract every front shape from the bottom one)', async () => {
        const out = await computeBoolean('subtract', [
            rect(0, 0, 300, 100, '#ff0000'),
            rect(0, 0, 100, 100, '#00ff00'),
            rect(200, 0, 100, 100, '#0000ff'),
        ]);
        expect(bounds(out[0])).toEqual([100, 0, 100, 100]);
    });

    it('works with shapes that carry numeric ids (real app objects; Paper rejects numeric names)', async () => {
        const a = back();
        const b = front();
        (a as unknown as { id: string }).id = '1720000000001';
        (b as unknown as { id: string }).id = '42';
        expect(a.toSVG()).toMatch(/id="1720000000001"/);
        const out = await computeBoolean('union', [a, b]);
        expect(bounds(out[0])).toEqual([0, 0, 150, 100]);
    });

    it('nothing left (no overlap for intersect) returns an empty list', async () => {
        const out = await computeBoolean('intersect', [
            rect(0, 0, 10, 10, '#000'),
            rect(50, 50, 10, 10, '#000'),
        ]);
        expect(out).toEqual([]);
    });

    it('keeps rotated / scaled shapes in place', async () => {
        const r = rect(100, 100, 100, 100, '#ff0000');
        r.set({ angle: 45 });
        const out = await computeBoolean('union', [r, rect(1000, 1000, 10, 10, '#000')]);
        expect(bounds(out[0])[0]).toBeCloseTo(bounds(r)[0], -1);
        expect(bounds(out[0])[1]).toBeCloseTo(bounds(r)[1], -1);
    });
});
