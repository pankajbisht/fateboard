import { getProp } from '@/props/catalog';
import { propPaths, compose, type Affine, type PropPaths } from '@/props/render/propPaths';
import { defaultPropData, shadowByDefault } from '@/props/schema/parse';
import type { PropDef } from '@/props/types';
import { distanceOf, project, scaleAt, type P2, type View } from '../camera/projection';
import type { Scene, SceneProp } from '../schema/types';
import type { WorldLook } from '../world/look';
import { bounds } from './geometry';
import { lru } from './memo';
import { transformPath } from './pathTransform';
import { contactShadow } from './renderActors';
import { hazeColor, lineWidth } from './renderSet';
import { LAYER, type ActorBox, type SceneDrawable, type SortItem } from './types';

/**
 * Scene Objects props standing in the world (docs/PROPS.md §9). Each is a card like the set's trees: it always
 * faces the camera, its base on its projected ground point, upright along the projected vertical, sized by its
 * height in cm. Its paths go through one similarity (exact arcs), sorted far to near with the actors. Paint gets
 * the place's colour grade and haze; the ink outline is chosen per placement so it reads as wide as the set's
 * lines at any distance. Keys are `<prop id>:<n>`; every drawable carries `prop` for picking.
 */
const HEX = /^#[0-9a-f]{6}$/i;
/** props draw a little bolder than set lines, like the characters */
const OUTLINE = 1.5;

/** Drawings by prop, variant and outline (quantised): a camera move re-places, it rarely redraws. */
const drawings = lru<PropPaths>(160);
/** Placed props by everything they depend on: dragging one re-places that one. */
const placed = lru<{ items: SortItem[]; box: ActorBox } | null>(96);

function drawingOf(def: PropDef, variant: number, outline: number): PropPaths {
    const key = `${def.id}:${variant}:${outline}`;
    let hit = drawings.get(key);
    if (!hit) {
        const data = { ...defaultPropData(def), variant, outlineWidth: outline };
        hit = propPaths(def, data);
        drawings.set(key, hit);
    }
    return hit;
}

const applyM = (m: Affine, p: P2): P2 => [
    m[0] * p[0] + m[2] * p[1] + m[4],
    m[1] * p[0] + m[3] * p[1] + m[5],
];

function placeProp(v: View, look: WorldLook, p: SceneProp, def: PropDef) {
    const foot = project(v, [p.x, 0, p.z]);
    if (!foot) return null;
    const mid: [number, number, number] = [p.x, p.height * 0.5, p.z];
    if (v.perspective && distanceOf(v, mid) < Math.max(20, p.height * 0.2)) return null;
    const s = scaleAt(v, [p.x, 0, p.z]);
    // the projected vertical at the base: upright cards lean with three-point perspective, like the actors
    const top = project(v, [p.x, p.height, p.z]);
    let up: P2 = [0, -1];
    if (top) {
        const l = Math.hypot(top[0] - foot[0], top[1] - foot[1]);
        if (l > 1e-6) up = [(top[0] - foot[0]) / l, (top[1] - foot[1]) / l];
    }
    const right: P2 = [-up[1], up[0]];
    const k = (s * p.height) / def.height; // frame units per prop pixel
    if (!Number.isFinite(k) || k < 1e-6) return null;
    // prop pixels (y down, base centre at (w/2, h)) → frame
    const m: Affine = [
        k * right[0],
        k * right[1],
        -k * up[0],
        -k * up[1],
        foot[0] - k * right[0] * (def.width / 2) + k * up[0] * def.height,
        foot[1] - k * right[1] * (def.width / 2) + k * up[1] * def.height,
    ];
    const outline = Math.round(Math.min(8, Math.max(0.2, (lineWidth(s) * OUTLINE) / k)) * 10) / 10;
    const distance = distanceOf(v, mid);
    const paint = (c: string | null) =>
        c && HEX.test(c) ? hazeColor(look, look.grade(c), distance) : c;
    const items: SceneDrawable[] = drawingOf(def, p.variant, outline).paths.map((path, i) => {
        const pm = compose(m, path.matrix);
        return {
            key: `${p.id}:${i}`,
            d: transformPath(path.d, [pm[0], pm[1], pm[2], pm[3], pm[4], pm[5]]),
            fill: paint(path.fill) ?? 'none',
            stroke: paint(path.stroke),
            strokeWidth: path.strokeWidth * Math.hypot(pm[0], pm[1]),
            ...(path.opacity !== undefined ? { opacity: path.opacity } : {}),
            prop: p.id,
        };
    });
    const out: SortItem[] = [];
    if (shadowByDefault(def)) {
        const worldWidth = (p.height * def.width) / def.height;
        const shadow = contactShadow(v, look, p.x, p.z, p.height, worldWidth * 0.42);
        if (shadow)
            out.push({
                layer: LAYER.mid,
                distance: distance + 0.01,
                items: [{ ...shadow, key: `${p.id}:shadow`, prop: p.id }],
            });
    }
    out.push({ layer: LAYER.mid, distance, items });
    const corners: P2[] = (
        [
            [0, 0],
            [def.width, 0],
            [def.width, def.height],
            [0, def.height],
        ] as P2[]
    ).map((c) => applyM(m, c));
    return {
        items: out,
        box: {
            id: p.id,
            name: def.label,
            anchor: [foot[0], foot[1]] as P2,
            bounds: bounds(corners),
            scale: s,
        },
    };
}

export function propItems(
    v: View,
    look: WorldLook,
    scene: Scene,
): { items: SortItem[]; boxes: ActorBox[] } {
    const items: SortItem[] = [];
    const boxes: ActorBox[] = [];
    const view = JSON.stringify([
        scene.camera,
        scene.frame.aspect,
        scene.set.time,
        scene.set.weather,
        scene.set.season,
    ]);
    for (const p of scene.props) {
        const def = getProp(p.propId);
        if (!def) continue; // a prop this catalogue does not know: kept in the data, not drawn
        const key = `${view}|${p.id}|${p.propId}|${p.variant}|${p.x}|${p.z}|${p.height}`;
        let hit = placed.get(key);
        if (hit === undefined) {
            hit = placeProp(v, look, p, def);
            placed.set(key, hit);
        }
        if (!hit) continue;
        items.push(...hit.items);
        boxes.push(hit.box);
    }
    return { items, boxes };
}
