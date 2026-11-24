import { buildSkeleton } from '@/character/rig/skeleton';
import type { SceneActor } from '../schema/types';
import { FORMATIONS } from './formations';

/** Pure group layout helpers: formations, align / distribute, a free spot for a new actor. */

/** Actors placed in a formation around the stage (tallest to the back rows when the formation says so). */
export function applyFormation(
    actors: SceneActor[],
    id: string,
    stage: { x: number; z: number },
): SceneActor[] {
    const f = FORMATIONS.get(id);
    const n = Math.min(actors.length, 5);
    const slots = f.slots(n);
    let order = actors.slice(0, n);
    if (f.byHeight) {
        // back rows first (smallest z), and inside a row the middle gets the tallest
        const h = new Map(order.map((a) => [a.id, buildSkeleton(a.character.body).height]));
        order = [...order].sort((a, b) => h.get(b.id)! - h.get(a.id)!);
        const idx = slots
            .map((s, i) => ({ s, i }))
            .sort((a, b) => a.s.z - b.s.z || Math.abs(a.s.x) - Math.abs(b.s.x));
        const placed = new Array<SceneActor>(n);
        idx.forEach(({ i }, k) => (placed[i] = order[k]));
        order = placed;
    }
    const moved = order.map((a, i) => ({
        ...a,
        x: stage.x + slots[i].x,
        z: stage.z + slots[i].z,
        facing: slots[i].facing,
        lookAt: f.talk && n > 1 ? order[(i + 1) % n].id : null,
    }));
    const byId = new Map(moved.map((a) => [a.id, a]));
    return actors.map((a) => byId.get(a.id) ?? a);
}

/** Lines the actors up on x (left, centre, right) or z (front, back). */
export function align(
    actors: SceneActor[],
    ids: string[],
    how: 'left' | 'center' | 'right' | 'front' | 'back',
): SceneActor[] {
    const sel = actors.filter((a) => ids.includes(a.id));
    if (sel.length < 2) return actors;
    const xs = sel.map((a) => a.x);
    const zs = sel.map((a) => a.z);
    const to =
        how === 'left'
            ? Math.min(...xs)
            : how === 'right'
              ? Math.max(...xs)
              : how === 'center'
                ? (Math.min(...xs) + Math.max(...xs)) / 2
                : how === 'front'
                  ? Math.max(...zs)
                  : Math.min(...zs);
    return actors.map((a) =>
        !ids.includes(a.id)
            ? a
            : how === 'front' || how === 'back'
              ? { ...a, z: to }
              : { ...a, x: to },
    );
}

/** Even gaps between the selected actors along x, keeping the outer two. */
export function distribute(actors: SceneActor[], ids: string[]): SceneActor[] {
    const sel = actors.filter((a) => ids.includes(a.id)).sort((a, b) => a.x - b.x);
    if (sel.length < 3) return actors;
    const x0 = sel[0].x;
    const step = (sel[sel.length - 1].x - x0) / (sel.length - 1);
    const at = new Map(sel.map((a, i) => [a.id, x0 + step * i]));
    return actors.map((a) => (at.has(a.id) ? { ...a, x: at.get(a.id)! } : a));
}

/** Somewhere on the stage line not taken by another actor (new actors step in at the right end). */
export function freeSpot(
    actors: SceneActor[],
    stage: { x: number; z: number },
): { x: number; z: number } {
    if (!actors.length) return { x: stage.x, z: stage.z };
    const right = Math.max(...actors.map((a) => a.x));
    return { x: right + 85, z: stage.z };
}
