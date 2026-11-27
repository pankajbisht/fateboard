/**
 * Outfit presets and dress rules (docs/CHARACTER_STUDIO.md phase 3): 52+ ready looks, each passes the rules
 * unchanged, wearing one changes the dress, and the rules remove what does not go together.
 */
import { describe, expect, it } from 'vitest';
import { resolveDress, takeOff, wear } from '../data/dressRules';
import { BOTTOM_DEFS } from '../data/garments';
import { OUTFITS, OUTFIT_GROUPS } from '../data/outfits';
import { RECIPES, fromRecipe } from '../data/recipes';
import { ACCESSORY_DEFS, SHOE_DEFS } from '../data/wardrobe';
import { parseCharacter } from '../schema/parse';
import { ACCESSORY_KINDS, SHOE_KINDS } from '../schema/types';
import { applyEdit } from '../studio/edit';
import { renderCharacter } from '../render/renderCharacter';

const aarav = fromRecipe(RECIPES[0], 'a');

describe('outfits', () => {
    it('has at least 52 presets with unique ids, in known groups', () => {
        expect(OUTFITS.length).toBeGreaterThanOrEqual(52);
        expect(new Set(OUTFITS.map((o) => o.id)).size).toBe(OUTFITS.length);
        for (const o of OUTFITS) expect(Object.keys(OUTFIT_GROUPS)).toContain(o.group);
    });

    it('every preset passes the dress rules unchanged', () => {
        for (const o of OUTFITS) {
            const r = resolveDress(o.dress);
            expect(r.removed, o.id).toEqual([]);
        }
    });

    it('every preset draws, finite, on a body', () => {
        for (const o of OUTFITS) {
            const c = applyEdit(aarav, {
                ...o.dress,
                top: o.dress.top,
                accessories: o.dress.accessories,
            });
            expect(c.dress.accessories.length, o.id).toBe(o.dress.accessories.length);
            for (const p of renderCharacter(c, { yaw: 20, pitch: 0, roll: 0, shot: 'full' }).parts)
                expect(p.d.includes('NaN'), `${o.id} ${p.key}`).toBe(false);
        }
    });
});

describe('shoes and accessories', () => {
    it('are all defined', () => {
        for (const k of SHOE_KINDS) expect(SHOE_DEFS[k].name).toBeTruthy();
        for (const k of ACCESSORY_KINDS) expect(ACCESSORY_DEFS[k].name).toBeTruthy();
        expect(SHOE_KINDS).toHaveLength(13);
        // + the reference characters' collar bow, hair clip and socks
        expect(ACCESSORY_KINDS).toHaveLength(34);
    });

    it('every accessory draws on its own, from the front and the back', () => {
        for (const k of ACCESSORY_KINDS)
            for (const yaw of [0, 180]) {
                const c = applyEdit(aarav, {
                    top: { kind: 'shirt' },
                    accessories: [{ kind: k, color: ACCESSORY_DEFS[k].color }],
                });
                const ps = renderCharacter(c, { yaw, pitch: 0, roll: 0, shot: 'full' }).parts;
                for (const p of ps) expect(p.d.includes('NaN'), `${k} ${yaw} ${p.key}`).toBe(false);
            }
    });

    it('a head cover hides the hair it covers', () => {
        const hair = (accessories: { kind: 'turban'; color: string }[]) =>
            renderCharacter(applyEdit(aarav, { accessories }), {
                yaw: 0,
                pitch: 0,
                roll: 0,
                shot: 'full',
            }).parts.filter((p) => p.key.startsWith('hair'));
        const bare = hair([]);
        expect(bare.length).toBeGreaterThan(0);
        expect(hair([{ kind: 'turban', color: '#f97316' }]).length).toBeLessThan(bare.length);
    });
});

describe('dress rules', () => {
    const base = aarav.dress;
    it('one accessory per place: the new one replaces the old', () => {
        const d = wear(wear(base, 'cap'), 'beanie');
        expect(d.accessories.map((a) => a.kind)).toEqual(['beanie']);
    });
    it('a tie needs a shirt collar', () => {
        const d = wear({ ...base, top: { kind: 'tank', color: '#fff' } }, 'tie');
        expect(d.accessories).toEqual([]);
        const r = resolveDress({
            ...base,
            top: { kind: 'tank', color: '#fff' },
            accessories: [{ kind: 'tie', color: '#000' }],
        });
        expect(r.removed[0].reason).toMatch(/collar/);
    });
    it('earrings and a bindi do not go with a helmet, whatever the order', () => {
        const a = resolveDress({
            ...base,
            accessories: [
                { kind: 'earrings', color: '#d4a017' },
                { kind: 'helmet', color: '#facc15' },
            ],
        });
        expect(a.dress.accessories.map((x) => x.kind)).toEqual(['helmet']);
    });
    it('a hood under a jacket: a scarf does not go over a hood', () => {
        const r = resolveDress({
            ...base,
            top: { kind: 'hoodie', color: '#444' },
            accessories: [{ kind: 'scarf', color: '#d00' }],
        });
        expect(r.removed).toHaveLength(1);
    });
    it('taking one off leaves the rest', () => {
        expect(
            takeOff(wear(wear(base, 'glasses'), 'watch'), 'glasses').accessories.map((a) => a.kind),
        ).toEqual(['watch']);
    });
    it('a saved v3 character loads with default shoes and no accessories', () => {
        const old = JSON.parse(JSON.stringify(aarav));
        old.schemaVersion = 3;
        old.dress.shoes = { color: old.dress.shoes.color };
        delete old.dress.accessories;
        const c = parseCharacter(old);
        expect(c?.dress.shoes.kind).toBe('sneakers');
        expect(c?.dress.shoes.color).toBe(aarav.dress.shoes.color);
        expect(c?.dress.accessories).toEqual([]);
    });
});

describe('combat-sport kit (BUG-280)', () => {
    it('Muay Thai shorts are named for what they are, and a boxer wears boxing trunks', () => {
        expect(BOTTOM_DEFS['muay-thai-shorts'].name).toBe('Muay Thai shorts');
        expect(BOTTOM_DEFS['boxing-trunks'].name).toBe('Boxing trunks');
        const boxer = OUTFITS.find((o) => o.name === 'Boxer')!;
        expect(boxer.dress.bottom.kind).toBe('boxing-trunks');
        // a headband is Muay Thai / training wear, not a boxer's kit
        expect(boxer.dress.accessories.map((a) => a.kind)).not.toContain('headband');
    });
});
