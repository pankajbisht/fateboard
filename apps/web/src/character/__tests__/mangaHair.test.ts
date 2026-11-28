// @vitest-environment node
/**
 * Manga hair (docs/CHARACTER_STUDIO.md, reference pass phase 5): pointed locks instead of a smooth cap. The fringe is
 * a row of pointed locks over the forehead, side locks fall before the ears, spikes come to a point; every piece is a
 * fill without an outline inside one outline for the front hair and one for the back, so the hair reads as one jagged
 * shape and not as a helmet with a line across the forehead.
 */
import { describe, expect, it } from 'vitest';
import { HAIR_DEFS } from '../data/hairStyles';
import { poseById } from '../data/poses';
import { RECIPES, fromRecipe } from '../data/recipes';
import { renderCharacter } from '../render/renderCharacter';
import { HAIR_STYLES, type HairStyle } from '../schema/types';
import { applyEdit } from '../studio/edit';

const teen = applyEdit(fromRecipe(RECIPES[4], 'x'), {
    body: { age: 16, gender: 0 },
    pose: poseById('stand')!,
});
const parts = (style: HairStyle, yaw = 0, extra = {}) =>
    renderCharacter(applyEdit(teen, { hair: { style }, ...extra }), {
        yaw,
        pitch: 0,
        roll: 0,
        shot: 'bust',
    }).parts;

describe('manga hair', () => {
    it('a fringe is a row of pointed locks; no fringe, no locks', () => {
        const locks = (style: HairStyle) =>
            parts(style).filter((p) => /^hair-lock\d+$/.test(p.key)).length;
        expect(locks('short')).toBeGreaterThanOrEqual(5);
        expect(locks('messy')).toBeGreaterThanOrEqual(5);
        expect(locks('buzz')).toBe(0);
        expect(locks('bald')).toBe(0);
    });

    it('hair pieces are fills without outlines inside a front and a back outline', () => {
        for (const yaw of [0, 45, 90, 180]) {
            const ps = parts('short', yaw).filter((p) => p.group === 'hair');
            for (const p of ps)
                if (p.role === 'hair' || p.role === 'hair2')
                    expect(p.stroke, `${yaw} ${p.key}`).toBeNull();
            expect(
                ps.some((p) => p.key === 'hair-outline-front' || p.key === 'hair-outline-back'),
                String(yaw),
            ).toBe(true);
        }
    });

    it('fringe locks hide when the face turns away; a hat hides them', () => {
        const locks = (yaw: number, extra = {}) =>
            parts('short', yaw, extra).filter((p) => /^hair-lock\d+$/.test(p.key)).length;
        expect(locks(180)).toBe(0);
        expect(locks(0, { accessories: [{ kind: 'beanie', color: '#333333' }] })).toBe(0);
    });

    it('every hairstyle draws finite on the manga body from every side', () => {
        for (const style of HAIR_STYLES)
            for (const yaw of [0, 90, 200]) {
                expect(HAIR_DEFS[style]).toBeTruthy();
                for (const p of parts(style, yaw))
                    expect(/NaN|Infinity/.test(p.d), `${style} ${yaw} ${p.key}`).toBe(false);
            }
    });
});
