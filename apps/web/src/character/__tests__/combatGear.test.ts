/**
 * Combat-sport gear (docs/COMBAT_PACK.md, schema v9): held gloves migrate to worn ones, gloves empty the hands and
 * close the fist, every gear item is drawn, and the "Combat sports" outfits pass the dress rules unchanged.
 */
import { describe, expect, it } from 'vitest';
import { resolveDress } from '../data/dressRules';
import { OUTFITS } from '../data/outfits';
import { BJJ_BELTS } from '../data/outfitsCombat';
import { RECIPES, fromRecipe } from '../data/recipes';
import { handShapeFor } from '../render/props';
import { renderCharacter } from '../render/renderCharacter';
import { parseCharacter } from '../schema/parse';
import type { AccessoryKind, CharacterCamera } from '../schema/types';
import { CHARACTER_SCHEMA_VERSION } from '../schema/types';
import { applyEdit } from '../studio/edit';

const cam = (yaw: number): CharacterCamera => ({ yaw, pitch: 0, roll: 0, shot: 'full' });
const kabir = fromRecipe(RECIPES[4], 'k');
const fighter = applyEdit(kabir, {
    top: { kind: 'tank' },
    bottom: { kind: 'fight-shorts' },
    shoes: { kind: 'barefoot' },
});
const wearing = (kind: AccessoryKind) =>
    applyEdit(fighter, { accessories: [{ kind, color: '#dc2626' }] });

describe('combat gear', () => {
    it('is schema v9: held boxing gloves from v8 become worn gloves', () => {
        expect(CHARACTER_SCHEMA_VERSION).toBe(9);
        const v8 = JSON.parse(JSON.stringify(kabir));
        v8.schemaVersion = 8;
        v8.dress.held = [{ kind: 'boxing-gloves', hand: 'both' }];
        v8.dress.accessories = [];
        const c = parseCharacter(v8)!;
        expect(c.dress.held).toEqual([]);
        expect(c.dress.accessories.map((a) => a.kind)).toEqual(['boxing-gloves']);
    });

    it('gloves empty the hands; boxing gloves close the fist, open-finger gloves do not', () => {
        for (const kind of ['boxing-gloves', 'mma-gloves'] as const) {
            const { dress } = resolveDress({
                ...fighter.dress,
                held: [{ kind: 'katana', hand: 'R' }],
                accessories: [{ kind, color: '#111111' }],
            });
            expect(dress.held, kind).toEqual([]);
        }
        expect(handShapeFor(wearing('boxing-gloves'), 'L', 'open')).toBe('fist');
        expect(handShapeFor(wearing('mma-gloves'), 'L', 'open')).toBe('open');
    });

    const DRAWN: [AccessoryKind, string, number][] = [
        ['boxing-gloves', 'acc-glove', 0],
        ['mma-gloves', 'acc-glove', 0],
        ['hand-wraps', 'acc-wrap', 0],
        ['prajioud', 'acc-prajioud', 0],
        ['ankle-wraps', 'acc-ankle', 0],
        ['gi-belt', 'acc-gi-belt', 0],
        ['mongkol', 'acc-mongkol', 0],
        ['head-guard', 'acc-head-guard', 0],
        ['mouthguard', 'acc-mouthguard', 0],
    ];
    for (const [kind, key, yaw] of DRAWN)
        it(`draws ${kind}`, () => {
            const parts = renderCharacter(wearing(kind), cam(yaw)).parts;
            expect(parts.some((p) => p.key.startsWith(key))).toBe(true);
            // and nothing is drawn for it when it is not worn
            expect(
                renderCharacter(fighter, cam(yaw)).parts.some((p) => p.key.startsWith(key)),
            ).toBe(false);
        });

    it('has the combat-sports kits, each unchanged by the dress rules, and the five BJJ belts', () => {
        const kits = OUTFITS.filter((o) => o.group === 'fight');
        expect(kits.length).toBeGreaterThanOrEqual(12);
        for (const o of kits) expect(resolveDress(o.dress).removed, o.name).toEqual([]);
        const belts = kits.flatMap((o) => o.dress.accessories.filter((a) => a.kind === 'gi-belt'));
        expect(new Set(belts.map((b) => b.color))).toEqual(new Set(Object.values(BJJ_BELTS)));
    });
});
