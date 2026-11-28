// @vitest-environment node
/**
 * Male, female and in-between bodies (docs/CHARACTER_STUDIO.md, gender pass). The frame (shoulders, waist, hips,
 * limbs: `body.gender`, 0 male … 1 female) and the bust (`body.bust`) are separate, so any body can be made: a man, a
 * woman, a trans or nonbinary person with any mix. The bust follows the frame until it is set by hand.
 */
import { describe, expect, it } from 'vitest';
import { poseById } from '../data/poses';
import { RECIPES, fromRecipe } from '../data/recipes';
import { renderCharacter } from '../render/renderCharacter';
import { buildSkeleton } from '../rig/skeleton';
import { migrateCharacter } from '../schema/migrate';
import { parseCharacter } from '../schema/parse';
import { CHARACTER_SCHEMA_VERSION } from '../schema/types';
import { applyEdit } from '../studio/edit';

const adult = applyEdit(fromRecipe(RECIPES[4], 'a'), {
    body: { age: 25 },
    pose: poseById('stand')!,
    top: { kind: 'tshirt' },
});
const keys = (c: typeof adult) =>
    renderCharacter(c, { yaw: 0, pitch: 0, roll: 0, shot: 'full' }).parts.map((p) => p.key);

describe('the bust is its own setting', () => {
    it('follows the frame until set by hand, then stays', () => {
        const f = applyEdit(adult, { body: { gender: 1 } });
        expect(f.body.bust).toBe(1);
        const m = applyEdit(f, { body: { gender: 0 } });
        expect(m.body.bust).toBe(0);
        const set = applyEdit(m, { body: { bust: 0.7 } });
        expect(set.body.overridden).toContain('bust');
        expect(applyEdit(set, { body: { gender: 1 } }).body.bust).toBe(0.7);
        // choosing a body type puts it back in step with the frame
        expect(applyEdit(set, { body: { gender: 0.5 }, resetBust: true }).body.bust).toBe(0.5);
    });

    it('any frame takes any bust: a male frame with a bust, a female frame with a flat chest', () => {
        const maleBust = buildSkeleton(applyEdit(adult, { body: { gender: 0, bust: 1 } }).body);
        const femaleFlat = buildSkeleton(applyEdit(adult, { body: { gender: 1, bust: 0 } }).body);
        expect(maleBust.size.bust).toBeGreaterThan(0.5);
        expect(femaleFlat.size.bust).toBe(0);
        // the frame stays its own: the male frame keeps its shoulders
        const female = buildSkeleton(applyEdit(adult, { body: { gender: 1 } }).body);
        expect(maleBust.size.shoulderW).toBeGreaterThan(female.size.shoulderW);
        for (const c of [
            applyEdit(adult, { body: { gender: 0, bust: 1 } }),
            applyEdit(adult, { body: { gender: 1, bust: 0 } }),
            applyEdit(adult, { body: { gender: 0.5, bust: 0.5 } }),
        ])
            for (const p of renderCharacter(c, { yaw: 30, pitch: 0, roll: 0, shot: 'full' }).parts)
                expect(/NaN|Infinity/.test(p.d), p.key).toBe(false);
    });

    it('a muscular man shows the lower edge of the pectorals, a slim one none (reference sheet); a woman her bust', () => {
        const man = applyEdit(adult, { body: { gender: 0, muscle: 0.6 } });
        expect(keys(man)).toContain('chest-1');
        expect(keys(applyEdit(man, { body: { muscle: 0.2 } }))).not.toContain('chest-1');
        // (the manga bust draws its lines on the chest's surface: mangaTorso.ts addUnderBust)
        const woman = applyEdit(adult, { body: { gender: 1 } });
        expect(keys(woman)).toContain('under-bust1');
        // a child has neither
        expect(keys(applyEdit(man, { body: { age: 8 } }))).not.toContain('chest-1');
    });
});

describe('schema 8', () => {
    it('an older character gets a bust that follows its frame', () => {
        const old = JSON.parse(JSON.stringify(applyEdit(adult, { body: { gender: 0.8 } })));
        old.schemaVersion = 7;
        delete old.body.bust;
        old.body.overridden = [];
        expect(migrateCharacter(old)!.schemaVersion).toBe(CHARACTER_SCHEMA_VERSION);
        expect(parseCharacter(old)!.body.bust).toBe(0.8);
    });
});
