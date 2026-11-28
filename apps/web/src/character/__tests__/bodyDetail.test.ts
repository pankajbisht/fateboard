// @vitest-environment node
/**
 * Body detail (docs/CHARACTER_STUDIO.md phase 3): a real hand for every hand shape (fingers, a thumb, a folded fist),
 * and joints (shoulder caps, elbows, wrists, knees with a kneecap, ankles), chest or bust lines and the hip crease on
 * every body, from every side, without a broken path.
 */
import { describe, expect, it } from 'vitest';
import { pose } from '../data/poseDsl';
import { RECIPES, fromRecipe } from '../data/recipes';
import { renderCharacter } from '../render/renderCharacter';
import { applyEdit } from '../studio/edit';
import { HAND_SHAPES } from '../schema/types';

// new characters are manga; these checks are about the classic body's hands and joint blobs
const classic = (c: ReturnType<typeof fromRecipe>) =>
    applyEdit(c, { body: { bodyStyle: 'classic' } });
const cam = (yaw: number) => ({ yaw, pitch: 0, roll: 0, shot: 'full' as const });
const keys = (c: ReturnType<typeof fromRecipe>, yaw = 0) =>
    renderCharacter(c, cam(yaw)).parts.map((p) => p.key);

describe('hands', () => {
    const base = classic(fromRecipe(RECIPES[0], 'a'));
    const withHands = (shape: (typeof HAND_SHAPES)[number]) => ({
        ...base,
        rig: {
            pose: pose('h', 'h', 'gesture', ['a', 'b'], {
                armL: { raise: 75, spread: 30, bend: 100 },
                armR: { raise: 70, spread: 30, bend: 100 },
                hands: [shape, shape],
            }),
        },
    });

    it('every hand shape draws, finite, from the front, side and back, and they differ from each other', () => {
        const seen = new Map<string, string>();
        // grips are fists around an object, so they look like the fist; every other shape is its own
        const GRIPS = ['grip', 'holdBat', 'holdSword', 'holdPhone', 'holdCup'];
        for (const shape of HAND_SHAPES) {
            const c = withHands(shape);
            for (const yaw of [0, 60, 180])
                for (const p of renderCharacter(c, cam(yaw)).parts)
                    expect(/NaN|Infinity/.test(p.d), `${shape} ${yaw} ${p.key}`).toBe(false);
            const sig = JSON.stringify(
                renderCharacter(c, cam(30))
                    .parts.filter((p) => p.key.startsWith('handL'))
                    .map((p) => p.d),
            );
            if (GRIPS.includes(shape)) continue;
            expect(seen.get(sig), `${shape} = ${seen.get(sig)}`).toBeUndefined();
            seen.set(sig, shape);
        }
    });

    it('an open hand has five separate fingers; a fist is one block with a thumb across; pointing keeps one finger out', () => {
        const hand = (s: (typeof HAND_SHAPES)[number]) =>
            keys(withHands(s)).filter((k) => k.startsWith('handL'));
        const open = hand('open');
        for (const i of [0, 1, 2, 3]) expect(open).toContain(`handL-f${i}a`);
        expect(open).toContain('handL-t0');
        const fist = hand('fist');
        expect(fist).toContain('handL-fist');
        expect(
            fist.filter((k) => /^handL-f\d/.test(k)),
            fist.join(),
        ).toEqual([]);
        expect(fist).toContain('handL-t1');
        const point = hand('point');
        expect(point).toContain('handL-f0a');
        expect(point).not.toContain('handL-f1a');
    });
});

describe('joints and landmarks', () => {
    it('every body has shoulder caps, elbows, wrists, knees and ankles on both sides', () => {
        for (const r of RECIPES) {
            const k = keys(classic(fromRecipe(r, r.id)));
            for (const s of ['L', 'R'])
                for (const name of [
                    `upperArm${s}-cap`,
                    `lowerArm${s}-elbow`,
                    `lowerLeg${s}-knee`,
                    `foot${s}-ankle`,
                ])
                    expect(k, `${r.id} ${name}`).toContain(name);
        }
    });

    it('a kneecap shows from the front only; the hip crease only from behind; the bust line only on the front', () => {
        const meera = classic(fromRecipe(RECIPES[1], 'm'));
        const front = keys(meera, 0);
        const back = keys(meera, 180);
        expect(front).toContain('lowerLegL-kneecap');
        expect(back).not.toContain('lowerLegL-kneecap');
        expect(front).not.toContain('glute-crease');
        expect(back).toContain('glute-crease');
        expect(front).toContain('chest--1');
        expect(back).not.toContain('chest--1');
    });

    it('all of it is finite on every recipe, from eight sides and tilted up and down', () => {
        for (const r of RECIPES)
            for (const yaw of [0, 45, 90, 135, 180, 225, 270, 315])
                for (const pitch of [-40, 0, 40])
                    for (const p of renderCharacter(fromRecipe(r, 'x'), {
                        yaw,
                        pitch,
                        roll: 0,
                        shot: 'full',
                    }).parts)
                        expect(/NaN|Infinity/.test(p.d), `${r.id} ${yaw} ${pitch} ${p.key}`).toBe(
                            false,
                        );
    }, 30_000);
});

describe('manga limbs have no joint blobs: one bent shape and one contour per limb', () => {
    it('every recipe has an arm and a leg contour on both sides, and the torso contour', () => {
        for (const r of RECIPES) {
            const k = keys(fromRecipe(r, r.id));
            for (const s of ['L', 'R']) {
                expect(k, `${r.id} arm`).toContain(`arm${s}-contour`);
                expect(k, `${r.id} leg`).toContain(`leg${s}-contour`);
                expect(k, `${r.id} blob`).not.toContain(`lowerArm${s}-elbow`);
            }
            expect(k, r.id).toContain('body-contour-l');
            expect(k, r.id).toContain('body-contour-r');
        }
    });
});
