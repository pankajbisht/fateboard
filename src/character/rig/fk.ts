import { JOINTS, type JointId, type Pose } from '../schema/types';
import { add, apply, fromEuler, mul, rotX, rotY, rotZ, type M3, type V3 } from './math';
import { PARENT, type Skeleton } from './skeleton';

/** World position and orientation of every joint for one pose. */
export interface Posed {
    pos: Record<JointId, V3>;
    rot: Record<JointId, M3>;
}

/** The whole body's turn: yaw (around up), pitch (lean forward +), roll. */
export const rootMatrix = (r: Pose['rootRotation']): M3 =>
    mul(rotY(r.yaw), mul(rotX(r.pitch), rotZ(r.roll)));

const ZERO = { x: 0, y: 0, z: 0 };

/**
 * Forward kinematics: each joint's rotation composes with its parent's, and its position is the parent's
 * position plus the parent's rotation applied to the rest offset. `headLook` adds to the head (pitch + = up).
 */
export function solveFK(skel: Skeleton, pose: Pose): Posed {
    const pos = {} as Record<JointId, V3>;
    const rot = {} as Record<JointId, M3>;
    for (const j of JOINTS) {
        let e = pose.joints[j] ?? ZERO;
        if (j === 'head') e = { x: e.x - pose.headLook.pitch, y: e.y + pose.headLook.yaw, z: e.z };
        const local = fromEuler(e);
        const parent = PARENT[j];
        if (!parent) {
            rot[j] = mul(rootMatrix(pose.rootRotation), local);
            pos[j] = [pose.rootOffset.x, skel.pelvisHeight + pose.rootOffset.y, pose.rootOffset.z];
        } else {
            rot[j] = mul(rot[parent], local);
            pos[j] = add(pos[parent], apply(rot[parent], skel.offset[j]));
        }
    }
    return { pos, rot };
}

/** A point fixed to a joint (e.g. a fingertip, a heel), in world space. */
export const pointOn = (p: Posed, j: JointId, local: V3): V3 =>
    add(p.pos[j], apply(p.rot[j], local));
