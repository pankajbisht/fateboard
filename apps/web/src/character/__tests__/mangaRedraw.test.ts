// @vitest-environment node
/**
 * The manga redraw (feat/character-manga-redraw, skill fate-character §3): the neck's jaw shadow in the face's shade,
 * strapless and sleeveless tops, lapels below the neck opening, the skirt's detail, and the hips contour.
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

    it('a strapless top bares the chest with an edge and no shoulder seam', () => {
        for (const gender of [0, 1]) {
            const tube = keys(wear(gender, 'tube-top', 'pants'), 25);
            expect(tube).toContain('bare-chest');
            expect(tube).toContain('strapless-edge');
            expect(tube.some((k) => k.includes('shoulder-seam'))).toBe(false);
        }
    });

    // A sleeveless top was cloth to the neck with a convex skin cap on each shoulder: a hull cannot bow inward, so the
    // armhole was a straight cut and the shoulder a flat slab. Now the shoulders are bare and the top is one panel.
    it('a sleeveless top is bare shoulders under a cloth panel with curved armholes', () => {
        for (const gender of [0, 1]) {
            for (const kind of ['tank', 'vest'] as const) {
                const k = keys(wear(gender, kind, 'pants'), 25);
                for (const key of ['bare-chest', 'tank-panel', 'tank-armhole-l', 'tank-armhole-r'])
                    expect(k, `${gender} ${kind}`).toContain(key);
                expect(k.some((x) => x.includes('shoulder-seam'))).toBe(false);
                expect(k).not.toContain('strapless-edge');
            }
            // a tank's scoop is inked front and back (along the neck base the back stepped up at each strap); a
            // vest's cloth runs up to the neck
            expect(keys(wear(gender, 'tank', 'pants'), 25)).toContain('tank-neckline');
            expect(keys(wear(gender, 'tank', 'pants'), 180)).toContain('tank-neckline');
            expect(keys(wear(gender, 'vest', 'pants'), 25)).not.toContain('tank-neckline');
        }
    });

    // A lighter band than the face's shade under the chin read as a ring: the head looked set on the neck.
    it("the jaw shadow on the neck is the face's own shade tone", () => {
        const ps = parts(wear(0, 'tshirt', 'pants'), 15);
        const shade = (key: string) =>
            ps.find((p) => p.key === key)?.layers?.filter((l) => l.kind === 'shade') ?? [];
        const jaw = shade('neck').find((l) => l.key === 'neck-shadow')!;
        expect(jaw).toBeDefined();
        expect(shade('head').map((l) => l.fill)).toContain(jaw.fill);
    });

    // Lapel flaps started above the top of the shirt and wider than the neck: they ran up the neck as a band.
    it('lapel flaps start no higher than the neck opening', () => {
        for (const kind of ['vest', 'kimono-top', 'blazer'] as const)
            for (const yaw of [15, 335]) {
                const ps = parts(wear(0, kind, 'pants'), yaw);
                const opening = Math.min(...ys(ps.find((p) => p.key === 'neckline')!.d));
                for (const sx of ['-1', '1']) {
                    const flap = ps.find((p) => p.key === `collar-flap${sx}`)!;
                    expect(Math.min(...ys(flap.d)), `${kind} ${yaw} ${sx}`).toBeGreaterThanOrEqual(
                        opening - 0.01,
                    );
                }
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
