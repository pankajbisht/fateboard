/**
 * The manga redraw (feat/character-manga-redraw, skill fate-character §3): the neck in one tone with a jaw shadow
 * layer, the bare and strapless shoulder caps, the skirt's detail, and the hips contour on the far thigh.
 */
import { describe, expect, it } from 'vitest';
import { poseById } from '../data/poses';
import { RECIPES, fromRecipe } from '../data/recipes';
import { renderCharacter } from '../render/renderCharacter';
import { applyEdit } from '../studio/edit';
import type { BottomKind, Character, TopKind } from '../schema/types';

const cam = (yaw: number) => ({ yaw, pitch: 0, roll: 0, shot: 'full' as const });
const wear = (gender: number, top: TopKind, bottom: BottomKind): Character =>
    applyEdit(fromRecipe(RECIPES[4], 'x'), {
        body: { age: 16, gender, bodyStyle: 'manga' },
        top: { kind: top },
        bottom: { kind: bottom },
        pose: poseById('stand')!,
    });
const parts = (c: Character, yaw: number) => renderCharacter(c, cam(yaw)).parts;
const keys = (c: Character, yaw: number) => parts(c, yaw).map((p) => p.key);
const ys = (d: string) => {
    const n = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    return n.filter((_, i) => i % 2 === 1);
};

describe('the manga redraw', () => {
    it('the neck keeps one shading layer, the jaw shadow, while it faces the viewer', () => {
        const neck = (yaw: number) =>
            parts(wear(0, 'tshirt', 'pants'), yaw).find((p) => p.key === 'neck');
        const shades = (yaw: number) =>
            (neck(yaw)?.layers ?? []).filter((l) => l.kind === 'shade').map((l) => l.key);
        expect(shades(0)).toEqual(['neck-shadow']);
        expect(shades(180)).not.toContain('neck-shadow');
    });

    it('a strapless top bares the chest with an edge and no shoulder seam; a tank inks its armholes', () => {
        for (const gender of [0, 1]) {
            const tube = keys(wear(gender, 'tube-top', 'pants'), 25);
            expect(tube).toContain('bare-chest');
            expect(tube).toContain('strapless-edge');
            expect(tube.some((k) => k.includes('shoulder-seam'))).toBe(false);
            const tank = keys(wear(gender, 'tank', 'pants'), 25);
            expect(tank.some((k) => k.includes('shoulder-seam'))).toBe(true);
            expect(tank).not.toContain('strapless-edge');
        }
    });

    it('a skirt has its band, hem and folds', () => {
        const k = keys(wear(1, 'tshirt', 'skirt'), 25);
        for (const key of [
            'skirt',
            'skirt-band',
            'skirt-hem',
            'skirt-contour-l',
            'skirt-contour-r',
        ])
            expect(k).toContain(key);
        expect(k.some((x) => x.startsWith('skirt-fold'))).toBe(true);
    });

    // The hips contour stopped at the hip-joint ring while the hips fill reached down to the crotch: at 335° the far
    // thigh's edge had a stretch with no ink under it.
    it('at 335° the hips contour runs down to the crotch on both sides', () => {
        for (const gender of [0, 1]) {
            const ps = parts(wear(gender, 'tshirt', 'shorts'), 335);
            const crotchTop = Math.min(...ys(ps.find((p) => p.key === 'crotch')!.d));
            for (const side of ['l', 'r']) {
                const line = ps.find((p) => p.key === `body-contour-hips-${side}`)!;
                expect(Math.max(...ys(line.d)), `${gender} ${side}`).toBeGreaterThan(crotchTop);
            }
        }
    });
});
