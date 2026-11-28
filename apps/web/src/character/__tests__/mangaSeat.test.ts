// @vitest-environment node
/**
 * The seat of the manga body (docs/CHARACTER_STUDIO.md, manga cloth): the bottom of the hips follows the thighs, so a
 * sitting, crouching or kneeling figure has a seat that bends with the legs, not a block hanging under the pelvis.
 */
import { describe, expect, it } from 'vitest';
import { POSES, poseById } from '../data/poses';
import { RECIPES, fromRecipe } from '../data/recipes';
import { renderCharacter } from '../render/renderCharacter';
import { applyEdit } from '../studio/edit';

const nums = (d: string) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
const hipsHeight = (id: string, r: number, bodyStyle: 'manga' | 'classic' = 'manga') => {
    const c = applyEdit(fromRecipe(RECIPES[r], 'x'), { pose: poseById(id)!, body: { bodyStyle } });
    const d = renderCharacter(c, { yaw: 90, pitch: 0, roll: 0, shot: 'full' }).parts.find(
        (p) => p.key === 'hips',
    )!.d;
    const ys = nums(d).filter((_, i) => i % 2 === 1);
    return Math.max(...ys) - Math.min(...ys);
};

describe('manga seat follows the thighs', () => {
    for (const id of ['sit-chair', 'sit-floor', 'crouch'])
        it(`${id}: seen from the side the hips are shorter than standing (the seat turns with the thighs)`, () => {
            expect(POSES.some((p) => p.id === id)).toBe(true);
            for (const r of [1, 4])
                expect(hipsHeight(id, r), `${id} r${r}`).toBeLessThan(hipsHeight('stand', r) * 0.9);
        });

    it('standing, the hips keep their shape', () => {
        for (const r of [1, 4]) {
            const h = hipsHeight('stand', r);
            expect(h).toBeGreaterThan(0);
        }
    });
});
