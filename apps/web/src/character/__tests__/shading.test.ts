// @vitest-environment node
/**
 * Style packs (S1, docs/CHARACTER_STUDIO.md §7.3): shading drawn as shapes. A part's shadow is the part
 * minus itself shifted toward the light: a crescent that always stays inside the outline (so it survives on the
 * page, where SVG filters do not).
 */
import { describe, expect, it } from 'vitest';
import { capsulePoly, crescent, hull, insideConvex, smoothClosed, type P2 } from '../render/shapes';

const square: P2[] = hull([
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
]);
const area = (p: P2[]) =>
    Math.abs(
        p.reduce(
            (a, [x, y], i) => a + x * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * y,
            0,
        ),
    ) / 2;

describe('shapes for shading', () => {
    it('insideConvex knows inside, edge and outside', () => {
        expect(insideConvex(square, [5, 5])).toBe(true);
        expect(insideConvex(square, [10, 5])).toBe(true);
        expect(insideConvex(square, [11, 5])).toBe(false);
    });

    it('a crescent is the part minus its shifted copy, inside the part', () => {
        const c = crescent(square, [-3, 0])!; // light from the left: shadow on the right
        for (const p of c) expect(insideConvex(square, p)).toBe(true);
        expect(area(c)).toBeCloseTo(30, 5); // a 3 × 10 strip on the right
        expect(Math.min(...c.map(([x]) => x))).toBeCloseTo(7, 5);
    });

    it('no shift: no shadow; a shift past the part: all shadow', () => {
        expect(crescent(square, [0, 0])).toBeNull();
        expect(area(crescent(square, [30, 0])!)).toBeCloseTo(100, 5);
    });

    it('works for a capsule (limb) polygon at any angle', () => {
        const limb = capsulePoly([0, 0], 4, [20, 12], 3);
        for (const t of [
            [-2, -2],
            [2, 0],
            [0, 3],
        ] as P2[]) {
            const c = crescent(limb, t)!;
            expect(c.length).toBeGreaterThan(3);
            for (const p of c) expect(insideConvex(limb, p, 1e-6)).toBe(true);
            expect(area(c)).toBeLessThan(area(limb));
        }
    });

    it('smoothClosed draws any closed outline, convex or not', () => {
        const d = smoothClosed([
            [0, 0],
            [10, 0],
            [5, 3],
            [10, 10],
            [0, 10],
        ]);
        expect(d.startsWith('M')).toBe(true);
        expect(d.endsWith('Z')).toBe(true);
        expect((d.match(/Q/g) ?? []).length).toBe(5);
    });
});

// fate-reviewer (2026-11-18): exact area checks on irregular shapes (a coarse hull whose corners all miss the
// shifted copy used to be shaded whole)
describe('crescent area is exactly the part minus the overlap', () => {
    /** Sutherland–Hodgman: convex S clipped by convex C (both counter-clockwise from hull). */
    const clip = (S: P2[], C: P2[]): P2[] => {
        let out = S;
        for (let i = 0; i < C.length && out.length; i++) {
            const a = C[i];
            const b = C[(i + 1) % C.length];
            const side = (p: P2) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
            const input = out;
            out = [];
            for (let j = 0; j < input.length; j++) {
                const p = input[j];
                const q = input[(j + 1) % input.length];
                const sp = side(p);
                const sq = side(q);
                if (sp >= 0) out.push(p);
                if (sp >= 0 !== sq >= 0) {
                    const t = sp / (sp - sq);
                    out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
                }
            }
        }
        return out;
    };
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    it('on 3000 random convex shapes and shifts', () => {
        for (let k = 0; k < 3000; k++) {
            const n = 3 + Math.floor(rnd() * 12);
            const S = hull(Array.from({ length: n }, () => [rnd() * 20, rnd() * 12] as P2));
            if (S.length < 3 || area(S) < 1) continue;
            const t: P2 = [(rnd() - 0.5) * 14, (rnd() - 0.5) * 14];
            const T = S.map(([x, y]) => [x + t[0], y + t[1]] as P2);
            const expected = area(S) - area(clip(S, T));
            const c = crescent(S, t);
            const got = c ? area(c) : 0;
            expect(Math.abs(got - expected), `case ${k}`).toBeLessThan(1e-6 * area(S) + 1e-9);
        }
    });

    it('a coarse shape whose corners all miss the copy is not shaded whole', () => {
        // a wide flat cap shifted up: the copy pokes in through the long bottom edge only
        const S = hull([
            [0, 0],
            [20, 0],
            [18, 6],
            [2, 6],
            [10, 7],
        ]);
        const c = crescent(S, [0, -3])!;
        expect(area(c)).toBeLessThan(area(S) * 0.9);
    });
});
