/**
 * The classic body (docs/CHARACTER_STUDIO.md, manga look). New characters are manga, so the tests that start from a
 * recipe draw the manga body; saved characters still open as classic. This file keeps the classic body covered:
 * every pose, outfit and held item draws finite from several sides, pair poses still land the hands, and the
 * hands-in-pockets pose hides the hands in a pocket on the classic body too.
 */
import { describe, expect, it } from 'vitest';
import { OUTFITS } from '../data/outfits';
import { POSES, poseById } from '../data/poses';
import { PROP_IDS } from '../data/props';
import { RECIPES, fromRecipe } from '../data/recipes';
import { renderCharacter } from '../render/renderCharacter';
import { applyEdit } from '../studio/edit';
import type { Character } from '../schema/types';
import { PAIR_POSES } from '@/scene/layout/pairPoseDefs';
import { applyPairPose } from '@/scene/layout/pairPoses';
import { newScene } from '@/scene/schema/parse';

const cam = (yaw: number) => ({ yaw, pitch: 0, roll: 0, shot: 'full' as const });
const classic = (r: number, extra = {}) =>
    applyEdit(fromRecipe(RECIPES[r], `c${r}`), { body: { bodyStyle: 'classic' }, ...extra });
const finite = (c: Character, yaws: number[], label: string) => {
    for (const yaw of yaws)
        for (const p of renderCharacter(c, cam(yaw)).parts)
            expect(/NaN|Infinity/.test(p.d), `${label} ${yaw} ${p.key}`).toBe(false);
};
const nums = (d: string) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
const span = (d: string, odd: 0 | 1) => {
    const v = nums(d).filter((_, k) => k % 2 === odd);
    return { lo: Math.min(...v), hi: Math.max(...v), mid: (Math.min(...v) + Math.max(...v)) / 2 };
};

describe('classic body coverage', () => {
    it('every pose draws finite from four sides', () => {
        const c = classic(4);
        for (const pose of POSES) finite(applyEdit(c, { pose }), [0, 90, 180, 300], pose.id);
    }, 60000);

    it('every outfit and every held item draws finite', () => {
        const c = classic(1);
        for (const o of OUTFITS)
            finite(
                applyEdit(c, {
                    top: o.dress.top,
                    bottom: o.dress.bottom,
                    shoes: o.dress.shoes,
                    accessories: o.dress.accessories,
                }),
                [20, 200],
                o.id,
            );
        for (const kind of PROP_IDS)
            finite(applyEdit(c, { held: [{ kind, hand: 'R' }] }), [30], kind);
    }, 60000);

    it('pair poses land the hands within 1.5 cm on classic bodies', () => {
        const actor = (id: string, r: number, x: number) => ({
            id,
            character: classic(r),
            x,
            z: 0,
            facing: 0,
            lookAt: null,
        });
        const misses: string[] = [];
        for (const p of PAIR_POSES)
            for (const [a, b] of [
                [8, 1],
                [3, 2],
            ]) {
                const s = { ...newScene(), actors: [actor('a', a, -60), actor('b', b, 60)] };
                const { errors } = applyPairPose(s, 'a', 'b', p.id);
                errors.forEach(
                    (e, i) => e > 1.5 && misses.push(`${p.id} ${a}+${b} #${i}: ${e.toFixed(1)}`),
                );
            }
        expect(misses).toEqual([]);
    }, 120000);
});

describe('hands in pockets on the classic body', () => {
    const pockets = poseById('manga-pockets')!;

    it('hides the fingers and draws the pocket patch and opening', () => {
        const keys = renderCharacter(classic(4, { pose: pockets }), cam(20)).parts.map(
            (p) => p.key,
        );
        expect(keys).toContain('handL-pocket');
        expect(keys).toContain('handR-pocket-slit');
        expect(keys.some((k) => /^hand[LR]-(f\d|t\d|fist|mitten|palm)/.test(k))).toBe(false);
    });

    it('the patch sits at the side of the hip, not down the thigh, for a child, a teen and two adults', () => {
        for (const [r, age] of [
            [0, 16],
            [4, 25],
            [1, 25],
            [8, 25],
        ] as const) {
            const c = applyEdit(classic(r), { body: { age }, pose: pockets });
            const m = renderCharacter(c, cam(0));
            const hips = m.parts.find((p) => p.key === 'hips')!.d;
            const patch = m.parts.find((p) => p.key === 'handL-pocket')!.d;
            const hx = span(hips, 0);
            const hy = span(hips, 1);
            const px = span(patch, 0);
            const py = span(patch, 1);
            const w = hx.hi - hx.lo;
            const h = hy.hi - hy.lo;
            expect(px.mid, c.name).toBeGreaterThan(hx.lo - w * 0.6);
            expect(px.mid, c.name).toBeLessThan(hx.hi + w * 0.6);
            // y grows downward: the patch centre is within the hips' height (plus half of it below)
            expect(py.mid, c.name).toBeGreaterThan(hy.lo);
            expect(py.mid, c.name).toBeLessThan(hy.hi + h * 0.5);
        }
    });
});
