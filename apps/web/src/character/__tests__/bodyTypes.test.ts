// @vitest-environment node
/** Body type presets (2026-11-27): six builds, each in a male and a female version. */
import { describe, expect, it } from 'vitest';
import { BODY_TYPES, BODY_TYPE_SHAPES, bodyTypeEdit, bodyTypeOf } from '../data/bodyTypes';
import { applyEdit } from '../studio/edit';
import { defaultCharacter } from '../schema/parse';
import type { Character } from '../schema/types';

const as = (identity: Character['identity'], gender: number): Character => {
    const c = defaultCharacter();
    return { ...c, identity, body: { ...c.body, gender, bust: gender } };
};

describe('body types', () => {
    it('six types, each with a male and a female version in range', () => {
        expect(BODY_TYPES).toEqual(['slim', 'lean', 'average', 'athletic', 'muscular', 'heavy']);
        for (const t of BODY_TYPES)
            for (const v of ['male', 'female'] as const)
                for (const x of Object.values(BODY_TYPE_SHAPES[t][v])) {
                    expect(x).toBeGreaterThanOrEqual(0);
                    expect(x).toBeLessThanOrEqual(1);
                }
    });

    it('builds read as named: lean is slim with muscle, muscular has the most, heavy the most fat', () => {
        for (const v of ['male', 'female'] as const) {
            const s = (t: (typeof BODY_TYPES)[number]) => BODY_TYPE_SHAPES[t][v];
            expect(s('lean').muscle).toBeGreaterThan(s('slim').muscle);
            expect(s('lean').fat).toBeLessThan(s('average').fat);
            expect(s('athletic').muscle).toBeGreaterThan(s('average').muscle);
            expect(s('muscular').muscle).toBeGreaterThan(s('athletic').muscle);
            expect(s('heavy').fat).toBeGreaterThan(s('average').fat);
        }
        // the female version has narrower shoulders and wider hips than the male one
        for (const t of BODY_TYPES) {
            expect(BODY_TYPE_SHAPES[t].female.shoulderWidth).toBeLessThan(
                BODY_TYPE_SHAPES[t].male.shoulderWidth,
            );
            expect(BODY_TYPE_SHAPES[t].female.hipWidth).toBeGreaterThan(
                BODY_TYPE_SHAPES[t].male.hipWidth,
            );
        }
    });

    it('the version follows the identity (a trans character: the frame)', () => {
        expect(bodyTypeEdit(as('male', 1), 'athletic').body).toEqual(
            BODY_TYPE_SHAPES.athletic.male,
        );
        expect(bodyTypeEdit(as('female', 0), 'athletic').body).toEqual(
            BODY_TYPE_SHAPES.athletic.female,
        );
        expect(bodyTypeEdit(as('trans', 0.8), 'lean').body).toEqual(BODY_TYPE_SHAPES.lean.female);
        expect(bodyTypeEdit(as('trans', 0.2), 'lean').body).toEqual(BODY_TYPE_SHAPES.lean.male);
    });

    it('applied, the studio shows it as the current type; a slider moved by hand clears it', () => {
        const c = as('female', 1);
        const d = applyEdit(c, bodyTypeEdit(c, 'muscular'));
        expect(bodyTypeOf(d)).toBe('muscular');
        expect(bodyTypeOf(applyEdit(d, { body: { fat: 0.6 } }))).toBeNull();
    });
});
