// @vitest-environment node
/**
 * Who an item is listed for in the studio (2026-11-27, owner: "if male is selected only show the items a male can
 * use, same for female; trans sees everything"; loose tagging: only clearly gendered items are limited).
 */
import { describe, expect, it } from 'vitest';
import { identityOf, listedFor, outfitListed, ONLY_FOR, type Catalog } from '../data/audience';
import { HAIR_DEFS } from '../data/hairStyles';
import { BOTTOM_DEFS, TOP_DEFS } from '../data/garments';
import { OUTFITS } from '../data/outfits';
import { ACCESSORY_DEFS, SHOE_DEFS } from '../data/wardrobe';
import { applyEdit } from '../studio/edit';
import { defaultCharacter, parseCharacter } from '../schema/parse';

const CATALOGS: Record<Catalog, Record<string, unknown>> = {
    hair: HAIR_DEFS,
    top: TOP_DEFS,
    bottom: BOTTOM_DEFS,
    shoes: SHOE_DEFS,
    accessory: ACCESSORY_DEFS,
};

describe('identity', () => {
    it('is kept when valid, dropped when not; without one it follows the frame', () => {
        const c = defaultCharacter();
        expect(parseCharacter({ ...c, identity: 'trans' })!.identity).toBe('trans');
        expect(parseCharacter({ ...c, identity: 'robot' })!.identity).toBeUndefined();
        expect(identityOf({ ...c, body: { ...c.body, gender: 0.2 } })).toBe('male');
        expect(identityOf({ ...c, body: { ...c.body, gender: 0.8 } })).toBe('female');
        expect(identityOf({ ...c, identity: 'trans' })).toBe('trans');
    });

    it('is a studio edit like any other', () => {
        expect(applyEdit(defaultCharacter(), { identity: 'trans' }).identity).toBe('trans');
    });
});

describe('listed items (loose)', () => {
    it('every limited item exists in its catalogue', () => {
        for (const [cat, who] of Object.entries(ONLY_FOR) as [Catalog, typeof ONLY_FOR.hair][])
            for (const id of [...who.female, ...who.male])
                expect(CATALOGS[cat][id], `${cat} ${id}`).toBeDefined();
    });

    it('male: no skirts, blouses, heels, bows; long hair, earrings and leggings stay', () => {
        expect(listedFor('male', 'bottom', 'skirt')).toBe(false);
        expect(listedFor('male', 'top', 'blouse')).toBe(false);
        expect(listedFor('male', 'shoes', 'heels')).toBe(false);
        expect(listedFor('male', 'accessory', 'bow')).toBe(false);
        expect(listedFor('male', 'hair', 'long')).toBe(true);
        expect(listedFor('male', 'accessory', 'earrings')).toBe(true);
        expect(listedFor('male', 'bottom', 'leggings')).toBe(true);
    });

    it('female: no sherwani, dhoti or swim trunks; short cuts and ties stay', () => {
        expect(listedFor('female', 'top', 'sherwani')).toBe(false);
        expect(listedFor('female', 'bottom', 'dhoti')).toBe(false);
        expect(listedFor('female', 'bottom', 'swim-trunks')).toBe(false);
        expect(listedFor('female', 'hair', 'buzz')).toBe(true);
        expect(listedFor('female', 'accessory', 'tie')).toBe(true);
    });

    it('trans: everything', () => {
        for (const [cat, items] of Object.entries(CATALOGS) as [Catalog, object][])
            for (const id of Object.keys(items)) expect(listedFor('trans', cat, id)).toBe(true);
    });

    it('an outfit is listed when every piece of it is', () => {
        const skirted = OUTFITS.find((o) => !listedFor('male', 'bottom', o.dress.bottom.kind))!;
        expect(outfitListed('male', skirted.dress)).toBe(false);
        expect(outfitListed('female', skirted.dress)).toBe(true);
        expect(outfitListed('trans', skirted.dress)).toBe(true);
        // each identity still has outfits in most groups
        for (const who of ['male', 'female'] as const)
            expect(OUTFITS.filter((o) => outfitListed(who, o.dress)).length).toBeGreaterThan(20);
    });
});
