/**
 * The garment library (docs/CHARACTER_STUDIO.md phase 3): 51 tops and 42 bottoms as data, each drawn from every side
 * on every body, each different, collars that hide from behind (a hood shows), who wears what.
 */
import { describe, expect, it } from 'vitest';
import { castRecipes } from '../data/cast';
import {
    BOTTOM_DEFS,
    BOTTOM_IDS,
    CAST_BOTTOM_IDS,
    CAST_TOP_IDS,
    TOP_DEFS,
    TOP_IDS,
    suited,
} from '../data/garments';
import { POSES } from '../data/poses';
import { RECIPES, fromRecipe } from '../data/recipes';
import { renderCharacter } from '../render/renderCharacter';
import {
    BOTTOM_KINDS,
    TOP_KINDS,
    type BottomKind,
    type CharacterCamera,
    type TopKind,
} from '../schema/types';
import { applyEdit } from '../studio/edit';

const cam = (yaw: number): CharacterCamera => ({ yaw, pitch: 0, roll: 0, shot: 'full' });
const aarav = fromRecipe(RECIPES[0], 'a');
const meera = fromRecipe(RECIPES[1], 'm');
const kenji = fromRecipe(RECIPES[8], 'k');
const wear = (c: typeof meera, top: TopKind, bottom: BottomKind) =>
    applyEdit(c, { top: { kind: top }, bottom: { kind: bottom } });
const parts = (c: typeof meera, yaw = 0) => renderCharacter(c, cam(yaw)).parts;
const numbers = (d: string) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

describe('garment catalogue', () => {
    it('the cast draws only from the first batch, so the 100 people stay the same', () => {
        expect(CAST_TOP_IDS).toHaveLength(28);
        expect(CAST_BOTTOM_IDS).toHaveLength(20);
        // the generated people (the hand-made ones may wear anything: the reference pair wears the new collared tops)
        const kinds = new Set<string>(
            castRecipes()
                .slice(RECIPES.length)
                .flatMap((r) => [r.top.kind, r.bottom.kind]),
        );
        for (const k of kinds)
            expect([...CAST_TOP_IDS, ...CAST_BOTTOM_IDS] as string[], k).toContain(k);
    });

    it('has 51 tops and 42 bottoms, each named, with real numbers; the schema lists the same ids', () => {
        expect(TOP_IDS).toHaveLength(51);
        expect(BOTTOM_IDS).toHaveLength(42);
        expect([...TOP_KINDS].sort()).toEqual([...TOP_IDS].sort());
        expect([...BOTTOM_KINDS].sort()).toEqual([...BOTTOM_IDS].sort());
        for (const id of TOP_IDS) {
            const d = TOP_DEFS[id];
            expect(d.name.trim(), id).not.toBe('');
            expect(d.sleeve, id).toBeGreaterThanOrEqual(0);
            expect(d.sleeve, id).toBeLessThanOrEqual(2);
            expect(d.fit, id).toBeGreaterThan(0.9);
        }
        for (const id of BOTTOM_IDS) {
            const d = BOTTOM_DEFS[id];
            expect(d.name.trim(), id).not.toBe('');
            expect(d.skirt > 0 || d.leg > 0, `${id} covers something`).toBe(true);
        }
        // the first three of each keep their ids (saved characters)
        for (const id of ['tshirt', 'longsleeve', 'tank'] as const) expect(TOP_KINDS).toContain(id);
        for (const id of ['pants', 'shorts', 'skirt'] as const) expect(BOTTOM_KINDS).toContain(id);
    });

    it('every top and bottom draws from every 45° on a child, an adult and a tall adult, finite, with every part', () => {
        const bad: string[] = [];
        for (const c of [aarav, meera, kenji])
            // every top and every bottom at least once (and each top with two bottoms), not the full product
            for (const [i, top] of TOP_KINDS.entries())
                for (const bottom of [
                    BOTTOM_KINDS[i % BOTTOM_KINDS.length],
                    BOTTOM_KINDS[(i * 7 + 3) % BOTTOM_KINDS.length],
                ])
                    for (const yaw of [0, 90, 180, 270]) {
                        const ps = parts(wear(c, top, bottom), yaw);
                        for (const p of ps)
                            if (!numbers(p.d).every(Number.isFinite))
                                bad.push(`${c.id} ${top} ${bottom} ${yaw} ${p.key}`);
                        if (!ps.some((p) => p.key === 'torso')) bad.push(`${top} ${bottom} torso`);
                    }
        expect(bad).toEqual([]);
    }, 60_000); // about 1100 renders of a body that now has fingers and joints

    it('every garment looks different from the others (same body, same pose)', () => {
        const draw = (t: TopKind, b: BottomKind) =>
            JSON.stringify(parts(wear(meera, t, b), 30).map((p) => [p.key, p.d, p.fill]));
        const tops = new Map<string, string>();
        for (const t of TOP_KINDS) {
            const k = draw(t, 'pants');
            expect(tops.get(k), `${t} = ${tops.get(k)}`).toBeUndefined();
            tops.set(k, t);
        }
        const bottoms = new Map<string, string>();
        for (const b of BOTTOM_KINDS) {
            const k = draw('tshirt', b);
            expect(bottoms.get(k), `${b} = ${bottoms.get(k)}`).toBeUndefined();
            bottoms.set(k, b);
        }
    });

    it('clothes change the clothes and nothing else: head, hands and feet are the same shapes', () => {
        const keep = (c: typeof meera) =>
            parts(c, 0)
                .filter((p) => ['head', 'footL', 'footR', 'handL-palm'].includes(p.key))
                .map((p) => [p.key, p.d]);
        const base = keep(wear(meera, 'tshirt', 'pants'));
        for (const [t, b] of [
            ['hoodie', 'wide-pants'],
            ['kurta', 'long-skirt'],
            ['vest', 'leggings'],
        ] as const)
            expect(keep(wear(meera, t, b)), `${t} ${b}`).toEqual(base);
    });
});

describe('what each garment is made of', () => {
    it('sleeves: none leaves arms bare, short covers part, long covers all; loose ones are thicker', () => {
        const role = (t: TopKind, key: string) =>
            parts(wear(meera, t, 'pants')).find((p) => p.key === key)?.role;
        expect(role('tank', 'upperArmL')).toBe('skin');
        expect(parts(wear(meera, 'tank', 'pants')).some((p) => p.key.endsWith('-sleeve'))).toBe(
            false,
        );
        expect(
            parts(wear(meera, 'tshirt', 'pants')).some((p) => p.key === 'upperArmL-sleeve'),
        ).toBe(true);
        expect(role('longsleeve', 'lowerArmL')).toBe('top');
        // a hoodie's loose sleeve: the manga arm itself takes the cloth and is wider (no overlay capsule); the classic
        // body still draws an overlay
        expect(role('hoodie', 'lowerArmL')).toBe('top');
        const armW = (t: TopKind) => {
            const d = parts(wear(meera, t, 'pants')).find((p) => p.key === 'upperArmL')!.d;
            const xs = (d.match(/-?\d+(?:\.\d+)?/g) ?? [])
                .map(Number)
                .filter((_, i) => i % 2 === 0);
            return Math.max(...xs) - Math.min(...xs);
        };
        expect(armW('hoodie')).toBeGreaterThan(armW('longsleeve'));
        expect(
            parts(
                applyEdit(wear(meera, 'hoodie', 'pants'), { body: { bodyStyle: 'classic' } }),
            ).some((p) => p.key === 'lowerArmL-sleeve'),
        ).toBe(true);
        // three-quarter (kurta): upper covered, forearm partly
        expect(parts(wear(meera, 'kurta', 'pants')).some((p) => p.key === 'lowerArmL-sleeve')).toBe(
            true,
        );
    });

    it('legs: shorts leave the shin bare, capri covers part of it, trousers all; skirts are a shell', () => {
        const has = (b: BottomKind, key: string) =>
            parts(wear(meera, 'tshirt', b)).some((p) => p.key === key);
        expect(
            parts(wear(meera, 'tshirt', 'shorts')).find((p) => p.key === 'lowerLegL')!.role,
        ).toBe('skin');
        expect(has('capri', 'lowerLegL-cloth')).toBe(true);
        expect(parts(wear(meera, 'tshirt', 'pants')).find((p) => p.key === 'lowerLegL')!.role).toBe(
            'bottom',
        );
        for (const s of ['skirt', 'mini-skirt', 'long-skirt'] as const)
            expect(has(s, 'skirt'), s).toBe(true);
        expect(has('pants', 'skirt')).toBe(false);
    });

    it('a long skirt hangs lower than a mini skirt (in the picture)', () => {
        const bottom = (b: BottomKind) => {
            const d = parts(wear(meera, 'tshirt', b)).find((p) => p.key === 'skirt')!.d;
            const ys = numbers(d).filter((_, i) => i % 2 === 1);
            return Math.max(...ys);
        };
        expect(bottom('long-skirt')).toBeGreaterThan(bottom('skirt'));
        expect(bottom('skirt')).toBeGreaterThan(bottom('mini-skirt'));
    });

    it('long tops hang: a tunic shell for hip, thigh and knee lengths, none for waist-length', () => {
        const tunic = (t: TopKind) => parts(wear(meera, t, 'pants')).some((p) => p.key === 'tunic');
        expect(tunic('tshirt')).toBe(false);
        for (const t of ['shirt', 'hoodie', 'kurta'] as const) expect(tunic(t), t).toBe(true);
    });

    it('collars show from the front, hide from behind, and a hood shows from behind', () => {
        const names = (t: TopKind, yaw: number) =>
            parts(wear(meera, t, 'pants'), yaw).map((p) => p.key);
        expect(names('polo', 0)).toContain('neckline');
        expect(names('polo', 180)).not.toContain('neckline');
        expect(names('tshirt', 0)).toContain('collar-crew');
        expect(names('tshirt', 180)).not.toContain('collar-crew');
        expect(names('kurta', 0)).toContain('collar-high');
        expect(names('jacket', 0)).toContain('zip');
        expect(names('hoodie', 180)).toContain('collar-hood');
        expect(names('tank', 0).some((k) => k.startsWith('collar') || k === 'neckline')).toBe(
            false,
        );
    });

    it('folds only on loose cloth, from the front', () => {
        const folds = (t: TopKind, yaw = 0) =>
            parts(wear(meera, t, 'pants'), yaw).some((p) => p.key.startsWith('fold'));
        expect(folds('hoodie')).toBe(true);
        expect(folds('sweater')).toBe(true);
        expect(folds('tshirt')).toBe(false);
        expect(folds('hoodie', 180)).toBe(false);
    });

    it('clothes follow every pose (sit, kick, dance): finite on a sample of poses, kurta and long skirt included', () => {
        const bad: string[] = [];
        for (const pose of POSES.filter((_, i) => i % 6 === 0))
            for (const [t, b] of [
                ['kurta', 'long-skirt'],
                ['hoodie', 'wide-pants'],
            ] as const)
                for (const p of parts({ ...wear(meera, t, b), rig: { pose } }, 45))
                    if (!numbers(p.d).every(Number.isFinite)) bad.push(`${pose.id} ${t} ${p.key}`);
        expect(bad).toEqual([]);
    });
});

describe('who wears what', () => {
    it('skirts and blouses are feminine, the rest mostly any; the cast and Surprise me follow it', () => {
        expect(suited(BOTTOM_DEFS['long-skirt'].suits, true)).toBe(true);
        expect(suited(BOTTOM_DEFS['long-skirt'].suits, false)).toBe(false);
        expect(suited(TOP_DEFS.hoodie.suits, false)).toBe(true);
        const generated = castRecipes().slice(RECIPES.length);
        for (const r of generated) {
            const female = r.gender >= 0.5;
            expect(suited(TOP_DEFS[r.top.kind].suits, female), `${r.id} ${r.top.kind}`).toBe(true);
            expect(
                suited(BOTTOM_DEFS[r.bottom.kind].suits, female),
                `${r.id} ${r.bottom.kind}`,
            ).toBe(true);
        }
        expect(new Set(generated.map((r) => r.top.kind)).size).toBeGreaterThanOrEqual(8);
        expect(new Set(generated.map((r) => r.bottom.kind)).size).toBeGreaterThanOrEqual(7);
    });
});
