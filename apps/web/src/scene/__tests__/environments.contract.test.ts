// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { RECIPES, fromRecipe } from '@/character/data/recipes';
import { renderScene } from '../render/renderScene';
import { newScene } from '../schema/parse';
import { TIMES, type Scene } from '../schema/types';
import { ENVIRONMENTS } from '../sets/registry';
import { worldLook } from '../world/look';
import { seeded } from '../world/random';

/**
 * Every environment, in every variant, time of day and weather (docs/CHARACTER_STUDIO.md §9.1: registries have a
 * contract test). A new environment file is covered by adding it to the registry.
 */
const NUM = /-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/g;
const CATEGORIES = ['studio', 'indoor', 'city', 'nature', 'landmark'];

function sceneIn(env: string, variant: string, patch: Partial<Scene['set']> = {}): Scene {
    const s = newScene();
    const def = ENVIRONMENTS.get(env);
    s.set = { ...s.set, environment: env, variant, ...patch };
    s.camera = { ...s.camera, ...def.camera, position: [...def.camera.position] };
    s.actors = [0, 2].map((r, i) => ({
        id: `a${i}`,
        character: fromRecipe(RECIPES[r], `a${i}`),
        x: def.stage.x + (i ? 70 : -70),
        z: def.stage.z,
        facing: 0,
        lookAt: null,
    }));
    return s;
}

describe('environment catalogue', () => {
    it('has the first batch of 12 places plus the studio, with unique ids', () => {
        const ids = ENVIRONMENTS.all.map((e) => e.id);
        expect(ids.length).toBeGreaterThanOrEqual(13);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ENVIRONMENTS.get('no-such-place').id).toBe('studio');
        expect(ENVIRONMENTS.search('school').map((e) => e.id)).toEqual(
            expect.arrayContaining(['school', 'classroom']),
        );
    });

    for (const env of ENVIRONMENTS.all)
        describe(env.id, () => {
            it('describes itself: name, category, tags, unique variants', () => {
                expect(env.name.trim()).not.toBe('');
                expect(CATEGORIES).toContain(env.category);
                expect(env.tags.length).toBeGreaterThanOrEqual(3);
                expect(env.variants.length).toBeGreaterThanOrEqual(1);
                expect(new Set(env.variants.map((v) => v.id)).size).toBe(env.variants.length);
            });

            it('keeps the stage clear (nothing standing where the actors stand)', () => {
                for (const variant of env.variants) {
                    const pieces = env.build({
                        rand: seeded(1),
                        look: worldLook({ time: 'day', weather: 'clear', season: 'summer' }),
                        variant: variant.id,
                    });
                    for (const p of pieces) {
                        if (p.layer === 'front' || p.layer === 'ground') continue;
                        if (p.kind === 'box') {
                            if (p.at[1] > 0 || p.at[1] + p.size[1] < 1) continue;
                            // distance from the stage centre to the box's footprint (in the box's own frame)
                            const a = ((p.rotY ?? 0) * Math.PI) / 180;
                            const ox = env.stage.x - p.at[0];
                            const oz = env.stage.z - p.at[2];
                            const lx = Math.cos(a) * ox - Math.sin(a) * oz;
                            const lz = Math.sin(a) * ox + Math.cos(a) * oz;
                            const d = Math.hypot(
                                Math.max(0, Math.abs(lx) - p.size[0] / 2),
                                Math.max(0, Math.abs(lz) - p.size[2] / 2),
                            );
                            if (d < 150)
                                expect.fail(`${variant.id}: a box at ${p.at} stands on the stage`);
                        }
                        if (p.kind === 'card' && p.at[1] === 0) {
                            const d = Math.hypot(p.at[0] - env.stage.x, p.at[2] - env.stage.z);
                            if (d - p.width / 2 < 150)
                                expect.fail(`${variant.id}: a ${p.shape} stands on the stage`);
                        }
                    }
                }
            });

            it('renders in every variant, time and weather: finite, unique keys, deterministic, actors in the frame', () => {
                for (const variant of env.variants)
                    for (const time of TIMES)
                        for (const weather of ['clear', 'rain'] as const) {
                            const scene = sceneIn(env.id, variant.id, { time, weather });
                            const m = renderScene(scene);
                            const label = `${env.id}/${variant.id}/${time}/${weather}`;
                            expect(m.items.length, label).toBeGreaterThan(3);
                            expect(m.items.length, `${label}: drawing budget`).toBeLessThan(4000);
                            const keys = new Set(m.items.map((d) => d.key));
                            expect(keys.size, `${label}: unique keys`).toBe(m.items.length);
                            for (const d of m.items)
                                for (const n of d.d.match(NUM) ?? [])
                                    if (!Number.isFinite(Number(n)) || Math.abs(Number(n)) > 1e5)
                                        expect.fail(`${label}: ${d.key} has ${n}`);
                            expect(
                                m.actors.map((a) => a.id),
                                label,
                            ).toEqual(['a0', 'a1']);
                            for (const a of m.actors) {
                                expect(a.anchor[0]).toBeGreaterThan(0);
                                expect(a.anchor[0]).toBeLessThan(m.width);
                                expect(a.anchor[1]).toBeLessThan(m.height);
                            }
                            if (time === 'day' && weather === 'clear')
                                expect(
                                    renderScene(scene),
                                    `${label}: same scene, same picture`,
                                ).toEqual(m);
                        }
            });
        });
});
