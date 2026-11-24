import { drawables } from '@/character/render/parts';
import { renderCharacter } from '@/character/render/renderCharacter';
import { buildSkeleton } from '@/character/rig/skeleton';
import { projectPolygon, type P2, type View } from '../camera/projection';
import { lookToward } from '../layout/lookAt';
import type { Scene, SceneActor, V3 } from '../schema/types';
import type { WorldLook } from '../world/look';
import { bounds, clipRect, polyPath } from './geometry';
import { transformPath } from './pathTransform';
import { applySim, placeActor } from './placeActor';
import { lru } from './memo';
import { LAYER, type ActorBox, type SceneDrawable, type SortItem } from './types';

/**
 * Every actor: drawn by the character renderer from where the camera sees it (placeActor), moved into the frame,
 * with a soft contact shadow on the ground under its feet (away from the sun). Keys are `<actor id>:<part>`.
 */
export function actorItems(
    v: View,
    look: WorldLook,
    scene: Scene,
): { items: SortItem[]; boxes: ActorBox[] } {
    const items: SortItem[] = [];
    const boxes: ActorBox[] = [];
    const byId = new Map(scene.actors.map((a) => [a.id, a]));
    for (const actor of scene.actors) {
        const target = actor.lookAt ? byId.get(actor.lookAt) : undefined;
        // the same actor, seen the same way, in the same light: reuse its drawing (a drag moves one actor)
        const key = JSON.stringify([
            actor.id,
            actor.x,
            actor.z,
            actor.facing,
            target ? [target.x, target.z, buildSkeleton(target.character.body).height] : null,
            scene.camera,
            scene.frame.aspect,
            scene.set.time,
            scene.set.weather,
            scene.set.season,
        ]);
        let mine = cache.get(actor.character);
        if (!mine) cache.set(actor.character, (mine = lru<Drawn | null>(4)));
        let drawn = mine.get(key);
        if (drawn === undefined) mine.set(key, (drawn = drawActor(v, look, actor, target)));
        if (!drawn) continue;
        items.push(...drawn.items);
        boxes.push(drawn.box);
    }
    return { items, boxes };
}

interface Drawn {
    items: SortItem[];
    box: ActorBox;
}

const cache = new WeakMap<object, ReturnType<typeof lru<Drawn | null>>>();

function drawActor(
    v: View,
    look: WorldLook,
    actor: SceneActor,
    target: SceneActor | undefined,
): Drawn | null {
    const items: SortItem[] = [];
    const character = target ? lookToward(actor, target) : actor.character;
    const height = buildSkeleton(character.body).height;
    const place = placeActor(v, actor, height, look.sun);
    if (!place) return null;
    const model = renderCharacter(character, place.camera, {
        ...(place.light ? { light: place.light } : {}),
        grade: look.grade,
    });
    const m = place.matrix;
    const parts: SceneDrawable[] = drawables(model.parts).map((d) => ({
        key: `${actor.id}:${d.key}`,
        d: transformPath(d.d, m),
        fill: d.fill,
        stroke: d.stroke,
        strokeWidth: d.strokeWidth * place.scale,
        ...(d.opacity !== undefined ? { opacity: d.opacity } : {}),
        ...(d.tone ? { tone: d.tone } : {}),
        actor: actor.id,
    }));
    const shadow = contactShadow(v, look, actor.x, actor.z, height);
    if (shadow)
        items.push({
            layer: LAYER.mid,
            distance: place.distance + 0.01,
            items: [{ ...shadow, key: `${actor.id}:shadow`, actor: actor.id }],
        });
    items.push({ layer: LAYER.mid, distance: place.distance, items: parts });
    const [x, y, w, h] = model.viewBox;
    const corners: P2[] = [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
    ].map((p) => applySim(m, p as P2));
    return {
        items,
        box: {
            id: actor.id,
            name: actor.character.name,
            anchor: [m[4], m[5]],
            bounds: bounds(corners),
            scale: place.scale,
        },
    };
}

function contactShadow(
    v: View,
    look: WorldLook,
    x: number,
    z: number,
    height: number,
): SceneDrawable | null {
    const r = height * 0.17;
    const h = Math.hypot(look.sun[0], look.sun[2]) || 1;
    const lean = r * 0.35 * (1 - Math.min(1, look.sun[1]));
    const cx = x - (look.sun[0] / h) * lean;
    const cz = z - (look.sun[2] / h) * lean;
    const ring: V3[] = Array.from({ length: 20 }, (_, i) => {
        const a = (i / 20) * Math.PI * 2;
        return [cx + Math.cos(a) * r, 0.3, cz + Math.sin(a) * r * 0.75];
    });
    const poly = projectPolygon(v, ring);
    if (!poly) return null;
    const clipped = clipRect(poly, -60, -60, v.width + 60, v.height + 60);
    if (clipped.length < 3) return null;
    return {
        key: 'shadow',
        d: polyPath(clipped),
        fill: '#000000',
        stroke: null,
        strokeWidth: 0,
        opacity: look.weather !== 'clear' ? 0.12 : look.night ? 0.14 : 0.2,
    };
}
