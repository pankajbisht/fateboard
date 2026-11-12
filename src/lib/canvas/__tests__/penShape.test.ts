import { describe, expect, it } from 'vitest';
import { flattenPenNodes, shapedOutline, shapeProfile } from '../penShape';

const line = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
];
/** Half-widths along the line: |y| of the outline points, keyed by rounded x. */
const halfWidthAt = (d: string, x: number) => {
    const pts = [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [+m[1], +m[2]]);
    return Math.max(...pts.filter(([px]) => Math.abs(px - x) < 0.01).map(([, py]) => Math.abs(py)));
};

describe('shapeProfile (Inkscape Pen "Shape")', () => {
    it('triangle in grows from a point, triangle out shrinks to one, ellipse swells in the middle', () => {
        expect([0, 0.5, 1].map((t) => shapeProfile('triangle-in', t))).toEqual([0, 0.5, 1]);
        expect([0, 0.5, 1].map((t) => shapeProfile('triangle-out', t))).toEqual([1, 0.5, 0]);
        expect(shapeProfile('ellipse', 0)).toBe(0);
        expect(shapeProfile('ellipse', 0.5)).toBe(1);
        expect(shapeProfile('ellipse', 1)).toBe(0);
        expect(shapeProfile('none', 0.3)).toBe(1);
    });
});

describe('flattenPenNodes', () => {
    it('keeps corners as-is and samples curves', () => {
        expect(flattenPenNodes(line)).toEqual(line);
        const curve = flattenPenNodes([
            { x: 0, y: 0, out: { x: 0, y: 50 } },
            { x: 100, y: 0, in: { x: 100, y: 50 } },
        ]);
        expect(curve.length).toBeGreaterThan(10);
        expect(curve.at(-1)).toEqual({ x: 100, y: 0 });
        expect(Math.max(...curve.map((p) => p.y))).toBeCloseTo(37.5, 0);
    });
});

describe('shapedOutline', () => {
    it('is one closed filled outline', () => {
        const d = shapedOutline(line, 'ellipse', 20);
        expect(d.startsWith('M')).toBe(true);
        expect(d.trim().endsWith('Z')).toBe(true);
        expect((d.match(/M/g) ?? []).length).toBe(1);
    });

    it('triangle out is `width` thick at the start and a point at the end', () => {
        const d = shapedOutline(line, 'triangle-out', 20);
        expect(halfWidthAt(d, 0)).toBeCloseTo(10);
        expect(halfWidthAt(d, 100)).toBeCloseTo(0);
    });

    it('triangle in is the reverse', () => {
        const d = shapedOutline(line, 'triangle-in', 20);
        expect(halfWidthAt(d, 0)).toBeCloseTo(0);
        expect(halfWidthAt(d, 100)).toBeCloseTo(10);
    });

    it('returns an empty string for a zero-length path', () => {
        expect(
            shapedOutline(
                [
                    { x: 5, y: 5 },
                    { x: 5, y: 5 },
                ],
                'ellipse',
                10,
            ),
        ).toBe('');
    });
});
