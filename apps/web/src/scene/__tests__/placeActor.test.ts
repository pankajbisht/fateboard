// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { RECIPES, fromRecipe } from '@/character/data/recipes';
import { buildSkeleton } from '@/character/rig/skeleton';
import { makeView, project } from '../camera/projection';
import { applySim, placeActor } from '../render/placeActor';
import { renderScene } from '../render/renderScene';
import { DEFAULT_SCENE_CAMERA, newScene } from '../schema/parse';
import type { SceneActor, SceneCamera } from '../schema/types';

const cam = (patch: Partial<SceneCamera> = {}): SceneCamera => ({
    ...DEFAULT_SCENE_CAMERA,
    ...patch,
});
const actor = (id: string, x: number, z: number, recipe = 0, facing = 0): SceneActor => ({
    id,
    character: fromRecipe(RECIPES[recipe], id),
    x,
    z,
    facing,
    lookAt: null,
});
/** The actor's drawn height in the frame (its bounding box). */
const drawnHeight = (scene: ReturnType<typeof newScene>, id: string) => {
    const b = renderScene(scene).actors.find((a) => a.id === id)!.bounds;
    return b[3] - b[1];
};

describe('actors in perspective (§7.4 acceptance checks)', () => {
    it('feet and set go through the same projection (any view, any lens)', () => {
        for (const c of [
            cam(),
            cam({ position: [600, 200, 500], yaw: 50, pitch: 12 }),
            cam({ position: [0, 900, 600], pitch: 55, lens: { kind: 'perspective', focalMm: 18 } }),
            cam({ yaw: 45, pitch: 35.264, lens: { kind: 'orthographic', heightCm: 700 } }),
        ]) {
            const v = makeView(c, '16:9');
            const p = placeActor(v, { x: 120, z: -80, facing: 30 }, 165)!;
            const feet = project(v, [120, 0, -80])!;
            const at = applySim(p.matrix, [0, 0]);
            expect(Math.hypot(at[0] - feet[0], at[1] - feet[1])).toBeLessThan(1e-6);
        }
    });

    it('real height ratios hold at equal depth, and size follows distance', () => {
        const scene = newScene();
        scene.camera = cam({ position: [0, 120, 900], pitch: 0 });
        // a tall adult (kenji, 189 cm) and a small child (meera, 111 cm) side by side
        scene.actors = [actor('a', -100, 0, 8), actor('b', 100, 0, 1)];
        const ha = buildSkeleton(scene.actors[0].character.body).height;
        const hb = buildSkeleton(scene.actors[1].character.body).height;
        const ratio = drawnHeight(scene, 'a') / drawnHeight(scene, 'b');
        expect(Math.abs(ratio / (ha / hb) - 1)).toBeLessThan(0.06);

        const near = drawnHeight(scene, 'a');
        scene.actors[0].z = -900; // twice as far from the camera
        expect(Math.abs(drawnHeight(scene, 'a') / near - 0.5)).toBeLessThan(0.04);
    });

    it('the actor is drawn from where the camera sees it', () => {
        const v = makeView(cam({ position: [0, 150, 760], pitch: 0 }), '16:9');
        // turned to face +x: the camera on +z sees its right side
        expect(placeActor(v, { x: 0, z: 0, facing: 90 }, 165)!.camera.yaw).toBeCloseTo(270, 0);
        // seen from high above: from above
        const high = makeView(cam({ position: [0, 800, 500], pitch: 50 }), '16:9');
        expect(placeActor(high, { x: 0, z: 0, facing: 0 }, 165)!.camera.pitch).toBeGreaterThan(30);
        // behind the camera: not drawn
        expect(placeActor(v, { x: 0, z: 2000, facing: 0 }, 165)).toBeNull();
    });

    it('the scene light reaches the actors: golden hour lights them from the other side than noon', () => {
        const v = makeView(cam(), '16:9');
        const noon = placeActor(v, { x: 0, z: 0, facing: 0 }, 165, [-0.33, 0.82, 0.47])!.light!;
        const evening = placeActor(v, { x: 0, z: 0, facing: 0 }, 165, [0.93, 0.16, 0.34])!.light!;
        expect(noon[0]).toBeLessThan(0);
        expect(evening[0]).toBeGreaterThan(0);
    });
});
