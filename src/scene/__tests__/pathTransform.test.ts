import { describe, expect, it } from 'vitest';
import { capsule, circle, ellipse, smoothClosed } from '@/character/render/shapes';
import { transformPath } from '../render/pathTransform';
import type { Similarity } from '../render/placeActor';

/** End points of every command (absolute after the transform). */
const ends = (d: string): [number, number][] => {
    const out: [number, number][] = [];
    const re = /([MLQA])([^MLQAZ]*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(d))) {
        const n = m[2]
            .trim()
            .split(/[\s,]+/)
            .map(Number);
        out.push([n[n.length - 2], n[n.length - 1]]);
    }
    return out;
};

describe('transformPath', () => {
    const turn = (deg: number, s: number, tx: number, ty: number): Similarity => {
        const a = (deg * Math.PI) / 180;
        return [s * Math.cos(a), s * Math.sin(a), -s * Math.sin(a), s * Math.cos(a), tx, ty];
    };

    it('the identity keeps every point (relative arcs become absolute)', () => {
        const d = circle([10, 20], 5);
        const t = transformPath(d, [1, 0, 0, 1, 0, 0]);
        expect(t).not.toMatch(/[a-z]/);
        expect(ends(t)).toEqual([
            [5, 20],
            [15, 20],
            [5, 20],
        ]);
    });

    it('moves every point through the similarity and scales arc radii', () => {
        const m = turn(30, 2, 100, -40);
        const src = [
            smoothClosed([
                [0, 0],
                [10, 0],
                [10, 10],
                [0, 10],
            ]),
            ellipse([5, 5], 4, 2, 10),
            capsule([0, 0], 3, [0, 20], 2),
        ];
        for (const d of src) {
            const a = ends(transformPath(d, [1, 0, 0, 1, 0, 0]));
            const b = ends(transformPath(d, m));
            expect(b.length).toBe(a.length);
            a.forEach(([x, y], i) => {
                expect(b[i][0]).toBeCloseTo(m[0] * x + m[2] * y + m[4], 1);
                expect(b[i][1]).toBeCloseTo(m[1] * x + m[3] * y + m[5], 1);
            });
        }
        const arc = transformPath(ellipse([0, 0], 4, 2, 10), m).match(
            /A([\d.]+) ([\d.]+) ([-\d.]+)/,
        )!;
        expect(Number(arc[1])).toBeCloseTo(8, 1);
        expect(Number(arc[2])).toBeCloseTo(4, 1);
        expect(Number(arc[3])).toBeCloseTo(40, 1);
    });

    it('handles H, V, C and implicit line-tos after M', () => {
        const t = transformPath('M0 0 10 0H20V5C20 10 10 10 10 5z', [1, 0, 0, 1, 1, 1]);
        expect(t).toBe('M1 1L11 1L21 1L21 6C21 11 11 11 11 6Z');
    });
});

describe('transformPath hardening (fate-reviewer P3)', () => {
    it('ends on stray numbers after Z and reads upper-case exponents', () => {
        expect(transformPath('M0 0Z1 1', [1, 0, 0, 1, 0, 0])).toBe('M0 0Z');
        expect(transformPath('M1E1 0L0 0', [1, 0, 0, 1, 0, 0])).toBe('M10 0L0 0');
    });
});
