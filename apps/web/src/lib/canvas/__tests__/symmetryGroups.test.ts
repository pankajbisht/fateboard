// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { applyToPoint, symmetryGuides, symmetryMatrices, symmetryPlan } from '../symmetry';
import { MAX_COPIES, expandChain, newChainStep, wallpaper } from '../symmetryGroups';
import { isMirror, scaleOf } from '../symmetryMath';
import { boxTargets, frameOfBox, frameOfPin, snapAngle, snapPoint } from '../symmetryFrame';

const c = { x: 100, y: 50 };
const near = (p: { x: number; y: number }, x: number, y: number) => {
    expect(p.x).toBeCloseTo(x, 5);
    expect(p.y).toBeCloseTo(y, 5);
};

describe('new symmetry modes', () => {
    it('glide: copy k mirrors when k is odd and slides k · shift along the axis', () => {
        const [g1, g2] = symmetryMatrices('glide', c, 0, 3, { glideShift: 40 });
        near(applyToPoint(g1, { x: 100, y: 40 }), 140, 60); // mirrored across y = 50, slid 40
        near(applyToPoint(g2, { x: 100, y: 40 }), 180, 40); // two glides = a plain slide
        expect(isMirror(g1)).toBe(true);
        expect(isMirror(g2)).toBe(false);
    });

    it('spiral: copy k turns k · turn and scales by scale^k about the centre', () => {
        const m = symmetryMatrices('spiral', c, 90, 4, { spiralTurn: 90, spiralScale: 0.5 });
        expect(m).toHaveLength(3);
        near(applyToPoint(m[0], { x: 120, y: 50 }), 100, 60); // 20 right → 10 down
        expect(scaleOf(m[2])).toBeCloseTo(0.125, 6);
    });

    it('wallpaper: point group × lattice, nearest cells kept under the cap', () => {
        expect(wallpaper('p1', c, 100, 1)).toHaveLength(8); // 3 × 3 cells minus the original
        expect(wallpaper('p4m', c, 100, 1)).toHaveLength(9 * 8 - 1);
        const plan = symmetryPlan('wallpaper', c, 90, 6, { wallpaper: 'p6m', tileReach: 4 });
        expect(plan.wanted).toBe(81 * 12 - 1);
        expect(plan.matrices).toHaveLength(MAX_COPIES);
        // the kept copies are the nearest ones: none further than 4 cells
        for (const m of plan.matrices) {
            const p = applyToPoint(m, c);
            expect(Math.hypot(p.x - c.x, p.y - c.y)).toBeLessThan(200 * 4.01);
        }
    });

    it('frame rotation turns a mode about the centre (a 90° frame turns left-right into top-bottom)', () => {
        const [m] = symmetryMatrices('x', c, 90, 6, { rotation: 90 });
        near(applyToPoint(m, { x: 100, y: 30 }), 100, 70);
    });

    it('guides follow the frame and exist for every new mode', () => {
        const [axis] = symmetryGuides('x', c, 90, 6, 10, { rotation: 90 });
        expect(Math.abs(axis.a.y - axis.b.y)).toBeCloseTo(0, 6);
        for (const mode of ['glide', 'spiral', 'wallpaper'] as const)
            expect(symmetryGuides(mode, c, 0, 6, 500).length).toBeGreaterThan(0);
    });
});

describe('mirror chain', () => {
    const step = (kind: Parameters<typeof newChainStep>[0], patch = {}) => ({
        ...newChainStep(kind, kind),
        ...patch,
    });

    it('a mirror then a 6-fold turn makes 12 pieces (11 copies); order is kept', () => {
        const m = expandChain([step('mirror'), step('rotate', { count: 6 })], () => c);
        expect(m).toHaveLength(11);
        expect(m.filter(isMirror)).toHaveLength(6);
    });

    it('disabled steps do nothing; duplicates are dropped', () => {
        const m = expandChain(
            [step('mirror'), step('mirror'), step('rotate', { enabled: false })],
            () => c,
        );
        expect(m).toHaveLength(1);
    });

    it('steps can use their own centre (page centre and a pin together)', () => {
        const pin = { x: 300, y: 50 };
        const steps = [step('mirror'), { ...step('mirror'), id: 'p', pinId: 'pin' }];
        const m = symmetryMatrices('chain', c, 90, 6, {
            chain: steps,
            pinCenter: (id) => (id === 'pin' ? pin : null),
        });
        // mirror at x = 100, mirror at x = 300, and both = a slide of 400
        const xs = m.map((mm) => applyToPoint(mm, { x: 120, y: 0 }).x).sort((a, b) => a - b);
        expect(xs.map(Math.round)).toEqual([80, 480, 520].sort((a, b) => a - b));
    });

    it('depth repeats the chain (hall of mirrors) and stops at the cap', () => {
        const hall = [step('translate', { count: 2, shift: 50, scale: 0.8 })];
        expect(expandChain(hall, () => c, 1)).toHaveLength(1);
        expect(expandChain(hall, () => c, 4)).toHaveLength(4);
        const huge = [step('rotate', { count: 64 }), step('translate', { count: 64, shift: 10 })];
        expect(expandChain(huge, () => c, 1).length).toBeLessThanOrEqual(MAX_COPIES + 1);
    });
});

describe('symmetry sources', () => {
    const box = { cx: 100, cy: 100, width: 80, height: 40, angle: 0 };

    it('edges put the axis through the edge midpoint', () => {
        near(frameOfBox(box, 'left').center, 60, 100);
        near(frameOfBox(box, 'bottom').center, 100, 120);
        expect(frameOfBox(box, 'center').rotation).toBe(0);
    });

    it('a rotated box turns its edges and its frame', () => {
        const f = frameOfBox({ ...box, angle: 90 }, 'right');
        near(f.center, 100, 140);
        expect(f.rotation).toBe(90);
    });

    it('diagonal runs corner to corner; anchor uses the anchor point', () => {
        const f = frameOfBox({ ...box, width: 100, height: 100 }, 'diagonal');
        const [m] = symmetryMatrices('x', f.center, 90, 6, { rotation: f.rotation });
        near(applyToPoint(m, { x: 150, y: 100 }), 100, 150); // mirrors across y = x through the centre
        near(frameOfBox({ ...box, anchor: { x: 1, y: 2 } }, 'anchor').center, 1, 2);
    });

    it('a pin frame aligns left-right mirroring with the pin axis', () => {
        const f = frameOfPin({ id: 'a', name: 'A', x: 10, y: 20, angle: 0 });
        const [m] = symmetryMatrices('x', f.center, 90, 6, { rotation: f.rotation });
        near(applyToPoint(m, { x: 10, y: 0 }), 10, 40); // horizontal axis through the pin
    });

    it('snaps angles to 15° and points to nearby targets', () => {
        expect(snapAngle(52)).toBe(45);
        expect(snapAngle(-6)).toBe(0);
        expect(snapAngle(-8)).toBe(-15);
        expect(snapPoint({ x: 63, y: 101 }, boxTargets(box), 5)).toEqual({
            point: { x: 60, y: 100 },
            snapped: true,
        });
        expect(snapPoint({ x: 0, y: 0 }, boxTargets(box), 5).snapped).toBe(false);
    });
});
