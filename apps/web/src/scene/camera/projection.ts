import { apply, mul, rotX, rotY, rotZ, transpose, type M3 } from '@/character/rig/math';
import type { AspectId, SceneCamera, V3 } from '../schema/types';

/**
 * The scene camera (docs/CHARACTER_STUDIO.md §9.2). Frame coordinates: x right, y DOWN, the frame is FRAME_W wide.
 * Camera space: x right, y up, the camera looks along -z; depth + = nearer the viewer (as the character renderer).
 */
export type P2 = [number, number];

export const FRAME_W = 1000;
/** Nothing closer than this is drawn (cm): polygons are clipped here. */
export const NEAR = 5;
const SENSOR_MM = 36;

const RATIO: Record<AspectId, number> = {
    '16:9': 16 / 9,
    '4:3': 4 / 3,
    '3:2': 3 / 2,
    '1:1': 1,
    '4:5': 4 / 5,
    '3:4': 3 / 4,
    '9:16': 9 / 16,
    '2.39:1': 2.39,
};

export const frameHeight = (a: AspectId) => FRAME_W / RATIO[a];

/** Everything a projection needs, computed once per render. */
export interface View {
    cam: SceneCamera;
    /** world → camera rotation */
    R: M3;
    /** camera → world rotation */
    Rt: M3;
    width: number;
    height: number;
    perspective: boolean;
    /** frame units per cm at distance 1 (perspective: focal length in frame units) or per cm (orthographic) */
    k: number;
}

export const cameraRotation = (c: Pick<SceneCamera, 'yaw' | 'pitch' | 'roll'>): M3 =>
    mul(rotZ(c.roll), mul(rotX(c.pitch), rotY(-c.yaw)));

export function makeView(cam: SceneCamera, aspect: AspectId): View {
    const R = cameraRotation(cam);
    const height = frameHeight(aspect);
    const perspective = cam.lens.kind === 'perspective';
    return {
        cam,
        R,
        Rt: transpose(R),
        width: FRAME_W,
        height,
        perspective,
        k:
            cam.lens.kind === 'perspective'
                ? (cam.lens.focalMm / SENSOR_MM) * FRAME_W
                : height / cam.lens.heightCm,
    };
}

export const toCamera = (v: View, p: V3): V3 => {
    const c = v.cam.position;
    return apply(v.R, [p[0] - c[0], p[1] - c[1], p[2] - c[2]]);
};

/** A camera-space point → [x, y, depth] in the frame; null behind the near plane. */
export function projectCam(v: View, q: V3): V3 | null {
    if (!v.perspective) return [v.width / 2 + v.k * q[0], v.height / 2 - v.k * q[1], q[2]];
    const d = -q[2];
    if (d < NEAR - 1e-9) return null;
    return [v.width / 2 + (v.k * q[0]) / d, v.height / 2 - (v.k * q[1]) / d, q[2]];
}

export const project = (v: View, p: V3): V3 | null => projectCam(v, toCamera(v, p));

/** Frame units per cm at a world point (how big things are drawn there). */
export function scaleAt(v: View, p: V3): number {
    if (!v.perspective) return v.k;
    return v.k / Math.max(NEAR, -toCamera(v, p)[2]);
}

/** Distance in front of the camera along its view axis (cm); orthographic: the same axis. */
export const distanceOf = (v: View, p: V3) => -toCamera(v, p)[2];

/** The world direction the camera looks along. */
export const forward = (v: View): V3 => apply(v.Rt, [0, 0, -1]);

/** Clips a camera-space polygon to the near plane (Sutherland–Hodgman against z = -NEAR). */
export function clipNear(v: View, poly: V3[]): V3[] {
    if (!v.perspective) return poly;
    const inside = (q: V3) => -q[2] >= NEAR;
    const out: V3[] = [];
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        if (inside(a)) out.push(a);
        if (inside(a) !== inside(b)) {
            const t = (-NEAR - a[2]) / (b[2] - a[2]);
            out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, -NEAR]);
        }
    }
    return out;
}

/** A world polygon → frame polygon (clipped at the near plane); null when nothing is in front. */
export function projectPolygon(v: View, poly: V3[]): P2[] | null {
    const clipped = clipNear(
        v,
        poly.map((p) => toCamera(v, p)),
    );
    if (clipped.length < 3) return null;
    return clipped.map((q) => {
        const s = projectCam(v, q)!;
        return [s[0], s[1]];
    });
}

/** A world segment → frame segment (clipped at the near plane). */
export function projectSegment(v: View, a: V3, b: V3): [P2, P2] | null {
    let qa = toCamera(v, a);
    let qb = toCamera(v, b);
    if (v.perspective) {
        const ia = -qa[2] >= NEAR;
        const ib = -qb[2] >= NEAR;
        if (!ia && !ib) return null;
        if (ia !== ib) {
            const t = (-NEAR - qa[2]) / (qb[2] - qa[2]);
            const m: V3 = [qa[0] + (qb[0] - qa[0]) * t, qa[1] + (qb[1] - qa[1]) * t, -NEAR];
            if (ia) qb = m;
            else qa = m;
        }
    }
    const sa = projectCam(v, qa)!;
    const sb = projectCam(v, qb)!;
    return [
        [sa[0], sa[1]],
        [sb[0], sb[1]],
    ];
}

/** Where a frame point lands on the ground plane y = `groundY` (null: the ray misses it). */
export function screenToGround(v: View, sx: number, sy: number, groundY = 0): V3 | null {
    const x = sx - v.width / 2;
    const y = -(sy - v.height / 2);
    const c = v.cam.position;
    let origin: V3;
    let dir: V3;
    if (v.perspective) {
        origin = c;
        dir = apply(v.Rt, [x / v.k, y / v.k, -1]);
    } else {
        const o = apply(v.Rt, [x / v.k, y / v.k, 0]);
        origin = [c[0] + o[0], c[1] + o[1], c[2] + o[2]];
        dir = apply(v.Rt, [0, 0, -1]);
    }
    if (Math.abs(dir[1]) < 1e-9) return null;
    const t = (groundY - origin[1]) / dir[1];
    if (v.perspective && t <= 0) return null;
    return [origin[0] + dir[0] * t, groundY, origin[2] + dir[2] * t];
}

/** Where lines along a world direction meet in the frame; null for orthographic or a direction behind. */
export function vanishingPoint(v: View, dir: V3): P2 | null {
    if (!v.perspective) return null;
    const q = apply(v.R, dir);
    if (-q[2] < 1e-6) return null;
    return [v.width / 2 + (v.k * q[0]) / -q[2], v.height / 2 - (v.k * q[1]) / -q[2]];
}

/** The horizon as a line through two frame points (perspective only). */
export function horizon(v: View): [P2, P2] | null {
    if (!v.perspective) return null;
    const f = forward(v);
    const h = Math.hypot(f[0], f[2]);
    // a horizontal direction in front of the camera, and a second one beside it
    const ahead: V3 = h > 1e-6 ? [f[0] / h, 0, f[2] / h] : [0, 0, -1];
    const side: V3 = [-ahead[2], 0, ahead[0]];
    const a = vanishingPoint(v, [ahead[0] - side[0] * 0.5, 0, ahead[2] - side[2] * 0.5]);
    const b = vanishingPoint(v, [ahead[0] + side[0] * 0.5, 0, ahead[2] + side[2] * 0.5]);
    return a && b ? [a, b] : null;
}
