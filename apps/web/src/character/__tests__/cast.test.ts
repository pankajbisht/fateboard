// @vitest-environment node
/**
 * The 100-person cast (docs/CHARACTER_STUDIO.md phase 3): seeded and stable, every person distinct, a fair spread
 * of ages and looks, every one a valid character that renders, and the cast browser's filter.
 */
import { describe, expect, it } from 'vitest';
import { NO_FILTER, castRecipes, filterCast } from '../data/cast';
import { AGE_GROUPS, ageGroupOf, generateCast } from '../data/castGenerator';
import { RECIPES, fromRecipe } from '../data/recipes';
import { renderCharacter } from '../render/renderCharacter';

const cast = castRecipes();
const face = (r: (typeof cast)[number]) =>
    [r.skin, r.eye, r.eyeColor, r.brow, r.nose, r.mouth, r.hair.style, r.hair.color].join('|');

describe('the cast of 100', () => {
    it('is 100 people: the hand-made ones first, then generated ones', () => {
        expect(cast).toHaveLength(100);
        expect(cast.slice(0, RECIPES.length).map((r) => r.id)).toEqual(RECIPES.map((r) => r.id));
        expect(cast.slice(RECIPES.length).every((r) => /^cast-\d{3}$/.test(r.id))).toBe(true);
    });

    it('is the same on every run (seeded), and a different seed gives different people', () => {
        expect(generateCast(RECIPES, 100)).toEqual(cast);
        expect(generateCast(RECIPES, 100, 7).slice(RECIPES.length)).not.toEqual(
            cast.slice(RECIPES.length),
        );
    });

    it('everyone is distinct: id, name, face, and hair-on-skin-in-this-top', () => {
        expect(new Set(cast.map((r) => r.id)).size).toBe(100);
        expect(new Set(cast.map((r) => r.name)).size).toBe(100);
        expect(new Set(cast.map(face)).size).toBe(100);
        expect(
            new Set(cast.map((r) => [r.hair.style, r.hair.color, r.skin, r.top.color].join('|')))
                .size,
        ).toBe(100);
    });

    it('covers every age group, both looks, every skin tone and every build', () => {
        const count = (f: (r: (typeof cast)[number]) => boolean) => cast.filter(f).length;
        for (const g of Object.keys(AGE_GROUPS) as (keyof typeof AGE_GROUPS)[])
            expect(
                count((r) => ageGroupOf(r.age) === g),
                g,
            ).toBeGreaterThanOrEqual(12);
        expect(count((r) => r.gender < 0.4)).toBeGreaterThan(25);
        expect(count((r) => r.gender >= 0.6)).toBeGreaterThan(25);
        expect(new Set(cast.map((r) => r.skin)).size).toBe(12);
        expect(new Set(cast.map((r) => r.build)).size).toBe(7);
        // elders are mostly grey
        const elders = cast.filter((r) => ageGroupOf(r.age) === 'elder');
        expect(
            elders.filter((r) => ['#8f8f8f', '#e4e4e4'].includes(r.hair.color)).length,
        ).toBeGreaterThan(elders.length / 2);
    });

    it('every person is a valid character that renders (a front and a side view)', () => {
        for (const r of cast) {
            const c = fromRecipe(r, `t-${r.id}`);
            expect(c.name, r.id).toBe(r.name);
            expect(c.body.age, r.id).toBeCloseTo(r.age);
            for (const yaw of [0, 90]) {
                const m = renderCharacter(c, { yaw, pitch: 0, roll: 0, shot: 'full' });
                expect(m.parts.length, r.id).toBeGreaterThan(20);
                for (const p of m.parts)
                    expect(/NaN|Infinity/.test(p.d), `${r.id} ${p.key}`).toBe(false);
            }
        }
    });
});

describe('the cast filter', () => {
    it('no filter keeps everyone; age and look narrow it', () => {
        expect(filterCast(cast, NO_FILTER)).toHaveLength(100);
        const kids = filterCast(cast, { ...NO_FILTER, age: 'child' });
        expect(kids.length).toBeGreaterThanOrEqual(12);
        expect(kids.every((r) => r.age < 13)).toBe(true);
        const she = filterCast(cast, { ...NO_FILTER, look: 'feminine' });
        expect(she.every((r) => r.gender >= 0.6)).toBe(true);
        const he = filterCast(cast, { ...NO_FILTER, look: 'masculine' });
        expect(he.every((r) => r.gender < 0.4)).toBe(true);
        expect(she.length + he.length).toBeLessThanOrEqual(100);
    });

    it('the search matches name, role and tags, all words, any case', () => {
        expect(filterCast(cast, { ...NO_FILTER, query: 'MEERA' }).map((r) => r.id)).toEqual([
            'meera',
        ]);
        const teachers = filterCast(cast, { ...NO_FILTER, query: 'teacher' });
        expect(teachers.length).toBeGreaterThan(1);
        expect(teachers.every((r) => /teacher/.test(`${r.role} ${r.tags.join(' ')}`))).toBe(true);
        const both = filterCast(cast, { query: 'elder wise', age: 'any', look: 'any' });
        expect(both.every((r) => r.tags.includes('wise') && ageGroupOf(r.age) === 'elder')).toBe(
            true,
        );
        expect(filterCast(cast, { ...NO_FILTER, query: 'zzzz nobody' })).toEqual([]);
    });
});
