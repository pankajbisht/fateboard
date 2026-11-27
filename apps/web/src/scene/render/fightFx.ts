import { apply, rotY, type V3 } from '@/character/rig/math';
import { project, type P2, type View } from '../camera/projection';
import { impactShapes } from '../fx/impact';
import type { Scene } from '../schema/types';
import { LAYER, type SceneDrawable, type SortItem } from './types';

/**
 * The impact effects of a placed fight exchange (docs/COMBAT_PACK.md, Stage 3): drawn over everything at the
 * impact moment, while the attacker still holds the exchange's pose (another pose, or another moment, hides them).
 * The impact point and the limb's path are kept in the attacker's own frame, so they follow a drag or a turn.
 */
export function fightItems(v: View, scene: Scene): SortItem[] {
    const f = scene.fight;
    if (!f || f.intensity === 'off' || f.key !== 'peak') return [];
    const a = scene.actors.find((x) => x.id === f.attacker);
    const b = scene.actors.find((x) => x.id === f.defender);
    if (!a || !b || a.character.rig.pose.id !== `fight-${f.exchange}`) return [];
    const world = (p: V3): V3 => {
        const w = apply(rotY(a.facing), p);
        return [a.x + w[0], w[1], a.z + w[2]];
    };
    const at = project(v, world(f.impact));
    if (!at) return [];
    const trail = f.trail
        .map((p) => project(v, world(p)))
        .filter((q): q is V3 => q !== null)
        .map((q): P2 => [q[0], q[1]]);
    const from = trail[0] ?? [at[0], at[1]];
    let angle = Math.atan2(at[1] - from[1], at[0] - from[0]);
    if (Math.hypot(at[0] - from[0], at[1] - from[1]) < 1) {
        // no visible travel (a strike toward the camera): point from the attacker to the defender
        const pa = project(v, [a.x, 100, a.z]);
        const pb = project(v, [b.x, 100, b.z]);
        angle = pa && pb ? Math.atan2(pb[1] - pa[1], pb[0] - pa[0]) : 0;
    }
    let seed = 7;
    for (const ch of f.exchange) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
    const shapes = impactShapes({
        k: 0,
        at: [at[0], at[1]],
        angle,
        trail,
        frameH: v.height,
        intensity: f.intensity,
        on: f.effects,
        contact: f.contact,
        seed,
    });
    if (!shapes.length) return [];
    const items: SceneDrawable[] = shapes.map((s) => ({
        key: `fight-${s.key}`,
        d: s.d,
        fill: s.fill,
        stroke: s.stroke,
        strokeWidth: s.strokeWidth,
        ...(s.opacity !== undefined ? { opacity: s.opacity } : {}),
    }));
    return [{ layer: LAYER.front, distance: 0, items }];
}
