// @vitest-environment node
/**
 * Fight exchanges, combos, effects and clips (docs/COMBAT_PACK.md, Stages 3–5): strikes land on the defender for
 * any similar heights, the defender's answer is timed to the impact, a placed exchange draws its effects, and a
 * combo becomes a clip of drawings for the timeline.
 */
import { describe, expect, it } from 'vitest';
import { RECIPES, fromRecipe } from '@/character/data/recipes';
import { pointOn, solveFK } from '@/character/rig/fk';
import { ground } from '@/character/rig/grounding';
import { buildSkeleton } from '@/character/rig/skeleton';
import { impactPoint } from '../combat/camera';
import { COMBO_PRESETS, bakeCombo, parseCombo } from '../combat/choreo';
import { buildFightClip } from '../combat/clip';
import { EXCHANGES } from '../combat/exchanges';
import { moveById } from '@/character/combat/registry';
import { placeExchange, solveExchange } from '../combat/fight';
import { FX_LEVELS, impactShapes, shakeOffset } from '../fx/impact';
import { renderScene } from '../render/renderScene';
import { newScene, parseScene } from '../schema/parse';
import type { Scene } from '../schema/types';

const body = (r: number) => fromRecipe(RECIPES[r], `r${r}`).body;
const actor = (id: string, r: number, x: number) => ({
    id,
    character: fromRecipe(RECIPES[r], id),
    x,
    z: 0,
    facing: 0,
    lookAt: null,
});
const pair = (a = 4, b = 8): Scene => ({
    ...newScene(),
    actors: [actor('a', a, -80), actor('b', b, 80)],
});
// recipe 4 is 174 cm and recipe 8 is 189 cm: similar heights, either way round
const SIMILAR: [number, number][] = [
    [4, 4],
    [4, 8],
    [8, 4],
    [8, 8],
];

describe('exchanges', () => {
    it('every exchange names real moves and solves for every pair of builds', () => {
        for (const x of EXCHANGES.all)
            for (const [a, b] of [...SIMILAR, [0, 0] as [number, number]])
                expect(solveExchange(body(a), body(b), x.id), `${x.id} ${a}/${b}`).not.toBeNull();
    });

    // fists 6 cm, knees and kicks 9 cm, elbows 12 cm (an elbow only reaches an upper arm past the shoulder: a
    // taller opponent's jaw is at the edge of it)
    const LIMIT = { hand: 6, foot: 9, shin: 9, knee: 9, elbow: 12 };
    it('lands the strike on the defender for similar heights, the two never overlapping', () => {
        for (const x of EXCHANGES.all)
            for (const [a, b] of SIMILAR) {
                const r = solveExchange(body(a), body(b), x.id)!;
                const limb = moveById(x.attack)!.strike?.limb ?? 'hand';
                expect(r.error, `${x.id} ${a}/${b}`).toBeLessThanOrEqual(LIMIT[limb]);
                const sa = buildSkeleton(body(a));
                const sb = buildSkeleton(body(b));
                expect(r.gap).toBeGreaterThanOrEqual(
                    (sa.size.chestDepth + sb.size.chestDepth) * 0.5,
                );
            }
    });

    it('a slip or duck takes the head off the line: the punch passes where it was', () => {
        for (const id of ['jab-slip', 'cross-slip', 'hook-duck']) {
            const r = solveExchange(body(4), body(4), id)!;
            const sb = buildSkeleton(body(4));
            const head = (p: typeof r.b.start) => {
                const f = ground(sb, solveFK(sb, p), p.ground);
                return pointOn(f, 'head', [0, 0, 0]);
            };
            const moved = Math.hypot(
                ...([0, 1, 2].map((i) => head(r.b.peak)[i] - head(r.b.start)[i]) as [
                    number,
                    number,
                    number,
                ]),
            );
            expect(moved, id).toBeGreaterThan(6);
        }
    });

    it('places the two facing each other, records the effects, and they survive a save', () => {
        const { scene, error } = placeExchange(pair(), 'a', 'b', 'cross-hit');
        expect(error).toBeLessThan(9);
        const [a, b] = scene.actors;
        expect(a.x).toBeLessThan(b.x);
        expect([a.facing, b.facing]).toEqual([90, 270]);
        expect(scene.fight).toMatchObject({ attacker: 'a', defender: 'b', exchange: 'cross-hit' });
        const again = parseScene(JSON.parse(JSON.stringify(scene)))!;
        expect(again.fight).toEqual(scene.fight);
        // without the attacker the effects are dropped
        const gone = parseScene({
            ...JSON.parse(JSON.stringify(scene)),
            actors: [scene.actors[1]],
        })!;
        expect(gone.fight).toBeUndefined();
        expect(impactPoint(scene)).not.toBeNull();
    });

    it('draws the impact effects at the impact only, and only while the attacker holds that pose', () => {
        const flash = (s: Scene) =>
            renderScene(s).items.filter((d) => d.key.startsWith('fight-fx-flash')).length;
        const hit = placeExchange(pair(), 'a', 'b', 'cross-hit').scene;
        expect(flash(hit)).toBeGreaterThan(0);
        expect(flash(placeExchange(pair(), 'a', 'b', 'cross-hit', { key: 'start' }).scene)).toBe(0);
        expect(flash({ ...hit, fight: { ...hit.fight!, intensity: 'off' } })).toBe(0);
        const other = { ...hit.actors[0].character.rig.pose, id: 'stand' };
        const moved = {
            ...hit,
            actors: [
                {
                    ...hit.actors[0],
                    character: { ...hit.actors[0].character, rig: { pose: other } },
                },
                hit.actors[1],
            ],
        };
        expect(flash(moved)).toBe(0);
        // a miss shows motion only
        expect(flash(placeExchange(pair(), 'a', 'b', 'jab-slip').scene)).toBe(0);
    });
});

describe('combos', () => {
    it('bakes every preset into equal frame lists with the impacts in order', () => {
        for (const c of COMBO_PRESETS.all) {
            const b = bakeCombo(body(4), body(8), c);
            expect(b.a.length, c.id).toBe(b.b.length);
            expect(b.steps, c.id).toHaveLength(c.steps.length);
            for (let i = 1; i < b.steps.length; i++)
                expect(b.steps[i].hit).toBeGreaterThan(b.steps[i - 1].hit);
            for (const s of b.steps) expect(s.hit).toBeLessThan(b.a.length);
        }
    });

    it('turning the freeze off makes the combo shorter', () => {
        const c = COMBO_PRESETS.get('ko-sequence');
        const on = bakeCombo(body(4), body(8), c);
        const off = bakeCombo(body(4), body(8), c, { hitStop: false });
        expect(off.a.length).toBeLessThan(on.a.length);
    });

    it('reads a saved combo, drops unknown exchanges and refuses junk', () => {
        expect(parseCombo(null)).toBeNull();
        expect(parseCombo({ steps: [{ exchange: 'nope' }] })).toBeNull();
        const c = parseCombo({
            name: 'Mine',
            stanceA: 'southpaw',
            steps: [{ by: 'b', exchange: 'jab-slip' }, { exchange: 'nope' }, 'junk'],
        })!;
        expect(c.steps).toEqual([{ by: 'b', exchange: 'jab-slip' }]);
        expect([c.stanceA, c.stanceB]).toEqual(['southpaw', 'orthodox']);
    });
});

describe('effects', () => {
    const ctx = { k: 0, at: [500, 300] as [number, number], angle: 0, frameH: 560 };
    it('are the same every time (seeded), scale with strength, and a miss has no burst', () => {
        const a = impactShapes({ ...ctx, intensity: 'normal' });
        expect(impactShapes({ ...ctx, intensity: 'normal' })).toEqual(a);
        const size = (i: 'subtle' | 'dramatic') =>
            impactShapes({ ...ctx, intensity: i }).find((s) => s.key === 'fx-flash')!.d.length;
        expect(size('dramatic')).toBeGreaterThan(size('subtle'));
        const miss = impactShapes({ ...ctx, intensity: 'dramatic', contact: 'miss' });
        expect(miss.some((s) => s.key === 'fx-flash')).toBe(false);
        expect(
            impactShapes({ ...ctx, intensity: 'normal', on: { flash: false } }).some(
                (s) => s.key === 'fx-flash',
            ),
        ).toBe(false);
    });

    it('shake dies out after its frames', () => {
        const lv = FX_LEVELS.normal;
        expect(shakeOffset(0, 560, lv)).not.toEqual([0, 0]);
        expect(shakeOffset(lv.shakeFrames, 560, lv)).toEqual([0, 0]);
        expect(shakeOffset(-1, 560, lv)).toEqual([0, 0]);
    });
});

describe('clips', () => {
    it('a knockout combo is at most 72 drawings and ends on a zoom; sparring has no zoom', () => {
        const ko = buildFightClip(pair(), 'a', 'b', COMBO_PRESETS.get('ko-sequence'))!;
        expect(ko.frames.length).toBeLessThanOrEqual(72);
        expect(ko.hits.length).toBeGreaterThanOrEqual(3);
        expect(ko.fullFrom).toBeLessThan(ko.frames.length);
        expect(ko.frames.slice(ko.fullFrom).every((f) => f.full)).toBe(true);
        expect(Number.isFinite(ko.near)).toBe(true);
        const sp = buildFightClip(pair(), 'a', 'b', COMBO_PRESETS.get('sparring'))!;
        expect(sp.fullFrom).toBe(sp.frames.length);
        // every frame holds only the two fighters; the place (and everyone else) is the base
        expect(sp.frames.every((f) => f.scene.actors.length === 2)).toBe(true);
        expect(sp.base.actors).toHaveLength(0);
        expect(buildFightClip(pair(), 'a', 'a', COMBO_PRESETS.get('sparring'))).toBeNull();
    });

    it('fighter a stays on the left whoever attacks', () => {
        const sp = buildFightClip(pair(), 'a', 'b', COMBO_PRESETS.get('sparring'))!;
        for (const f of sp.frames) {
            const [a, b] = f.scene.actors;
            expect(a.x).toBeLessThan(b.x);
        }
    });

    it('splits a scene into set, actors and the over layer without losing a shape', () => {
        const s: Scene = {
            ...pair(),
            set: { ...pair().set, environment: 'boxing-ring', variant: 'spotlight' },
            actors: [],
        };
        const all = renderScene(s).items.length;
        const near = 900;
        expect(
            renderScene(s, 'set', near).items.length + renderScene(s, 'over', near).items.length,
        ).toBe(all);
        expect(renderScene(pair(), 'actors').items.length).toBeGreaterThan(0);
    });
});
