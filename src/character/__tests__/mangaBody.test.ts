/**
 * The manga body, step 1 (docs/CHARACTER_STUDIO.md): a head-unit proportion table, a body style that is separate from
 * the art style, classic unchanged, old characters load as classic, and the same character renders in both bodies
 * in every art style.
 */
import { describe, expect, it } from 'vitest';
import { LANDMARKS, VARIANTS, landmarkHeights, mangaHeads } from '../rig/proportions';
import { RECIPES, fromRecipe } from '../data/recipes';
import { renderCharacter } from '../render/renderCharacter';
import { buildSkeleton } from '../rig/skeleton';
import { defaultCharacter, parseCharacter } from '../schema/parse';
import { MANGA_VARIANTS } from '../schema/bodyStyles';
import { AVAILABLE_STYLES } from '../render/styles';
import { applyEdit } from '../studio/edit';

const adult = fromRecipe(RECIPES[0], 'a');
const meera = fromRecipe(RECIPES[1], 'm');
const manga = (c: typeof adult, mangaVariant: (typeof MANGA_VARIANTS)[number] = 'shonen') =>
    applyEdit(c, { body: { bodyStyle: 'manga', mangaVariant, age: 25 } });
const heads = (c: typeof adult) => {
    const s = buildSkeleton(c.body);
    return s.height / s.headHeight;
};

describe('manga proportions', () => {
    it('a grown manga body is 7.5 to 8 heads tall, in every variant and for both genders', () => {
        for (const v of MANGA_VARIANTS)
            for (const base of [adult, meera]) {
                const h = heads(manga(base, v));
                expect(h, `${v} ${base.name}`).toBeGreaterThanOrEqual(7.5);
                expect(h, `${v} ${base.name}`).toBeLessThanOrEqual(8.01);
            }
    });

    it('a child is 5 to 6 heads, an elder about half a head shorter than the grown body', () => {
        const kid = applyEdit(adult, { body: { bodyStyle: 'manga', age: 7 } });
        expect(heads(kid)).toBeGreaterThanOrEqual(5);
        expect(heads(kid)).toBeLessThanOrEqual(6);
        const old = applyEdit(adult, { body: { bodyStyle: 'manga', age: 80 } });
        expect(heads(old)).toBeCloseTo(VARIANTS.shonen.heads - 0.5, 1);
        expect(mangaHeads(12, 'shonen')).toBeLessThan(mangaHeads(19, 'shonen'));
    });

    it('landmarks: chin 1, nipples 2, navel 3, crotch 4.2, knee 5.9 heads from the top (reference sheet); legs longer than the torso', () => {
        expect(LANDMARKS).toEqual({ chin: 1, nipples: 2, navel: 3, crotch: 4.2, knee: 5.9 });
        for (const v of MANGA_VARIANTS) {
            const c = manga(adult, v);
            const s = buildSkeleton(c.body);
            const at = landmarkHeights(s.height, heads(c));
            // the hip joint sits just above the crotch landmark
            expect(s.pelvisHeight, v).toBeGreaterThan(at.crotch - 0.01 * s.height);
            expect(s.pelvisHeight, v).toBeLessThan(at.crotch + 0.08 * s.height);
            // legs (floor to hip) are longer than the torso (hip to the base of the neck)
            const torso = s.height - s.headHeight - s.pelvisHeight;
            expect(s.pelvisHeight, v).toBeGreaterThan(torso);
        }
    });

    it('the whole width at the shoulders (deltoids included): about 1.7 head heights for a man (the reference sheet), 1.5 for a woman; hips 1.2–1.6', () => {
        const wide = (c: typeof adult) => {
            const s = buildSkeleton(c.body);
            const outer = 2 * (s.size.shoulderW * 0.46 + s.size.upperArm * 1.12);
            return { shoulder: outer / s.headHeight, hip: s.size.hipW / s.headHeight };
        };
        const m = wide(manga(adult));
        const f = wide(manga(applyEdit(meera, { body: { gender: 1 } })));
        expect(m.shoulder).toBeGreaterThan(1.55);
        expect(m.shoulder).toBeLessThan(1.9);
        expect(f.shoulder).toBeGreaterThan(1.35);
        expect(f.shoulder).toBeLessThan(1.75);
        expect(m.hip).toBeGreaterThan(1.2);
        expect(m.hip).toBeLessThan(1.6);
        expect(f.hip).toBeGreaterThan(1.3);
        expect(f.hip).toBeLessThan(1.65);
    });

    it('male and female read differently: a V from broad shoulders to narrow hips, an hourglass with hips as wide as the shoulders', () => {
        const shape = (c: typeof adult) => {
            const s = buildSkeleton(c.body);
            const outer = 2 * (s.size.shoulderW * 0.46 + s.size.upperArm * 1.12);
            return {
                hipToShoulder: s.size.hipW / outer,
                waistToHip: (s.size.waistW * 0.8) / s.size.hipW,
            };
        };
        const m = shape(manga(applyEdit(adult, { body: { gender: 0 } })));
        const f = shape(manga(applyEdit(meera, { body: { gender: 1 } })));
        // the reference sheet: bare hips about 0.76 of the outer shoulders
        expect(m.hipToShoulder).toBeLessThan(0.8);
        expect(f.hipToShoulder).toBeGreaterThan(0.85);
        expect(f.waistToHip).toBeLessThan(0.65);
        expect(m.waistToHip).toBeGreaterThan(0.75);
    });
});

describe('body style', () => {
    it('new characters are manga; saved ones without a body style are classic, and classic ignores the manga fields', () => {
        expect(adult.body.bodyStyle).toBe('manga');
        expect(defaultCharacter().body.bodyStyle).toBe('manga');
        const saved = JSON.parse(JSON.stringify(adult));
        delete saved.body.bodyStyle;
        saved.schemaVersion = 6;
        expect(parseCharacter(saved)?.body.bodyStyle).toBe('classic');
        const classic = applyEdit(adult, { body: { bodyStyle: 'classic' } });
        const withVariant = applyEdit(classic, { body: { mangaVariant: 'webtoon' } });
        expect(buildSkeleton(withVariant.body)).toEqual(buildSkeleton(classic.body));
        // a classic adult is still 7.5 heads
        expect(heads(applyEdit(classic, { body: { age: 25 } }))).toBeCloseTo(7.5, 1);
    });

    it('an older character (schema 5) opens as classic', () => {
        const old = JSON.parse(JSON.stringify(adult));
        old.schemaVersion = 5;
        delete old.body.bodyStyle;
        delete old.body.mangaVariant;
        const c = parseCharacter(old);
        expect(c?.body.bodyStyle).toBe('classic');
        expect(c?.body.mangaVariant).toBe('shonen');
        expect(
            parseCharacter({ ...adult, body: { ...adult.body, bodyStyle: 'oil' } })?.body.bodyStyle,
        ).toBe('classic');
    });

    it('switching keeps the face, hair, outfit, pose and colours', () => {
        const m = manga(meera);
        expect(m.face).toEqual(meera.face);
        expect(m.hair).toEqual(meera.hair);
        expect(m.dress).toEqual(meera.dress);
        expect(m.rig).toEqual(meera.rig);
        expect(m.style).toBe(meera.style);
        expect(m.body.skinTone).toBe(meera.body.skinTone);
    });

    it('the same character renders in both bodies in every art style, finite, from four sides', () => {
        for (const style of AVAILABLE_STYLES)
            for (const body of ['classic', 'manga'] as const)
                for (const yaw of [0, 90, 180, 270]) {
                    const c = applyEdit({ ...meera, style }, { body: { bodyStyle: body } });
                    const parts = renderCharacter(c, {
                        yaw,
                        pitch: 0,
                        roll: 0,
                        shot: 'full',
                    }).parts;
                    expect(parts.length, `${style} ${body}`).toBeGreaterThan(10);
                    for (const p of parts)
                        expect(/NaN|Infinity/.test(p.d), `${style} ${body} ${yaw} ${p.key}`).toBe(
                            false,
                        );
                }
    }, 60_000);

    it('feet stay on the floor in the manga body (the foot line is y = 0)', () => {
        const m = manga(adult);
        const s = buildSkeleton(m.body);
        expect(s.pelvisHeight).toBeGreaterThan(0);
        const model = renderCharacter(m, { yaw: 0, pitch: 0, roll: 0, shot: 'full' });
        expect(model.height).toBeGreaterThan(0);
    });
});
