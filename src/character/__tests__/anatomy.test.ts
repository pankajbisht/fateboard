/**
 * The manga anatomy table (docs/CHARACTER_STUDIO.md): the numbers were measured from a reference figure drawing of a
 * man and a woman, as a share of the standing height H. Every check allows 15 % either way, so a change that moves the
 * body away from the reference fails here (the sizes are the skeleton's; the drawing follows them).
 */
import { describe, expect, it } from 'vitest';
import { RECIPES, fromRecipe } from '../data/recipes';
import { buildSkeleton } from '../rig/skeleton';
import { applyEdit } from '../studio/edit';

const body = (gender: 0 | 1) =>
    buildSkeleton(
        applyEdit(fromRecipe(RECIPES[gender ? 1 : 4], 'x'), {
            body: {
                bodyStyle: 'manga',
                mangaVariant: gender ? 'shojo' : 'shonen',
                age: 24,
                gender,
                muscle: gender ? 0.1 : 0.4,
                fat: 0.1,
            },
        }).body,
    );

/** [male, female] as a share of H, measured from the reference silhouette. */
// the measured reference figure, except the male waist and the female hips and thigh, which were set apart on
// purpose so the two bodies read differently (DECISIONS 2026-11-24)
const REF = {
    shoulderOuter: [0.266, 0.21],
    waist: [0.149, 0.115],
    hips: [0.19, 0.2],
    thigh: [0.087, 0.082],
    knee: [0.068, 0.05],
    neck: [0.06, 0.055],
    arm: [0.35, 0.34],
};
const near = (v: number, ref: number, what: string) => {
    expect(v, `${what}: ${v.toFixed(3)} vs ${ref}`).toBeGreaterThan(ref * 0.85);
    expect(v, `${what}: ${v.toFixed(3)} vs ${ref}`).toBeLessThan(ref * 1.15);
};

describe.each([
    ['male', 0],
    ['female', 1],
] as const)('manga %s against the reference figure', (name, g) => {
    const s = body(g);
    const H = s.height;
    it('shoulders, waist, hips and the neck', () => {
        near(
            (2 * (s.size.shoulderW * 0.46 + s.size.upperArm * 1.12)) / H,
            REF.shoulderOuter[g],
            `${name} shoulders`,
        );
        near((s.size.waistW * 0.8) / H, REF.waist[g], `${name} waist`);
        near(s.size.hipW / H, REF.hips[g], `${name} hips`);
        near((2 * s.size.neck) / H, REF.neck[g], `${name} neck`);
    });
    it('thigh and knee (the leg tapers)', () => {
        near((2 * s.size.thigh) / H, REF.thigh[g], `${name} thigh`);
        near((2 * s.size.knee) / H, REF.knee[g], `${name} knee`);
        expect(s.size.ankle).toBeLessThan(s.size.knee);
    });
    it('the arm ends at the crotch: shoulder joint to fingertip is about a third of the height', () => {
        near((s.upperArm + s.foreArm + s.hand) / H, REF.arm[g], `${name} arm`);
    });
    it('the legs begin at 43–48 % of the height (the crotch just under the hip joint)', () => {
        const hipJoint = s.pelvisHeight - 0.03 * H;
        expect(hipJoint / H).toBeGreaterThan(0.43);
        expect(hipJoint / H).toBeLessThan(0.52);
    });
});

describe('manga feet (figure-drawing convention: about one head long, a little less for a woman)', () => {
    it('a grown man’s foot is ~1 head, a woman’s ~0.9; the classic foot is unchanged', () => {
        for (const [g, want] of [
            [0, 1],
            [1, 0.88],
        ] as const) {
            const s = body(g);
            expect(s.foot / s.headHeight, String(g)).toBeCloseTo(want, 1);
        }
        const classic = buildSkeleton(
            applyEdit(fromRecipe(RECIPES[4], 'x'), { body: { bodyStyle: 'classic' } }).body,
        );
        expect(classic.foot / classic.height).toBeCloseTo(0.145, 3);
    });
});

describe('the female is slimmer than the male where the reference is', () => {
    it('narrower shoulders, waist and neck, thinner thigh', () => {
        const m = body(0);
        const f = body(1);
        expect(f.size.shoulderW / f.height).toBeLessThan(m.size.shoulderW / m.height);
        expect(f.size.waistW / f.height).toBeLessThan(m.size.waistW / m.height);
        expect(f.size.neck / f.height).toBeLessThan(m.size.neck / m.height);
        expect(f.size.thigh / f.height).toBeLessThan(m.size.thigh / m.height);
        // and the waist is narrower than the hips by more than for the man
        expect((f.size.waistW * 0.8) / f.size.hipW).toBeLessThan(
            (m.size.waistW * 0.8) / m.size.hipW,
        );
    });
});
