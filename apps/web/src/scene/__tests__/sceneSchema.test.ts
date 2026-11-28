// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { RECIPES, fromRecipe } from '@/character/data/recipes';
import { newScene, parseScene } from '../schema/parse';
import { MAX_ACTORS, SCENE_SCHEMA_VERSION } from '../schema/types';

describe('parseScene', () => {
    it('a new scene parses to itself', () => {
        const s = newScene('Picnic');
        expect(parseScene(JSON.parse(JSON.stringify(s)))).toEqual(s);
    });

    it('repairs anything: defaults, clamps, unknown words', () => {
        const s = parseScene({
            name: 42,
            camera: {
                position: [0, -50, 'x'],
                pitch: 200,
                yaw: -90,
                lens: { kind: 'perspective', focalMm: 2 },
            },
            set: { environment: '', time: 'noonish', weather: 'rain', seed: -5 },
            frame: { aspect: '5:2', border: 900, borderColor: 'red' },
        })!;
        expect(s.name).toBe('Scene');
        expect(s.camera.position).toEqual([0, 1, 760]);
        expect(s.camera.pitch).toBe(89);
        expect(s.camera.yaw).toBe(270);
        expect(s.camera.lens).toEqual({ kind: 'perspective', focalMm: 10 });
        expect(s.set).toMatchObject({
            environment: 'studio',
            time: 'day',
            weather: 'rain',
            seed: 0,
        });
        expect(s.frame).toMatchObject({ aspect: '16:9', border: 60, borderColor: '#1f1f1f' });
    });

    it('keeps real actors only, at most MAX_ACTORS, with unique ids and valid look-at targets', () => {
        const c = fromRecipe(RECIPES[0], 'x');
        const actors = [
            { id: 'a', character: c, x: 0, z: 0, facing: 0, lookAt: 'b' },
            { id: 'a', character: c, x: 50, z: 0, facing: 0, lookAt: 'gone' },
            { id: 'bad', character: 'not a character' },
            ...Array.from({ length: 6 }, (_, i) => ({
                id: `m${i}`,
                character: c,
                lookAt: `m${i}`,
            })),
        ];
        const s = parseScene({ actors })!;
        expect(s.actors).toHaveLength(MAX_ACTORS);
        expect(new Set(s.actors.map((a) => a.id)).size).toBe(MAX_ACTORS);
        expect(s.actors.every((a) => a.lookAt === null)).toBe(true);
    });

    it('refuses what is not a scene, or a newer schema', () => {
        expect(parseScene(null)).toBeNull();
        expect(parseScene([1, 2])).toBeNull();
        expect(parseScene({ schemaVersion: SCENE_SCHEMA_VERSION + 1 })).toBeNull();
    });
});
