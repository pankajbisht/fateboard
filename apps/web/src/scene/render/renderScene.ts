import { horizon, makeView, type P2, type View } from '../camera/projection';
import type { Scene } from '../schema/types';
import { crowdPieces } from '../sets/crowd';
import { ENVIRONMENTS } from '../sets/registry';
import type { EnvironmentDef } from '../sets/types';
import { worldLook, type WorldLook } from '../world/look';
import { seeded } from '../world/random';
import { cloudPieces, skyItems, weatherItems } from './atmosphere';
import { fightItems } from './fightFx';
import { frameItems } from './frame';
import { lru } from './memo';
import { renderSet } from './renderSet';
import { actorItems } from './renderActors';
import { propItems } from './renderProps';
import { LAYER, type SceneModel, type SortItem } from './types';

/**
 * render(scene) → every path to draw, in order, in frame coordinates (docs/CHARACTER_STUDIO.md §9). Pure: the
 * studio view, the SVG file and the page all call it. Separate random streams for the set, the sky and the
 * weather, so stars or rain never move a tree.
 */
const SKY_SEED = 0x51ed;
const WEATHER_SEED = 0x2c1b;
const CROWD_SEED = 0x7a3d;

function horizonYAt(h: [P2, P2] | null, x: number): number | null {
    if (!h) return null;
    const [a, b] = h;
    if (Math.abs(b[0] - a[0]) < 1e-9) return null;
    return a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]);
}

/** The place (sky, set, weather): the same while only actors change, so it is cached. */
const places = lru<SortItem[]>(8);

function placeItems(
    scene: Scene,
    v: View,
    look: WorldLook,
    env: EnvironmentDef,
    h: [P2, P2] | null,
): SortItem[] {
    const key = JSON.stringify([scene.set, scene.camera, scene.frame.aspect]);
    const hit = places.get(key);
    if (hit) return hit;
    const variant = env.variants.some((x) => x.id === scene.set.variant)
        ? scene.set.variant
        : (env.variants[0]?.id ?? '');
    const pieces = [
        ...env.build({ rand: seeded(scene.set.seed), look, variant }),
        ...crowdPieces(seeded(scene.set.seed ^ CROWD_SEED), scene.set.crowd, env),
    ];
    const skyRand = seeded(scene.set.seed ^ SKY_SEED);
    const clouds = env.sky ? cloudPieces(look, skyRand) : [];
    const items = [
        ...skyItems(v, look, env.sky, horizonYAt(h, v.width / 2), skyRand),
        ...renderSet(v, look, [...clouds, ...pieces]),
        ...(env.sky ? weatherItems(v, look, seeded(scene.set.seed ^ WEATHER_SEED)) : []),
    ];
    places.set(key, items);
    return items;
}

/**
 * `layers` splits the picture for fight clips (docs/COMBAT_PACK.md): 'set' = the place and props behind the
 * fighters (drawn once), 'actors' = the actors and fight effects only (one drawing per frame), 'over' = what stands
 * nearer the camera than `near` cm (front ropes, foreground, light cones) and the border, drawn over the fighters.
 */
export type SceneLayers = 'all' | 'set' | 'actors' | 'over';

export function renderScene(scene: Scene, layers: SceneLayers = 'all', near = 0): SceneModel {
    const v = makeView(scene.camera, scene.frame.aspect);
    const env = ENVIRONMENTS.get(scene.set.environment);
    const look = worldLook(scene.set);
    const h = horizon(v);
    const set = layers !== 'actors';
    const cast = layers === 'all' || layers === 'actors';
    const place = set ? placeItems(scene, v, look, env, h) : [];
    const actors = cast ? actorItems(v, look, scene) : { items: [], boxes: [] };
    const props = set ? propItems(v, look, scene) : { items: [], boxes: [] };
    /** in front of the fighters: the front layer and the weather, and mid pieces nearer than `near` */
    const over = (s: SortItem) =>
        s.layer >= LAYER.front || (s.layer === LAYER.mid && s.distance < near);
    const scenery = [...place, ...props.items].filter((s) =>
        layers === 'set' ? !over(s) : layers === 'over' ? over(s) : true,
    );
    const sorted: SortItem[] = [
        ...scenery,
        ...actors.items,
        ...(cast ? fightItems(v, scene) : []),
        ...(layers === 'all' || layers === 'over'
            ? frameItems(scene.frame, v.width, v.height)
            : []),
    ]
        .map((s, i) => ({ s, i }))
        .sort(
            (a, b) =>
                a.s.layer - b.s.layer ||
                (a.s.layer === LAYER.ground ? 0 : b.s.distance - a.s.distance) ||
                a.i - b.i,
        )
        .map(({ s }) => s);
    return {
        width: v.width,
        height: v.height,
        items: sorted.flatMap((s) => s.items),
        actors: actors.boxes,
        props: props.boxes,
        horizon: h,
    };
}
