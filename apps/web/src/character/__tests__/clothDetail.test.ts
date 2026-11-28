// @vitest-environment node
/**
 * Clothes as cloth on the manga body (docs/CHARACTER_STUDIO.md, reference pass phase 4): a short sleeve is a tube on
 * the arm, open at a hem line (not a puffy capsule); a T-shirt hangs over the trousers with its hem showing; trousers
 * and shorts show their hems; a bent knee or elbow folds the cloth on its inside; a hoodie has its pocket and strings.
 */
import { describe, expect, it } from 'vitest';
import { poseById } from '../data/poses';
import { RECIPES, fromRecipe } from '../data/recipes';
import { renderCharacter } from '../render/renderCharacter';
import { applyEdit } from '../studio/edit';
import type { BottomKind, Character, TopKind } from '../schema/types';

const cam = (yaw = 15) => ({ yaw, pitch: 0, roll: 0, shot: 'full' as const });
const wear = (top: TopKind, bottom: BottomKind, pose = 'stand'): Character =>
    applyEdit(fromRecipe(RECIPES[4], 'x'), {
        body: { age: 16, gender: 0 },
        top: { kind: top },
        bottom: { kind: bottom },
        pose: poseById(pose)!,
    });
const parts = (c: Character, yaw = 15) => renderCharacter(c, cam(yaw)).parts;
const keys = (c: Character, yaw = 15) => parts(c, yaw).map((p) => p.key);

describe('cloth on the manga body', () => {
    it('a short sleeve is a tube with a hem line, not an outlined capsule', () => {
        const ps = parts(wear('tshirt', 'jeans'));
        const sleeve = ps.find((p) => p.key === 'upperArmL-sleeve')!;
        expect(sleeve.stroke).toBeNull();
        expect(ps.some((p) => p.key === 'upperArmL-sleeve-hem')).toBe(true);
        // its sides: the outer silhouette and the thinner seam where its head lies on the torso (mangaSleeveCap.ts)
        expect(ps.some((p) => p.key.startsWith('upperArmL-sleeve-sil'))).toBe(true);
    });

    it('a T-shirt hangs over the trousers: drawn over them, with its hem line', () => {
        const ps = parts(wear('tshirt', 'jeans'));
        const torso = ps.find((p) => p.key === 'torso')!;
        const hips = ps.find((p) => p.key === 'hips')!;
        expect(torso.depth).toBeGreaterThan(hips.depth);
        expect(ps.some((p) => p.key === 'top-hem')).toBe(true);
    });

    it('trousers show a hem at the ankle, shorts above the knee', () => {
        expect(keys(wear('tshirt', 'jeans'))).toContain('lowerLegL-hem');
        // shorts ending at the knee: the hem on the colour edge of the bent leg (bentLimb.ts)
        expect(keys(wear('tshirt', 'shorts'))).toContain('legL-contour-hem');
        expect(keys(wear('tshirt', 'shorts'))).not.toContain('lowerLegL-hem');
    });

    it('a bent knee or elbow folds the cloth; a straight one does not', () => {
        expect(
            keys(wear('longsleeve', 'jeans', 'sit-chair')).some((k) => /^leg[LR]-fold/.test(k)),
        ).toBe(true);
        expect(
            keys(wear('longsleeve', 'jeans', 'stand')).some((k) => /^leg[LR]-fold/.test(k)),
        ).toBe(false);
        expect(
            keys(wear('longsleeve', 'jeans', 'thinking')).some((k) => /^arm[LR]-fold/.test(k)),
        ).toBe(true);
    });

    it('a hoodie has its front pocket and two strings, from the front', () => {
        const k = keys(wear('hoodie', 'jeans'), 0);
        expect(k).toContain('hoodie-pocket');
        expect(k).toContain('hoodie-string-1');
        expect(keys(wear('hoodie', 'jeans'), 180)).not.toContain('hoodie-pocket');
    });

    it('everything stays finite from every side', () => {
        for (const yaw of [0, 60, 120, 180, 240, 300])
            for (const c of [
                wear('tshirt', 'jeans', 'walk-a'),
                wear('hoodie', 'shorts', 'sit-chair'),
            ])
                for (const p of parts(c, yaw))
                    expect(/NaN|Infinity/.test(p.d), `${yaw} ${p.key}`).toBe(false);
    });
});
