// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { pathPoints, recognizeShape, type Pt } from '../shapeRecognizer';

/** A wobbly hand: deterministic jitter of ±amp. */
const wobble = (pts: Pt[], amp: number) =>
    pts.map((p, i) => ({ x: p.x + Math.sin(i * 1.7) * amp, y: p.y + Math.cos(i * 2.3) * amp }));

const along = (a: Pt, b: Pt, n: number) =>
    Array.from({ length: n }, (_, i) => ({
        x: a.x + ((b.x - a.x) * i) / n,
        y: a.y + ((b.y - a.y) * i) / n,
    }));

const loop = (corners: Pt[], n = 20) => [
    ...corners.flatMap((c, i) => along(c, corners[(i + 1) % corners.length], n)),
    corners[0],
];

const ring = (cx: number, cy: number, rx: number, ry: number, n = 60) =>
    Array.from({ length: n + 1 }, (_, i) => ({
        x: cx + rx * Math.cos((i / n) * Math.PI * 2),
        y: cy + ry * Math.sin((i / n) * Math.PI * 2),
    }));

describe('recognizeShape (Pencil › Smart shape)', () => {
    it('a roughly straight stroke becomes a line from its start to its end', () => {
        const r = recognizeShape(wobble(along({ x: 0, y: 0 }, { x: 200, y: 40 }, 40), 2));
        expect(r?.kind).toBe('line');
        expect(r?.path[0][0]).toBe('M');
        expect(r?.path[1][0]).toBe('L');
    });

    it('a rough round loop becomes a circle, an oval loop an ellipse', () => {
        expect(recognizeShape(wobble(ring(100, 100, 80, 78), 3))?.kind).toBe('circle');
        expect(recognizeShape(wobble(ring(100, 100, 120, 50), 3))?.kind).toBe('ellipse');
    });

    it('a rough box becomes an axis-aligned rectangle', () => {
        const box = loop([
            { x: 0, y: 0 },
            { x: 200, y: 0 },
            { x: 200, y: 120 },
            { x: 0, y: 120 },
        ]);
        const r = recognizeShape(wobble(box, 2));
        expect(r?.kind).toBe('rect');
        expect(r?.path.at(-1)).toEqual(['Z']);
    });

    it('a rough triangle becomes a triangle', () => {
        const tri = loop([
            { x: 100, y: 0 },
            { x: 200, y: 170 },
            { x: 0, y: 170 },
        ]);
        expect(recognizeShape(wobble(tri, 2))?.kind).toBe('triangle');
    });

    it('a scribble, a curve or a tap stays freehand', () => {
        const zigzag = Array.from({ length: 40 }, (_, i) => ({ x: i * 5, y: (i % 2) * 60 }));
        expect(recognizeShape(zigzag)).toBeNull();
        const arc = ring(100, 100, 80, 80, 60).slice(0, 25); // an open curve
        expect(recognizeShape(arc)).toBeNull();
        expect(
            recognizeShape([
                { x: 0, y: 0 },
                { x: 2, y: 1 },
            ]),
        ).toBeNull();
    });

    it('reads the end point of each path command', () => {
        expect(pathPoints([['M', 1, 2], ['Q', 3, 4, 5, 6], ['L', 7, 8], ['Z']])).toEqual([
            { x: 1, y: 2 },
            { x: 5, y: 6 },
            { x: 7, y: 8 },
        ]);
    });
});
