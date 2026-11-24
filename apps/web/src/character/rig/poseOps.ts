import { JOINTS, type Euler, type JointId, type Pose } from '../schema/types';
import { wrapDeg } from './math';

/**
 * Pose operations: mirror (left ↔ right), weighted blend, and export as keyframe values on the shared
 * property paths (`rig.<joint>.x|y|z`, `rig.root.*`, `rig.headLook.*`, `rig.hand<L|R>.shape`).
 */
const otherSide = (j: JointId): JointId =>
    j.endsWith('L')
        ? (`${j.slice(0, -1)}R` as JointId)
        : j.endsWith('R')
          ? (`${j.slice(0, -1)}L` as JointId)
          : j;

/** Mirror across the body's centre plane: swap sides; twist (y) and side (z) change sign. */
export function mirrorPose(p: Pose): Pose {
    const joints: Pose['joints'] = {};
    for (const j of JOINTS) {
        const e = p.joints[j];
        if (e) joints[otherSide(j)] = { x: e.x, y: -e.y || 0, z: -e.z || 0 };
    }
    const ground = p.ground === 'left' ? 'right' : p.ground === 'right' ? 'left' : p.ground;
    return {
        ...p,
        joints,
        rootOffset: { ...p.rootOffset, x: -p.rootOffset.x || 0 },
        rootRotation: {
            yaw: -p.rootRotation.yaw || 0,
            pitch: p.rootRotation.pitch,
            roll: -p.rootRotation.roll || 0,
        },
        headLook: { yaw: -p.headLook.yaw || 0, pitch: p.headLook.pitch },
        handShapeL: p.handShapeR,
        handShapeR: p.handShapeL,
        ground,
    };
}

const ZERO: Euler = { x: 0, y: 0, z: 0 };
const mix = (a: number, b: number, w: number) => a + wrapDeg(b - a) * w;
const lin = (a: number, b: number, w: number) => a + (b - a) * w;

/** `w` = 0 gives `a`, 1 gives `b`; angles take the short way round. Discrete fields switch at 0.5. */
export function blendPoses(a: Pose, b: Pose, w: number): Pose {
    const t = Math.min(1, Math.max(0, w));
    const joints: Pose['joints'] = {};
    for (const j of JOINTS) {
        if (!a.joints[j] && !b.joints[j]) continue;
        const ea = a.joints[j] ?? ZERO;
        const eb = b.joints[j] ?? ZERO;
        joints[j] = { x: mix(ea.x, eb.x, t), y: mix(ea.y, eb.y, t), z: mix(ea.z, eb.z, t) };
    }
    const pick = <T>(x: T, y: T) => (t < 0.5 ? x : y);
    return {
        ...pick(a, b),
        joints,
        rootOffset: {
            x: lin(a.rootOffset.x, b.rootOffset.x, t),
            y: lin(a.rootOffset.y, b.rootOffset.y, t),
            z: lin(a.rootOffset.z, b.rootOffset.z, t),
        },
        rootRotation: {
            yaw: mix(a.rootRotation.yaw, b.rootRotation.yaw, t),
            pitch: mix(a.rootRotation.pitch, b.rootRotation.pitch, t),
            roll: mix(a.rootRotation.roll, b.rootRotation.roll, t),
        },
        headLook: {
            yaw: mix(a.headLook.yaw, b.headLook.yaw, t),
            pitch: mix(a.headLook.pitch, b.headLook.pitch, t),
        },
    };
}

export interface PoseKey {
    path: string;
    value: number | string;
}

/** Every value of the pose as `{ path, value }` (rest joints included, so a keyframe fully sets the pose). */
export function poseToKeyframes(p: Pose): PoseKey[] {
    const out: PoseKey[] = [];
    for (const j of JOINTS) {
        const e = p.joints[j] ?? ZERO;
        for (const axis of ['x', 'y', 'z'] as const)
            out.push({ path: `rig.${j}.${axis}`, value: e[axis] });
    }
    for (const [k, v] of Object.entries(p.rootRotation))
        out.push({ path: `rig.root.${k}`, value: v });
    for (const [k, v] of Object.entries(p.rootOffset))
        out.push({ path: `rig.root.${k}`, value: v });
    out.push({ path: 'rig.headLook.yaw', value: p.headLook.yaw });
    out.push({ path: 'rig.headLook.pitch', value: p.headLook.pitch });
    out.push({ path: 'rig.handL.shape', value: p.handShapeL });
    out.push({ path: 'rig.handR.shape', value: p.handShapeR });
    return out;
}
