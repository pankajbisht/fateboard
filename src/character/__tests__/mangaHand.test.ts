/**
 * The manga hand (docs/CHARACTER_STUDIO.md, reference pass phase 3): a palm, four fingers of three bones and a thumb,
 * drawn as fills without outlines inside ONE outline round the whole hand, so the fingers read as one hand and not as
 * a bunch of outlined sausages; a fist folds its fingers instead of being a box. Lines keep their weight across shots.
 */
import { describe, expect, it } from 'vitest';
import { pose } from '../data/poseDsl';
import { RECIPES, fromRecipe } from '../data/recipes';
import { renderCharacter } from '../render/renderCharacter';
import { HAND_SHAPES, type HandShape, type ShotId } from '../schema/types';
import { applyEdit } from '../studio/edit';

const teen = applyEdit(fromRecipe(RECIPES[4], 'x'), { body: { age: 16, gender: 0 } });
const posed = (shape: HandShape) =>
    applyEdit(teen, {
        pose: pose('h', 'h', 'gesture', ['a', 'b'], {
            armR: { raise: 70, spread: 10, twist: -70, bend: 110 },
            hands: ['relaxed', shape],
        }),
    });
const parts = (shape: HandShape, yaw = 15, shot: ShotId = 'waist') =>
    renderCharacter(posed(shape), { yaw, pitch: 0, roll: 0, shot }).parts;

describe('manga hands', () => {
    it('every hand shape: skin fills without outlines inside one outline round the hand, finite from every side', () => {
        for (const shape of HAND_SHAPES)
            for (const yaw of [0, 60, 150, 250]) {
                const ps = parts(shape, yaw).filter((p) => p.group === 'handR');
                const outline = ps.filter((p) => p.key === 'handR-outline');
                expect(outline, `${shape} ${yaw}`).toHaveLength(1);
                for (const p of ps) {
                    expect(/NaN|Infinity/.test(p.d), `${shape} ${yaw} ${p.key}`).toBe(false);
                    if (p.role === 'skin') expect(p.stroke, `${shape} ${yaw} ${p.key}`).toBeNull();
                }
                // the outline sits behind every fill of the hand
                const fills = ps.filter((p) => p.role === 'skin');
                expect(outline[0].depth).toBeLessThan(Math.min(...fills.map((p) => p.depth)));
            }
    });

    it('fingers have three bones; a fist folds them (no box) and shows knuckles from the back', () => {
        const open = parts('open').map((p) => p.key);
        for (const k of [
            'handR-f0a',
            'handR-f0b',
            'handR-f0c',
            'handR-f3c',
            'handR-t0',
            'handR-t1',
        ])
            expect(open, k).toContain(k);
        const fist = parts('fist').map((p) => p.key);
        expect(fist).not.toContain('handR-fist');
        expect(fist).toContain('handR-f1c');
        const back = [0, 90, 180, 270]
            .map((yaw) => parts('fist', yaw).map((p) => p.key))
            .some((k) => k.some((x) => x.startsWith('handR-k')));
        expect(back).toBe(true);
    });
});

describe('line weight across shots', () => {
    it('a close shot draws thinner lines than a full shot, so the weight looks the same', () => {
        const w = (shot: ShotId) =>
            parts('open', 15, shot).find((p) => p.key === 'handR-outline')!.strokeWidth;
        expect(w('closeup')).toBeLessThan(w('full') * 0.5);
        expect(w('waist')).toBeLessThan(w('full'));
    });
});
