/**
 * The hairstyles (docs/CHARACTER_STUDIO.md phase 3): 44 styles as data, every one drawn from every side, two-tone
 * tips, the schema step that added them, and which styles suit whom.
 */
import { describe, expect, it } from 'vitest';
import { castRecipes } from '../data/cast';
import { HAIR_DEFS, HAIR_GROUPS, FRINGES, hairPool, hasTips } from '../data/hairStyles';
import { RECIPES, fromRecipe } from '../data/recipes';
import { renderCharacter } from '../render/renderCharacter';
import { migrateCharacter } from '../schema/migrate';
import { parseCharacter } from '../schema/parse';
import {
    CHARACTER_SCHEMA_VERSION,
    HAIR_STYLES,
    type CharacterCamera,
    type HairStyle,
} from '../schema/types';
import { applyEdit } from '../studio/edit';

const cam = (yaw: number): CharacterCamera => ({ yaw, pitch: 0, roll: 0, shot: 'full' });
const meera = fromRecipe(RECIPES[1], 'm');
const withHair = (style: HairStyle, tip: string | null = null) =>
    applyEdit(meera, { hair: { style, tip } });
const hairParts = (style: HairStyle, yaw = 0, tip: string | null = null) =>
    renderCharacter(withHair(style, tip), cam(yaw)).parts.filter((p) => p.group === 'hair');
const numbers = (d: string) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

describe('hairstyle catalogue', () => {
    it('has 46 styles (44 + 2 manga), each named, grouped and described by real data', () => {
        expect(HAIR_STYLES).toHaveLength(46);
        expect(new Set(HAIR_STYLES).size).toBe(46);
        expect(Object.keys(HAIR_DEFS).sort()).toEqual([...HAIR_STYLES].sort());
        for (const id of HAIR_STYLES) {
            const d = HAIR_DEFS[id];
            expect(d.name.trim(), id).not.toBe('');
            expect(HAIR_GROUPS, id).toContain(d.group);
            if (d.cap) expect(Object.keys(FRINGES), id).toContain(d.cap.fringe);
            for (const b of d.blobs ?? [])
                for (const n of [...b.at, ...b.r]) expect(Number.isFinite(n), id).toBe(true);
        }
        // the four first styles keep their ids (saved characters)
        for (const id of ['short', 'long', 'bun', 'bald'] as const)
            expect(HAIR_STYLES).toContain(id);
    });

    it('every style draws from every 45°, finite, and bald draws no hair', () => {
        for (const id of HAIR_STYLES)
            for (let yaw = 0; yaw < 360; yaw += 45) {
                const parts = hairParts(id, yaw);
                for (const p of parts)
                    for (const n of numbers(p.d))
                        expect(Number.isFinite(n), `${id} ${yaw} ${p.key}`).toBe(true);
                if (id === 'bald') expect(parts).toHaveLength(0);
                else expect(parts.length, `${id} ${yaw}`).toBeGreaterThan(0);
            }
    });

    it('looks different: no two styles draw the same hair', () => {
        const seen = new Map<string, string>();
        for (const id of HAIR_STYLES) {
            const key = JSON.stringify(
                hairParts(id, 0)
                    .map((p) => [p.key, p.d])
                    .concat(hairParts(id, 90).map((p) => [p.key, p.d])),
            );
            expect(seen.get(key), `${id} = ${seen.get(key)}`).toBeUndefined();
            seen.set(key, id);
        }
    });

    it('hair changes the hair and nothing else', () => {
        const base = renderCharacter(withHair('short'), cam(0)).parts.filter(
            (p) => p.group !== 'hair',
        );
        for (const id of ['afro', 'very-long', 'mohawk'] as const) {
            const other = renderCharacter(withHair(id), cam(0)).parts.filter(
                (p) => p.group !== 'hair',
            );
            expect(
                other.map((p) => [p.key, p.d]),
                id,
            ).toEqual(base.map((p) => [p.key, p.d]));
        }
    });
});

describe('two-tone hair', () => {
    it('tips are drawn only for styles with length, in the tip colour, over the hair', () => {
        for (const id of HAIR_STYLES) {
            const tips = hairParts(id, 0, '#3a4fb8').filter((p) => p.role === 'hair2');
            expect(tips.length > 0, id).toBe(hasTips(id));
            for (const t of tips) expect(t.fill, id).toBe('#3a4fb8');
            expect(
                hairParts(id, 0, null).some((p) => p.role === 'hair2'),
                id,
            ).toBe(false);
        }
        expect(hasTips('ponytail-high')).toBe(true);
        expect(hasTips('buzz')).toBe(false);
    });

    it('the tip greys with age like the rest unless a colour was picked', () => {
        const old = applyEdit(meera, {
            body: { age: 80 },
            hair: { style: 'long', tip: '#3a4fb8' },
        });
        const old2 = { ...old, body: { ...old.body, overridden: [] } };
        const tip = renderCharacter(old2, cam(0)).parts.find((p) => p.role === 'hair2')!;
        expect(tip.fill).not.toBe('#3a4fb8');
    });
});

describe('the schema step to version 3', () => {
    it('older characters get one-colour hair, new fields are repaired', () => {
        const v2 = JSON.parse(JSON.stringify(meera));
        v2.schemaVersion = 2;
        delete v2.hair.tip;
        expect(migrateCharacter(v2)!.schemaVersion).toBe(CHARACTER_SCHEMA_VERSION);
        expect(parseCharacter(v2)!.hair.tip).toBeNull();
        const c = parseCharacter({
            ...meera,
            hair: { style: 'nonsense', color: '#123456', tip: 'blue' },
        })!;
        expect(c.hair).toEqual({ style: 'short', color: '#123456', tip: null, ahoge: false });
        expect(
            parseCharacter({ ...meera, hair: { ...meera.hair, tip: '#AABBCC' } })!.hair.tip,
        ).toBe('#aabbcc');
    });
});

describe('who gets which style', () => {
    it('masculine styles are not given to women, feminine not to men; older styles only from 50; kids keep it simple', () => {
        const women = hairPool(true, 30);
        const men = hairPool(false, 30);
        expect(women).not.toContain('quiff');
        expect(women).toContain('long');
        expect(men).not.toContain('braid');
        expect(men).toContain('undercut');
        expect(hairPool(false, 30)).not.toContain('balding');
        expect(hairPool(false, 70)).toContain('balding');
        expect(hairPool(false, 8)).not.toContain('receding');
        expect(hairPool(true, 8)).not.toContain('bald');
    });

    it('the generated cast uses the variety, and tip colours appear on some long hair only', () => {
        const styles = new Set(castRecipes().map((r) => r.hair.style));
        expect(styles.size).toBeGreaterThan(20);
        const tipped = castRecipes().filter((r) => r.hair.tip);
        expect(tipped.length).toBeGreaterThan(0);
        for (const r of tipped) expect(hasTips(r.hair.style), r.id).toBe(true);
        for (const r of castRecipes().slice(12)) {
            const female = r.gender >= 0.5;
            expect(
                female
                    ? HAIR_DEFS[r.hair.style].suits !== 'masculine'
                    : HAIR_DEFS[r.hair.style].suits !== 'feminine',
                r.id,
            ).toBe(true);
        }
    });
});
