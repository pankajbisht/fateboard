import { RECIPES, fromRecipe } from '@/character/data/recipes';
import { poseById } from '@/character/data/poses';
import { STAND_POSE } from '@/character/schema/parse';
import { VIEWS, viewCtx } from '../camera/views';
import { applyFormation } from '../layout/arrange';
import type { Scene } from '../schema/types';
import { ENVIRONMENTS } from '../sets/registry';
import { TEMPLATES } from './registry';

/**
 * The scene with a template applied (pure, deterministic: actor ids are `t0`, `t1` …, the same every time). The
 * scene keeps its id, its frame border and its look settings; place, cast, formation, camera and aspect come from
 * the template. Unknown template ids change nothing.
 */
export function applyTemplate(base: Scene, id: string): Scene {
    if (!TEMPLATES.has(id)) return base;
    const t = TEMPLATES.get(id);
    const env = ENVIRONMENTS.get(t.place.environment);
    const style = t.style ?? base.actors[0]?.character.style ?? 'cartoon';
    const actors = t.cast.slice(0, 5).flatMap((rid, i) => {
        const recipe = RECIPES.find((r) => r.id === rid);
        if (!recipe) return [];
        const poseId = t.poses?.[i];
        const pose = (poseId ? poseById(poseId) : undefined) ?? STAND_POSE;
        return [
            {
                id: `t${i}`,
                character: { ...fromRecipe(recipe, `${rid}-t${i}`), style, rig: { pose } },
                x: 0,
                z: 0,
                facing: 0,
                lookAt: null,
            },
        ];
    });
    let scene: Scene = {
        ...base,
        name: t.name,
        set: {
            ...base.set,
            environment: t.place.environment,
            variant: t.place.variant ?? '',
            time: t.place.time ?? 'day',
            weather: t.place.weather ?? 'clear',
            season: t.place.season ?? 'summer',
            crowd: t.place.crowd ?? 0,
        },
        camera: { ...base.camera, ...env.camera, position: [...env.camera.position], roll: 0 },
        frame: { ...base.frame, aspect: t.aspect ?? '16:9' },
        actors,
    };
    scene = { ...scene, actors: applyFormation(scene.actors, t.formation, env.stage) };
    return {
        ...scene,
        camera: VIEWS.get(t.view).make(viewCtx(scene, scene.actors[0]?.id ?? null, env.stage)),
    };
}
