/**
 * Held objects (docs/CHARACTER_STUDIO.md phase 3): the rules for what the hands hold, saved characters from before
 * (schema 4) load with empty hands, and every item draws from every side in sword, fist and rifle poses.
 */
import { describe, expect, it } from 'vitest';
import { POSES } from '../data/poses';
import { PROP_DEFS, heldIn, normalizeHeld } from '../data/props';
import { RECIPES, fromRecipe } from '../data/recipes';
import { renderCharacter } from '../render/renderCharacter';
import { parseCharacter } from '../schema/parse';
import { PROP_KINDS } from '../schema/propKinds';
import { applyEdit } from '../studio/edit';

const aarav = fromRecipe(RECIPES[0], 'a');
const meera = fromRecipe(RECIPES[1], 'm');
const pose = (id: string) => POSES.find((p) => p.id === id)!;

describe('held objects', () => {
    it('has 8 items, each named; two-hand ones are the rifle and the gloves', () => {
        expect(PROP_KINDS).toHaveLength(8);
        for (const k of PROP_KINDS) expect(PROP_DEFS[k].name.trim(), k).not.toBe('');
        expect(PROP_KINDS.filter((k) => PROP_DEFS[k].hands === 'two').sort()).toEqual([
            'boxing-gloves',
            'rifle',
        ]);
    });

    it('rules: one item per hand, a two-hand item takes both, the first one stays', () => {
        expect(
            normalizeHeld([
                { kind: 'sword', hand: 'R' },
                { kind: 'knife', hand: 'R' },
                { kind: 'torch', hand: 'L' },
            ]),
        ).toEqual([
            { kind: 'sword', hand: 'R' },
            { kind: 'torch', hand: 'L' },
        ]);
        expect(normalizeHeld([{ kind: 'rifle', hand: 'R' }])).toEqual([
            { kind: 'rifle', hand: 'both' },
        ]);
        // a two-hand item after a one-hand one is refused
        expect(
            normalizeHeld([
                { kind: 'katana', hand: 'L' },
                { kind: 'boxing-gloves', hand: 'both' },
            ]),
        ).toEqual([{ kind: 'katana', hand: 'L' }]);
        expect(heldIn([{ kind: 'rifle', hand: 'both' }], 'L')).toBe('rifle');
        expect(heldIn([{ kind: 'knife', hand: 'R' }], 'L')).toBeNull();
    });

    it('bad saved data is dropped; an older character (schema 4) loads with empty hands', () => {
        const c = parseCharacter({
            ...aarav,
            dress: {
                ...aarav.dress,
                held: [
                    { kind: 'lightsaber', hand: 'R' },
                    { kind: 'torch', hand: 'X' },
                ],
            },
        });
        expect(c?.dress.held).toEqual([{ kind: 'torch', hand: 'R' }]);
        const old = JSON.parse(JSON.stringify(aarav));
        old.schemaVersion = 4;
        delete old.dress.held;
        expect(parseCharacter(old)?.dress.held).toEqual([]);
    });

    it('every item draws, finite, from the front, side and back, in a sword, a fist and a rifle pose', () => {
        for (const body of [aarav, meera])
            for (const kind of PROP_KINDS)
                for (const pid of ['sword-guard', 'box-orthodox', 'rifle-aim'])
                    for (const yaw of [0, 90, 180]) {
                        const c = applyEdit(body, {
                            pose: pose(pid),
                            held: [{ kind, hand: PROP_DEFS[kind].hands === 'two' ? 'both' : 'R' }],
                        });
                        const parts = renderCharacter(c, {
                            yaw,
                            pitch: 0,
                            roll: 0,
                            shot: 'full',
                        }).parts;
                        expect(
                            parts.some((p) => p.key.startsWith('prop-')),
                            `${kind} ${pid}`,
                        ).toBe(true);
                        for (const p of parts)
                            expect(/NaN|Infinity/.test(p.d), `${kind} ${pid} ${yaw} ${p.key}`).toBe(
                                false,
                            );
                    }
    });

    it('holding something closes the hand around it', () => {
        const keys = (held: never[] | { kind: 'katana'; hand: 'R' }[]) =>
            renderCharacter(applyEdit(aarav, { held }), { yaw: 0, pitch: 0, roll: 0, shot: 'full' })
                .parts.filter((p) => p.key.startsWith('handR'))
                .map((p) => p.d)
                .join('|');
        expect(keys([{ kind: 'katana', hand: 'R' }])).not.toBe(keys([]));
    });
});
