// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
    applyToPoint,
    multiply,
    reflection,
    rotation,
    symmetryGuides,
    symmetryMatrices,
} from '../symmetry';

const c = { x: 100, y: 50 };
const near = (p: { x: number; y: number }, x: number, y: number) => {
    expect(p.x).toBeCloseTo(x, 6);
    expect(p.y).toBeCloseTo(y, 6);
};

describe('symmetry matrices', () => {
    it('mirror x flips left <-> right about the centre, y flips top <-> bottom', () => {
        const [mx] = symmetryMatrices('x', c);
        near(applyToPoint(mx, { x: 130, y: 70 }), 70, 70);
        const [my] = symmetryMatrices('y', c);
        near(applyToPoint(my, { x: 130, y: 70 }), 130, 30);
    });

    it('both = 4-way: three copies (two mirrors and a half turn)', () => {
        const out = symmetryMatrices('both', c).map((m) => applyToPoint(m, { x: 110, y: 60 }));
        expect(out).toHaveLength(3);
        near(out[0], 90, 60);
        near(out[1], 110, 40);
        near(out[2], 90, 40);
    });

    it('mirror across a 45° axis swaps the offsets', () => {
        const [m] = symmetryMatrices('angle', { x: 0, y: 0 }, 45);
        near(applyToPoint(m, { x: 10, y: 0 }), 0, 10);
    });

    it('radial N makes N-1 turns; point symmetry is a half turn', () => {
        const radial = symmetryMatrices('radial', { x: 0, y: 0 }, 90, 4);
        expect(radial).toHaveLength(3);
        near(applyToPoint(radial[0], { x: 10, y: 0 }), 0, 10); // 90° clockwise on screen
        const [point] = symmetryMatrices('point', c);
        near(applyToPoint(point, { x: 110, y: 60 }), 90, 40);
    });

    it('kaleido N = N-1 turns + N mirrors, and every copy keeps distances to the centre', () => {
        const k = symmetryMatrices('kaleido', c, 90, 6);
        expect(k).toHaveLength(11);
        for (const m of k) {
            const p = applyToPoint(m, { x: 140, y: 20 });
            expect(Math.hypot(p.x - c.x, p.y - c.y)).toBeCloseTo(50, 6);
        }
    });

    it('clamps the count and has no copies for none', () => {
        expect(symmetryMatrices('radial', c, 90, 99)).toHaveLength(63);
        expect(symmetryMatrices('radial', c, 90, 0)).toHaveLength(5);
        expect(symmetryMatrices('none', c)).toEqual([]);
    });

    it('a mirror applied twice is the identity; rotations compose', () => {
        const m = reflection(c, 30);
        near(applyToPoint(multiply(m, m), { x: 7, y: 9 }), 7, 9);
        const r = multiply(rotation(c, 90), rotation(c, 90));
        near(applyToPoint(r, { x: 110, y: 50 }), 90, 50);
    });

    it('draws guides: axes for mirrors, spokes for turns', () => {
        expect(symmetryGuides('both', c)).toHaveLength(2);
        expect(symmetryGuides('radial', c, 90, 5)).toHaveLength(5);
        expect(symmetryGuides('none', c)).toEqual([]);
    });
});
