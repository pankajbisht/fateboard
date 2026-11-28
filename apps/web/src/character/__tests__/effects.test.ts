// @vitest-environment node
/**
 * Effects on hair and hanging cloth (2026-11-27, owner: wind on hair and dress, and others like it): wind, updraft,
 * twirl, wet. A field in the world moves the points of hair and hanging cloth by how far they hang (render/effects).
 */
import { describe, expect, it } from 'vitest';
import { effectWarp, type Field } from '../render/effects';
import { renderCharacter } from '../render/renderCharacter';
import { NO_EFFECTS, parseEffects, type Effects } from '../schema/effects';
import { DEFAULT_CAMERA, defaultCharacter, parseCharacter } from '../schema/parse';
import { applyEdit } from '../studio/edit';
import type { Character } from '../schema/types';

const field: Field = {
    anchor: [0, 100, 0],
    length: 50,
    start: 0,
    base: 0.1,
    cling: 0.3,
    lift: 1,
    spread: 0.5,
    group: 'hair',
    dripsBehind: true,
};
const fx = (e: Partial<Effects>) => ({ ...NO_EFFECTS, ...e });

describe('effects schema', () => {
    it('reads strengths 0..1 and a direction in degrees; none at all is no field', () => {
        expect(parseEffects({ wind: 2, windDir: -90, wet: 0.5 })).toEqual({
            ...NO_EFFECTS,
            wind: 1,
            windDir: 270,
            wet: 0.5,
        });
        expect(parseEffects({ wind: 0 })).toBeUndefined();
        expect(parseEffects('wind')).toBeUndefined();
        const c = defaultCharacter();
        expect(parseCharacter({ ...c, effects: { twirl: 0.4 } })!.effects?.twirl).toBe(0.4);
        expect(parseCharacter(c)!.effects).toBeUndefined();
    });

    it('a studio edit merges into the current effects', () => {
        let c = applyEdit(defaultCharacter(), { effects: { wind: 0.5, windDir: 90 } });
        c = applyEdit(c, { effects: { wet: 1 } });
        expect(c.effects).toMatchObject({ wind: 0.5, windDir: 90, wet: 1 });
    });
});

describe('the field', () => {
    const end: [number, number, number] = [10, 50, 0]; // one length below the anchor
    const root: [number, number, number] = [10, 100, 0];

    it('wind: the end blows along the direction, the root barely stirs', () => {
        const w = effectWarp(fx({ wind: 1, windDir: 0 }), field);
        expect(w(end)[0] - end[0]).toBeGreaterThan(20);
        expect(Math.abs(w(root)[0] - root[0])).toBeLessThan(5);
        const back = effectWarp(fx({ wind: 1, windDir: 180 }), field);
        expect(back(end)[0]).toBeLessThan(end[0] - 20);
        const front = effectWarp(fx({ wind: 1, windDir: 90 }), field);
        expect(front(end)[2]).toBeGreaterThan(20);
    });

    it('updraft lifts the end; twirl flares it out; wet pulls it in', () => {
        expect(effectWarp(fx({ updraft: 1 }), field)(end)[1]).toBeGreaterThan(end[1] + 30);
        expect(effectWarp(fx({ twirl: 1 }), field)(end)[0]).toBeGreaterThan(end[0] + 15);
        expect(effectWarp(fx({ wet: 1 }), field)(end)[0]).toBeLessThan(end[0]);
    });

    it('lift starts below `start` (a fringe on the forehead stays on the head)', () => {
        const f = { ...field, start: 20 };
        const fringe: [number, number, number] = [0, 85, 10];
        expect(effectWarp(fx({ updraft: 1 }), f)(fringe)).toEqual(fringe);
    });
});

describe('effects in the drawing', () => {
    const sakura = (): Character => {
        const c = defaultCharacter();
        return applyEdit(c, {
            hair: { style: 'long' },
            bottom: { kind: 'skirt' },
            identity: 'female',
            body: { gender: 1 },
        });
    };
    const box = (c: Character, keys: RegExp) => {
        const m = renderCharacter(c, DEFAULT_CAMERA);
        const xs: number[] = [];
        for (const p of m.parts.filter((x) => keys.test(x.key)))
            for (const n of p.d.match(/-?\d+(\.\d+)?/g) ?? []) xs.push(Number(n));
        const x = xs.filter((_, i) => i % 2 === 0);
        return { min: Math.min(...x), max: Math.max(...x) };
    };

    it('the wind moves the skirt and the hair; nothing else changes without effects', () => {
        const c = sakura();
        const still = box(c, /skirt/);
        const blown = box(applyEdit(c, { effects: { wind: 1, windDir: 0 } }), /skirt/);
        expect(blown.max).toBeGreaterThan(still.max + 5);
        const hair = box(c, /^hair/);
        const hairBlown = box(applyEdit(c, { effects: { wind: 1, windDir: 0 } }), /^hair/);
        expect(hairBlown.max).toBeGreaterThan(hair.max + 5);
        expect(renderCharacter(c, DEFAULT_CAMERA)).toEqual(renderCharacter(c, DEFAULT_CAMERA));
    });

    it('wet: darker cloth and drops from the hem', () => {
        const c = sakura();
        const dry = renderCharacter(c, DEFAULT_CAMERA).parts;
        const wet = renderCharacter(applyEdit(c, { effects: { wet: 1 } }), DEFAULT_CAMERA).parts;
        expect(dry.some((p) => p.key.includes('-drop-'))).toBe(false);
        expect(wet.some((p) => p.key.startsWith('torso-drop-'))).toBe(true);
        const keys = wet.map((p) => p.key);
        expect(new Set(keys).size).toBe(keys.length);
        const fill = (ps: typeof dry) => ps.find((p) => p.key === 'skirt')?.fill;
        expect(fill(wet)).not.toEqual(fill(dry));
    });
});
