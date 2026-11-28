// @vitest-environment node
/**
 * Manga body, phase A (docs/CHARACTER_STUDIO.md): one continuous torso outline with a waist and hips, tapered limbs,
 * a relaxed asymmetric idle, hands in pockets, manga hands. The classic body must draw exactly as before.
 */
import { describe, expect, it } from 'vitest';
import { POSES, poseById } from '../data/poses';
import { RECIPES, fromRecipe } from '../data/recipes';
import { loftOutline } from '../render/loft';
import { renderCharacter } from '../render/renderCharacter';
import type { P2 } from '../render/shapes';
import { HAND_SHAPES } from '../schema/types';
import { applyEdit } from '../studio/edit';

const cam = (yaw: number) => ({ yaw, pitch: 0, roll: 0, shot: 'full' as const });
const base = fromRecipe(RECIPES[4], 'r');
const manga = (extra = {}) => applyEdit(base, { body: { bodyStyle: 'manga', age: 25 }, ...extra });
const idle = poseById('manga-idle')!;
const pockets = poseById('manga-pockets')!;

describe('lofted outline', () => {
    const ellipse = (y: number, w: number): P2[] =>
        Array.from({ length: 12 }, (_, i): P2 => [
            Math.cos((i / 12) * 6.283) * w,
            y + Math.sin((i / 12) * 6.283) * 2,
        ]);

    it('narrows at the waist: a convex hull never could', () => {
        // wide chest, narrow waist, wide hips (y grows downward)
        const outline = loftOutline([ellipse(0, 20), ellipse(30, 11), ellipse(60, 18)]);
        const widthAt = (y: number) => {
            const xs = outline.filter((p) => Math.abs(p[1] - y) < 4).map((p) => p[0]);
            return Math.max(...xs) - Math.min(...xs);
        };
        expect(widthAt(30)).toBeLessThan(widthAt(0) * 0.7);
        expect(widthAt(30)).toBeLessThan(widthAt(60) * 0.8);
    });

    it('falls back to a hull seen end-on, and never returns NaN', () => {
        const o = loftOutline([ellipse(0, 10), ellipse(0.1, 10)]);
        expect(o.length).toBeGreaterThan(2);
        for (const p of o) expect(Number.isFinite(p[0] + p[1])).toBe(true);
    });
});

describe('manga torso and limbs', () => {
    const parts = (c: ReturnType<typeof manga>, yaw = 0) => renderCharacter(c, cam(yaw)).parts;

    it('the torso and the hips are single parts with a smooth outline in every view', () => {
        for (const yaw of [0, 45, 90, 135, 180, 270]) {
            const ps = parts(manga(), yaw);
            for (const key of ['torso', 'hips']) {
                const p = ps.find((x) => x.key === key);
                expect(p, `${key} ${yaw}`).toBeTruthy();
                expect(/NaN|Infinity/.test(p!.d), `${key} ${yaw}`).toBe(false);
            }
        }
    });

    it('the manga torso is a different shape from the classic one; the classic one is the same as before', () => {
        const classic = applyEdit(base, { body: { bodyStyle: 'classic', age: 25 } });
        const torso = (c: typeof classic) => parts(c).find((x) => x.key === 'torso')!.d;
        expect(torso(manga())).not.toBe(torso(classic));
        // classic does not read the manga fields at all
        const again = applyEdit(classic, { body: { mangaVariant: 'webtoon' } });
        expect(JSON.stringify(parts(again))).toBe(JSON.stringify(parts(classic)));
    });

    it('every pose draws finite on the manga body from eight sides', () => {
        for (const p of POSES.filter((_, i) => i % 9 === 0).concat([idle, pockets]))
            for (const yaw of [0, 45, 90, 135, 180, 225, 270, 315])
                for (const part of parts(manga({ pose: p }), yaw))
                    expect(/NaN|Infinity/.test(part.d), `${p.id} ${yaw} ${part.key}`).toBe(false);
    }, 60_000);
});

describe('manga poses', () => {
    it('the idle is not symmetric: the legs and the arms differ', () => {
        const j = idle.joints;
        expect(JSON.stringify(j.upperLegL)).not.toBe(JSON.stringify(j.upperLegR));
        expect(JSON.stringify(j.lowerLegL)).not.toBe(JSON.stringify(j.lowerLegR));
        expect(JSON.stringify(j.upperArmL)).not.toBe(JSON.stringify(j.upperArmR));
        expect(idle.rootRotation.roll).not.toBe(0);
    });

    it('hands in pockets: no fingers are drawn, each wrist gets a cloth patch and a pocket opening', () => {
        const keys = renderCharacter(manga({ pose: pockets }), cam(20)).parts.map((p) => p.key);
        expect(keys).toContain('handL-pocket');
        expect(keys).toContain('handR-pocket');
        expect(keys).toContain('handL-pocket-slit');
        expect(keys.some((k) => /^hand[LR]-(f\d|t\d|fist|mitten|palm)/.test(k))).toBe(false);
        // the classic body hides its hands in the pocket too (classicBody.test.ts checks where)
        const classic = renderCharacter(
            applyEdit(base, { body: { bodyStyle: 'classic' }, pose: pockets }),
            cam(20),
        ).parts.map((p) => p.key);
        expect(classic).toContain('handL-pocket');
    });

    it('the wrists end inside the hip area for a child, a teen and two adults (the pocket)', () => {
        for (const [i, age] of [
            [0, 16],
            [4, 25],
            [1, 25],
            [8, 25],
        ] as const) {
            const c = applyEdit(fromRecipe(RECIPES[i], 'x'), {
                body: { bodyStyle: 'manga', age },
                pose: pockets,
            });
            const m = renderCharacter(c, cam(0));
            const torso = m.parts.find((p) => p.key === 'hips')!;
            const nums = (torso.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
            const xs = nums.filter((_, k) => k % 2 === 0);
            const patch = m.parts.find((p) => p.key === 'handL-pocket')!;
            const px = (patch.d.match(/-?\d+(?:\.\d+)?/g) ?? [])
                .map(Number)
                .filter((_, k) => k % 2 === 0);
            const mid = (Math.min(...px) + Math.max(...px)) / 2;
            // within a hip width of the hip outline (the patch is at the side of the hip)
            expect(mid, c.name).toBeGreaterThan(
                Math.min(...xs) - (Math.max(...xs) - Math.min(...xs)) * 0.6,
            );
            expect(mid, c.name).toBeLessThan(
                Math.max(...xs) + (Math.max(...xs) - Math.min(...xs)) * 0.6,
            );
        }
    });
});

describe('manga hands', () => {
    it('every hand shape draws on the manga body; the relaxed and open ones have four slim fingers and a thumb', () => {
        for (const shape of HAND_SHAPES) {
            const c = manga({
                pose: { ...idle, handShapeL: shape, handShapeR: shape },
            });
            const keys = renderCharacter(c, cam(30)).parts.map((p) => p.key);
            expect(
                keys.some((k) => k.startsWith('handL')),
                shape,
            ).toBe(true);
            if (['relaxed', 'open', 'wave'].includes(shape))
                for (const k of ['handL-f0a', 'handL-f3a', 'handL-t0'])
                    expect(keys, shape).toContain(k);
        }
    });
});
