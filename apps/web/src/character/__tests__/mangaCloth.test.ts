// @vitest-environment node
/**
 * Hanging cloth on the manga body (docs/CHARACTER_STUDIO.md, manga cloth): long tops (coats, kurtas, tunics) and skirts
 * hang from the waist as one lofted shape that follows the hips and flares toward the hem, instead of a round convex
 * blob that ballooned out at the waist and left a band of trousers showing above it.
 */
import { describe, expect, it } from 'vitest';
import { OUTFITS } from '../data/outfits';
import { poseById } from '../data/poses';
import { RECIPES, fromRecipe } from '../data/recipes';
import { renderCharacter } from '../render/renderCharacter';
import { applyEdit } from '../studio/edit';

const cam = (yaw: number) => ({ yaw, pitch: 0, roll: 0, shot: 'full' as const });
const nums = (d: string) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
const box = (d: string) => {
    const n = nums(d);
    const xs = n.filter((_, i) => i % 2 === 0);
    const ys = n.filter((_, i) => i % 2 === 1);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};
const wearing = (outfit: string, bodyStyle: 'manga' | 'classic' = 'manga', r = 3) => {
    const o = OUTFITS.find((x) => x.id === outfit)!.dress;
    return applyEdit(fromRecipe(RECIPES[r], 'x'), {
        top: o.top,
        bottom: o.bottom,
        shoes: o.shoes,
        accessories: o.accessories,
        pose: poseById('stand')!,
        body: { bodyStyle },
    });
};

describe('hanging cloth on the manga body', () => {
    for (const [outfit, key] of [
        ['work-doctor', 'tunic'],
        ['traditional-lehenga', 'skirt'],
    ] as const)
        it(`${outfit}: the ${key} starts at the waist and hangs as an A-line`, () => {
            for (const r of [1, 3, 4]) {
                const m = renderCharacter(wearing(outfit, 'manga', r), cam(0));
                const hang = box(m.parts.find((p) => p.key === key)!.d);
                const torso = box(m.parts.find((p) => p.key === 'torso')!.d);
                const hips = box(m.parts.find((p) => p.key === 'hips')!.d);
                // no gap: the hang begins at or above the bottom of the top (y grows downward)
                expect(hang.y0, `${outfit} ${r} gap`).toBeLessThanOrEqual(torso.y1 + 0.5);
                // an A-line, not a sack: in five bands from the top, the width never shrinks by more than a little,
                // and the hem is the widest part
                const n = nums(m.parts.find((p) => p.key === key)!.d);
                const pts = n.flatMap((v, i) => (i % 2 === 0 ? [[v, n[i + 1]]] : []));
                const widths = [0, 1, 2, 3, 4].map((band) => {
                    const lo = hang.y0 + ((hang.y1 - hang.y0) * band) / 5;
                    const xs = pts
                        .filter((p) => p[1] >= lo && p[1] <= lo + (hang.y1 - hang.y0) / 5)
                        .map((p) => p[0]);
                    return xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
                });
                for (let i = 2; i < 5; i++)
                    expect(widths[i], `${outfit} ${r} band ${i}`).toBeGreaterThanOrEqual(
                        widths[i - 1] * 0.92,
                    );
                expect(Math.max(...widths), `${outfit} ${r} hem`).toBeLessThanOrEqual(
                    widths[4] * 1.05,
                );
                // it covers the hips in its upper part (the widest of the top three bands: a band can fall between
                // outline points)
                expect(Math.max(...widths.slice(0, 3)), `${outfit} ${r} hips`).toBeGreaterThan(
                    (hips.x1 - hips.x0) * 0.85,
                );
            }
        });

    it('the hang covers the trousers at the waist: no band of trouser colour across a coat or kurta', () => {
        for (const outfit of ['work-doctor', 'traditional-lehenga', 'school-school-uniform']) {
            const parts = renderCharacter(wearing(outfit), cam(0)).parts;
            const hang = parts.find((p) => p.key === 'tunic' || p.key === 'skirt');
            if (!hang) continue;
            const hips = box(parts.find((p) => p.key === 'hips')!.d);
            // y grows downward: the hang starts no lower than the trousers do
            expect(box(hang.d).y0, outfit).toBeLessThanOrEqual(hips.y0 + 0.2);
        }
    });

    it('has contour lines on the sides and a hem line, finite from every side', () => {
        for (const yaw of [0, 45, 90, 180, 270]) {
            const parts = renderCharacter(wearing('work-doctor'), cam(yaw)).parts;
            const tunic = parts.find((p) => p.key === 'tunic')!;
            expect(tunic.stroke, String(yaw)).toBeNull();
            expect(
                parts.some((p) => p.key === 'tunic-hem'),
                String(yaw),
            ).toBe(true);
            for (const p of parts) expect(/NaN|Infinity/.test(p.d), `${yaw} ${p.key}`).toBe(false);
        }
    });

    it('the classic body keeps its hanging shells', () => {
        const parts = renderCharacter(wearing('work-doctor', 'classic'), cam(0)).parts;
        expect(parts.some((p) => p.key === 'tunic')).toBe(true);
        expect(parts.some((p) => p.key === 'tunic-hem')).toBe(false);
    });
});

describe('necklines (both bodies)', () => {
    it('a shirt neckline is a sharp V of skin with two edge lines, not an outlined teardrop', () => {
        for (const bodyStyle of ['manga', 'classic'] as const) {
            const parts = renderCharacter(wearing('work-doctor', bodyStyle), cam(0)).parts;
            const v = parts.find((p) => p.key === 'neckline')!;
            expect(v.d, bodyStyle).not.toMatch(/[QCA]/);
            expect(v.layers?.length ?? 0, bodyStyle).toBe(0);
            expect(
                parts.some((p) => p.key === 'neckline-v'),
                bodyStyle,
            ).toBe(true);
        }
    });
});

describe('sleeves and short trouser legs sit on the limb they cover', () => {
    it('a T-shirt sleeve is drawn in front of its upper arm on both arms, both bodies, from every side', () => {
        for (const bodyStyle of ['manga', 'classic'] as const)
            for (const pose of ['manga-idle', 'stand', 'wave'])
                for (const yaw of [0, 30, 90, 180, 270, 330]) {
                    const c = applyEdit(fromRecipe(RECIPES[4], 'x'), {
                        top: { kind: 'tshirt' },
                        pose: poseById(pose)!,
                        body: { bodyStyle },
                    });
                    const parts = renderCharacter(c, cam(yaw)).parts;
                    for (const s of ['L', 'R']) {
                        const arm = parts.find((p) => p.key === `upperArm${s}`);
                        const sleeve = parts.find((p) => p.key === `upperArm${s}-sleeve`);
                        if (!arm || !sleeve) continue;
                        expect(sleeve.depth, `${bodyStyle} ${pose} ${yaw} ${s}`).toBeGreaterThan(
                            arm.depth,
                        );
                    }
                }
    });
});

describe('a bent limb paints its lower bone over the whole limb', () => {
    it('shorts: a single-shape leg draws its shin (skin) over its thigh (cloth), in every pose and from every side', () => {
        const poses = ['manga-idle', 'stand', 'walk-a', 'run-a', 'sit-chair', 'kneel'];
        for (const pose of poses)
            for (const yaw of [0, 45, 90, 180, 270, 315]) {
                const c = applyEdit(fromRecipe(RECIPES[4], 'x'), {
                    bottom: { kind: 'shorts' },
                    pose: poseById(pose)!,
                });
                const parts = renderCharacter(c, cam(yaw)).parts;
                for (const s of ['L', 'R']) {
                    // a sharply bent leg is two capsules, each at its own depth (the nearer bone in front): no rule
                    if (parts.some((p) => p.key === `leg${s}-contour-back`)) continue;
                    const thigh = parts.find((p) => p.key === `upperLeg${s}`)!;
                    const shin = parts.find((p) => p.key === `lowerLeg${s}`)!;
                    expect(shin.depth, `${pose} ${yaw} ${s}`).toBeGreaterThan(thigh.depth);
                }
            }
    });
});

describe('loose cloth on manga limbs', () => {
    it('jeans and a hoodie widen the limb itself: no capsule overlays segmenting the legs and arms', () => {
        const c = applyEdit(fromRecipe(RECIPES[4], 'x'), {
            top: { kind: 'hoodie' },
            bottom: { kind: 'jeans' },
            pose: poseById('stand')!,
        });
        const keys = renderCharacter(c, cam(0)).parts.map((p) => p.key);
        for (const k of [
            'upperLegL-cloth',
            'lowerLegL-cloth',
            'upperArmL-sleeve',
            'lowerArmL-sleeve',
        ])
            expect(keys, k).not.toContain(k);
        expect(keys).not.toContain('lowerLegL-kneecap');
        // the loose cloth is wider than the bare limb
        const width = (bottom: 'jeans' | 'leggings') => {
            const d = renderCharacter(
                applyEdit(c, { bottom: { kind: bottom } }),
                cam(0),
            ).parts.find((p) => p.key === 'upperLegL')!.d;
            const xs = (d.match(/-?\d+(?:\.\d+)?/g) ?? [])
                .map(Number)
                .filter((_, i) => i % 2 === 0);
            return Math.max(...xs) - Math.min(...xs);
        };
        expect(width('jeans')).toBeGreaterThan(width('leggings'));
    });
});
