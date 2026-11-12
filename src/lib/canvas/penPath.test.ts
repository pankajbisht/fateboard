/** Pen tool geometry: anchors with optional bezier handles -> SVG path data. */
import { describe, expect, it } from 'vitest';
import {
    constrainAngle,
    mirrorHandle,
    pathToPenNodes,
    penPathData,
    reversePenNodes,
    simplifyPoints,
    smoothNodes,
} from './penPath';

describe('penPathData', () => {
    it('corner points make straight segments', () => {
        expect(
            penPathData([
                { x: 0, y: 0 },
                { x: 100, y: 0 },
                { x: 100, y: 50 },
            ]),
        ).toBe('M 0 0 L 100 0 L 100 50');
    });

    it('a point with handles makes cubic curves on both sides', () => {
        expect(
            penPathData([
                { x: 0, y: 0 },
                { x: 100, y: 0, in: { x: 80, y: -20 }, out: { x: 120, y: 20 } },
                { x: 200, y: 0 },
            ]),
        ).toBe('M 0 0 C 0 0 80 -20 100 0 C 120 20 200 0 200 0');
    });

    it('a closed path goes back to the first point and ends with Z', () => {
        expect(
            penPathData(
                [
                    { x: 0, y: 0 },
                    { x: 100, y: 0 },
                    { x: 50, y: 80 },
                ],
                true,
            ),
        ).toBe('M 0 0 L 100 0 L 50 80 L 0 0 Z');
    });

    it('no path for fewer than two points', () => {
        expect(penPathData([])).toBe('');
        expect(penPathData([{ x: 1, y: 2 }])).toBe('');
    });

    it('mirrorHandle gives the smooth opposite handle', () => {
        expect(mirrorHandle({ x: 10, y: 10 }, { x: 30, y: 0 })).toEqual({ x: -10, y: 20 });
    });
});

describe('constrainAngle (Shift)', () => {
    it('snaps to the nearest 45° and keeps the distance', () => {
        const p = constrainAngle({ x: 0, y: 0 }, { x: 100, y: 10 });
        expect(p.y).toBeCloseTo(0);
        expect(p.x).toBeCloseTo(Math.hypot(100, 10));

        const d = constrainAngle({ x: 10, y: 10 }, { x: 110, y: 100 });
        expect(d.x - 10).toBeCloseTo(d.y - 10); // 45°
    });

    it('a point on top of the origin stays put', () => {
        expect(constrainAngle({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual({ x: 5, y: 5 });
    });
});

describe('pathToPenNodes (continue a path)', () => {
    const id = (p: { x: number; y: number }) => p;

    it('reads lines and cubic curves back into anchors with handles', () => {
        const nodes = pathToPenNodes(
            [
                ['M', 0, 0],
                ['L', 100, 0],
                ['C', 120, 20, 180, 20, 200, 0],
            ],
            id,
        );
        expect(nodes).toEqual([
            { x: 0, y: 0 },
            { x: 100, y: 0, out: { x: 120, y: 20 } },
            { x: 200, y: 0, in: { x: 180, y: 20 } },
        ]);
        expect(penPathData(nodes!)).toBe('M 0 0 L 100 0 C 120 20 180 20 200 0');
    });

    it('maps every point (the object transform)', () => {
        const nodes = pathToPenNodes(
            [
                ['M', 0, 0],
                ['L', 10, 0],
            ],
            (p) => ({ x: p.x + 50, y: p.y * 2 }),
        );
        expect(nodes).toEqual([
            { x: 50, y: 0 },
            { x: 60, y: 0 },
        ]);
    });

    it('closed paths, several sub-paths and other commands cannot be continued', () => {
        expect(pathToPenNodes([['M', 0, 0], ['L', 10, 0], ['Z']], id)).toBeNull();
        expect(
            pathToPenNodes(
                [
                    ['M', 0, 0],
                    ['L', 10, 0],
                    ['M', 5, 5],
                    ['L', 9, 9],
                ],
                id,
            ),
        ).toBeNull();
        expect(
            pathToPenNodes(
                [
                    ['M', 0, 0],
                    ['Q', 5, 5, 10, 0],
                ],
                id,
            ),
        ).toBeNull();
        expect(pathToPenNodes([['M', 0, 0]], id)).toBeNull();
    });
});

describe('reversePenNodes', () => {
    it('reverses the order and swaps each in / out handle', () => {
        expect(
            reversePenNodes([
                { x: 0, y: 0, out: { x: 1, y: 1 } },
                { x: 10, y: 0, in: { x: 9, y: 1 } },
            ]),
        ).toEqual([
            { x: 10, y: 0, out: { x: 9, y: 1 } },
            { x: 0, y: 0, in: { x: 1, y: 1 } },
        ]);
    });
});

describe('smoothNodes (Curvature mode)', () => {
    const cross = (a: { x: number; y: number }, b: { x: number; y: number }) =>
        a.x * b.y - a.y * b.x;

    it('the curve passes through every point; a middle point gets a tangent parallel to its neighbours', () => {
        const nodes = smoothNodes([
            { x: 0, y: 0 },
            { x: 100, y: 50 },
            { x: 200, y: 0 },
        ]);
        expect(nodes.map(({ x, y }) => [x, y])).toEqual([
            [0, 0],
            [100, 50],
            [200, 0],
        ]);
        const mid = nodes[1];
        const t = { x: mid.out!.x - mid.in!.x, y: mid.out!.y - mid.in!.y };
        expect(cross(t, { x: 200, y: 0 })).toBeCloseTo(0); // parallel to (p2 - p0)
        expect(nodes[0].in).toBeUndefined(); // open path: no handle off the ends
        expect(nodes[2].out).toBeUndefined();
    });

    it('a corner point has no handles (a sharp turn)', () => {
        const nodes = smoothNodes([
            { x: 0, y: 0 },
            { x: 100, y: 50, corner: true },
            { x: 200, y: 0 },
        ]);
        expect(nodes[1].in).toBeUndefined();
        expect(nodes[1].out).toBeUndefined();
    });

    it('closed: every point is smooth, the ends too', () => {
        const nodes = smoothNodes(
            [
                { x: 0, y: 0 },
                { x: 100, y: 0 },
                { x: 50, y: 80 },
            ],
            true,
        );
        for (const n of nodes) {
            expect(n.in).toBeDefined();
            expect(n.out).toBeDefined();
        }
    });
});

describe('simplifyPoints (Freeform mode)', () => {
    it('a straight run collapses to its two ends', () => {
        const line = Array.from({ length: 20 }, (_, i) => ({ x: i * 5, y: 0.2 * (i % 2) }));
        expect(simplifyPoints(line, 1)).toEqual([line[0], line[19]]);
    });

    it('keeps the corner of an L', () => {
        const pts = [
            ...Array.from({ length: 10 }, (_, i) => ({ x: i * 10, y: 0 })),
            ...Array.from({ length: 10 }, (_, i) => ({ x: 90, y: (i + 1) * 10 })),
        ];
        expect(simplifyPoints(pts, 1)).toEqual([
            { x: 0, y: 0 },
            { x: 90, y: 0 },
            { x: 90, y: 100 },
        ]);
    });
});
