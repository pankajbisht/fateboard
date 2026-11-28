// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { dilate, floodFillMask } from '../floodFill';
import { loopArea, loopsToPath, simplifyLoop, traceContours } from '../traceContours';

/** A white w × h image with black pixels where `wall(x, y)`. */
function image(w: number, h: number, wall: (x: number, y: number) => boolean) {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const v = wall(x, y) ? 0 : 255;
            data.set([v, v, v, 255], i);
        }
    return data;
}

/** A square outline from 10 to 30 with an optional opening on the right side. */
const box =
    (gapRows = 0) =>
    (x: number, y: number) => {
        const onRing = (x === 10 || x === 30) && y >= 10 && y <= 30;
        const onTopBottom = (y === 10 || y === 30) && x >= 10 && x <= 30;
        const open = x === 30 && y >= 19 && y < 19 + gapRows;
        return (onRing || onTopBottom) && !open;
    };

describe('floodFillMask', () => {
    const opts = { tolerance: 32, gap: 0, expand: 0 };

    it('fills the inside of a closed outline and nothing outside', () => {
        const r = floodFillMask(image(40, 40, box()), 40, 40, 20, 20, opts);
        expect(r.count).toBe(19 * 19);
        expect(r.touchesEdge).toBe(false);
        expect(r.mask[5 * 40 + 5]).toBe(0);
    });

    it('leaks through an opening, and gap closing stops the leak', () => {
        const leaky = image(40, 40, box(3));
        expect(floodFillMask(leaky, 40, 40, 20, 20, opts).touchesEdge).toBe(true);
        const closed = floodFillMask(leaky, 40, 40, 20, 20, { ...opts, gap: 2 });
        expect(closed.touchesEdge).toBe(false);
        expect(closed.mask[20 * 40 + 20]).toBe(1);
    });

    it('expand grows the fill under the line', () => {
        const r = floodFillMask(image(40, 40, box()), 40, 40, 20, 20, { ...opts, expand: 1 });
        expect(r.mask[20 * 40 + 10]).toBe(1); // the left wall pixel is covered
        expect(r.mask[20 * 40 + 9]).toBe(0);
    });

    it('a click outside the image fills nothing', () => {
        expect(
            floodFillMask(
                image(4, 4, () => false),
                4,
                4,
                -1,
                2,
                opts,
            ).count,
        ).toBe(0);
    });

    it('dilate grows a pixel into a square', () => {
        const m = new Uint8Array(25);
        m[12] = 1;
        expect(Array.from(dilate(m, 5, 5, 1)).reduce((a, b) => a + b, 0)).toBe(9);
    });
});

describe('traceContours', () => {
    it('outlines a filled square as one clockwise loop', () => {
        const w = 6;
        const mask = new Uint8Array(w * w);
        for (let y = 1; y < 5; y++) for (let x = 1; x < 5; x++) mask[y * w + x] = 1;
        const loops = traceContours(mask, w, w);
        expect(loops).toHaveLength(1);
        expect(loops[0]).toHaveLength(4); // corners only
        expect(loopArea(loops[0])).toBe(16);
    });

    it('a ring gives an outer loop and a hole running the other way', () => {
        const w = 7;
        const mask = new Uint8Array(w * w);
        for (let y = 1; y < 6; y++) for (let x = 1; x < 6; x++) mask[y * w + x] = 1;
        mask[3 * w + 3] = 0;
        const loops = traceContours(mask, w, w);
        expect(loops).toHaveLength(2);
        const areas = loops.map(loopArea).sort((a, b) => a - b);
        expect(areas).toEqual([-1, 25]);
    });

    it('splits diagonal touches into separate loops', () => {
        const mask = new Uint8Array([1, 0, 0, 1]);
        expect(traceContours(mask, 2, 2)).toHaveLength(2);
    });

    it('simplifies a staircase into a straight edge and writes path data', () => {
        const stairs = Array.from({ length: 20 }, (_, i) => [
            { x: i, y: i },
            { x: i + 1, y: i },
        ]).flat();
        const loop = [...stairs, { x: 0, y: 20 }];
        expect(simplifyLoop(loop).length).toBeLessThan(6);
        expect(
            loopsToPath([
                [
                    { x: 0, y: 0 },
                    { x: 1, y: 0 },
                    { x: 1, y: 1 },
                ],
            ]),
        ).toBe('M 0 0 L 1 0 L 1 1 Z');
    });
});
