import { project as projectRig, viewMatrix } from '@/character/render/camera';
import { apply, rotY, type V3 } from '@/character/rig/math';
import type { CharacterCamera } from '@/character/schema/types';
import { distanceOf, project, type P2, type View } from '../camera/projection';

/**
 * Per-actor perspective (docs/CHARACTER_STUDIO.md §9.2). The character renderer draws the actor orthographically
 * from the direction the scene camera sees it; a 2D similarity then puts that drawing where the camera puts the
 * actor: its feet exactly on its projected ground point, its size from the distance, its up along the projected
 * vertical (three-point perspective). Rig → world: rotY(facing) then move to (x, 0, z).
 */

/** SVG matrix(a b c d e f): x' = a·x + c·y + e, y' = b·x + d·y + f. */
export type Similarity = [number, number, number, number, number, number];

export interface ActorPlacement {
    /** the orbit camera the actor is rendered with */
    camera: CharacterCamera;
    /** render space (cm, y down, feet at 0,0) → frame */
    matrix: Similarity;
    /** frame units per cm */
    scale: number;
    /** distance from the camera (sort key: bigger = drawn first) */
    distance: number;
    /** the scene light in render space (null: keep the default) */
    light: P2 | null;
}

export interface Placeable {
    x: number;
    z: number;
    facing: number;
}

const DEG = 180 / Math.PI;

export function placeActor(
    v: View,
    a: Placeable,
    height: number,
    sun: V3 | null = null,
): ActorPlacement | null {
    const toWorld = rotY(a.facing);
    const toRig = rotY(-a.facing);
    const anchor: V3 = [a.x, 0, a.z];
    const mid: V3 = [a.x, height * 0.55, a.z];
    if (v.perspective && distanceOf(v, mid) < height * 0.25) return null;

    // where the camera is, seen from the actor (rig space)
    const c = v.cam.position;
    const toViewer: V3 = v.perspective
        ? [c[0] - mid[0], c[1] - mid[1], c[2] - mid[2]]
        : apply(v.Rt, [0, 0, 1]);
    const d = apply(toRig, toViewer);
    const yaw = Math.atan2(d[0], d[2]) * DEG;
    const pitch = Math.max(-89, Math.min(89, Math.atan2(d[1], Math.hypot(d[0], d[2])) * DEG));
    const camera: CharacterCamera = { yaw: (yaw + 360) % 360, pitch, roll: 0, shot: 'full' };
    const view = viewMatrix(camera);

    const foot = project(v, anchor);
    if (!foot) return null;
    // fit s·e^{iα} (complex numbers) so the rig's axes land where the camera puts them, feet fixed
    let num0 = 0;
    let num1 = 0;
    let den = 0;
    const r = height / 2;
    const axes: V3[] = [
        [0, height, 0],
        [r, 0, 0],
        [0, 0, r],
        [-r, 0, 0],
        [0, height / 2, 0],
    ];
    for (const rig of axes) {
        const q = projectRig(view, rig);
        const w = apply(toWorld, rig);
        const t = project(v, [anchor[0] + w[0], w[1], anchor[2] + w[2]]);
        if (!t) continue;
        const tx = t[0] - foot[0];
        const ty = t[1] - foot[1];
        // conj(q) · t
        num0 += q[0] * tx + q[1] * ty;
        num1 += q[0] * ty - q[1] * tx;
        den += q[0] * q[0] + q[1] * q[1];
    }
    if (den < 1e-9) return null;
    const cr = num0 / den;
    const ci = num1 / den;
    const scale = Math.hypot(cr, ci);
    if (!Number.isFinite(scale) || scale < 1e-6) return null;

    let light: P2 | null = null;
    if (sun) {
        const l = apply(view, apply(toRig, sun));
        const n = Math.hypot(l[0], l[1]);
        if (n > 0.25) light = [l[0] / n, -l[1] / n];
    }
    return {
        camera,
        matrix: [cr, ci, -ci, cr, foot[0], foot[1]],
        scale,
        distance: distanceOf(v, mid),
        light,
    };
}

/** Applies a similarity to a point. */
export const applySim = (m: Similarity, p: P2): P2 => [
    m[0] * p[0] + m[2] * p[1] + m[4],
    m[1] * p[0] + m[3] * p[1] + m[5],
];
