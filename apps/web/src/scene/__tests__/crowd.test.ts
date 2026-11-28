// @vitest-environment node
/**
 * Crowds (docs/CHARACTER_STUDIO.md phase 10): simple extras filling the place behind the characters: the count asked
 * for, always the same people for the same seed, never on the stage, and every place still renders with one.
 */
import { describe, expect, it } from 'vitest';
import { RECIPES, fromRecipe } from '@/character/data/recipes';
import { renderScene } from '../render/renderScene';
import { newScene, parseScene } from '../schema/parse';
import type { Scene } from '../schema/types';
import { crowdPieces } from '../sets/crowd';
import { ENVIRONMENTS } from '../sets/registry';
import { seeded } from '../world/random';
import { applySceneEdit } from '../studio/edit';

const scene = (env: string, crowd: number): Scene => {
    const s = newScene();
    const def = ENVIRONMENTS.get(env);
    s.set = { ...s.set, environment: env, crowd };
    s.camera = { ...s.camera, ...def.camera, position: [...def.camera.position] };
    s.actors = [0, 3].map((r, i) => ({
        id: `a${i}`,
        character: fromRecipe(RECIPES[r], `a${i}`),
        x: def.stage.x + (i ? 70 : -70),
        z: def.stage.z,
        facing: 0,
        lookAt: null,
    }));
    return s;
};

describe('crowdPieces', () => {
    const env = ENVIRONMENTS.get('stadium');

    it('gives the count asked for outdoors, as people (cards), none for zero', () => {
        expect(crowdPieces(seeded(1), 0, env)).toEqual([]);
        const c = crowdPieces(seeded(1), 40, env);
        expect(c).toHaveLength(40);
        expect(c.every((p) => p.kind === 'card' && p.shape === 'person')).toBe(true);
    });

    it('is the same crowd for the same seed, a different one for another', () => {
        expect(crowdPieces(seeded(7), 30, env)).toEqual(crowdPieces(seeded(7), 30, env));
        expect(crowdPieces(seeded(7), 30, env)).not.toEqual(crowdPieces(seeded(8), 30, env));
    });

    it('keeps the stage clear and stands everyone behind the actors, apart from each other, in every place', () => {
        for (const e of ENVIRONMENTS.all) {
            const crowd = crowdPieces(seeded(3), 60, e);
            expect(crowd.length, e.id).toBeGreaterThan(0);
            for (const [i, p] of crowd.entries()) {
                if (p.kind !== 'card') continue;
                // behind the actors (they stand on z ≈ stage.z) and outside the stage circle
                expect(p.at[2], `${e.id} ${i}`).toBeLessThan(e.stage.z - 100);
                expect(
                    Math.hypot(p.at[0] - e.stage.x, p.at[2] - e.stage.z),
                    `${e.id} ${i}`,
                ).toBeGreaterThan(e.stage.spread * 0.6);
                for (const q of crowd.slice(i + 1))
                    if (q.kind === 'card')
                        expect(
                            Math.hypot(p.at[0] - q.at[0], p.at[2] - q.at[2]),
                        ).toBeGreaterThanOrEqual(50);
            }
        }
    });

    it('people differ: heights, clothes and skin', () => {
        const c = crowdPieces(seeded(5), 50, env).flatMap((p) => (p.kind === 'card' ? [p] : []));
        expect(new Set(c.map((p) => Math.round(p.height / 5))).size).toBeGreaterThan(3);
        expect(new Set(c.map((p) => p.colors?.[0])).size).toBeGreaterThan(5);
        expect(new Set(c.map((p) => p.colors?.[1])).size).toBeGreaterThan(3);
    });
});

describe('a scene with a crowd', () => {
    it('draws more, still deterministically, and nothing else changes: the characters are the same drawing', () => {
        const none = renderScene(scene('market', 0));
        const lots = renderScene(scene('market', 50));
        expect(lots.items.length).toBeGreaterThan(none.items.length + 50);
        expect(renderScene(scene('market', 50))).toEqual(lots);
        const mine = (m: typeof none) => m.items.filter((d) => d.actor === 'a0').map((d) => d.d);
        expect(mine(lots)).toEqual(mine(none));
    });

    it('every place renders with a full crowd: finite, drawing budget kept, the characters in the picture', () => {
        for (const e of ENVIRONMENTS.all) {
            const m = renderScene(scene(e.id, 80));
            expect(m.items.length, e.id).toBeLessThan(4500);
            for (const d of m.items)
                expect(/NaN|Infinity/.test(d.d), `${e.id} ${d.key}`).toBe(false);
            expect(
                m.actors.map((a) => a.id),
                e.id,
            ).toEqual(['a0', 'a1']);
        }
    });

    it('the setting is repaired (0–80, whole numbers), changes through a set edit, and is in the saved scene', () => {
        expect(parseScene({ set: { crowd: 500 } })!.set.crowd).toBe(80);
        expect(parseScene({ set: { crowd: -3 } })!.set.crowd).toBe(0);
        expect(parseScene({ set: { crowd: 12.6 } })!.set.crowd).toBe(13);
        expect(parseScene({ set: {} })!.set.crowd).toBe(0);
        const s = applySceneEdit(newScene(), { kind: 'set', patch: { crowd: 25 } });
        expect(s.set.crowd).toBe(25);
        expect(parseScene(JSON.parse(JSON.stringify(s)))).toEqual(s);
    });
});
