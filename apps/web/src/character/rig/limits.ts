import { JOINTS, type Euler, type JointId, type Pose } from '../schema/types';

/**
 * Joint limits in the rig's own Euler terms (degrees, R = Ry · Rx · Rz). Left / right differ only in the
 * sign of the side axis (z) and twist (y): a left arm swings out with z > 0, a right arm with z < 0.
 */
type Range = [number, number];
interface Limit {
    x: Range;
    y: Range;
    z: Range;
}

const flip = ([a, b]: Range): Range => [-b, -a];
const sides = (left: Limit): [Limit, Limit] => [
    left,
    { x: left.x, y: flip(left.y), z: flip(left.z) },
];

const spine: Limit = { x: [-30, 50], y: [-45, 45], z: [-35, 35] };
const [shoulderL, shoulderR] = sides({ x: [-25, 25], y: [-25, 25], z: [-15, 35] });
const [upperArmL, upperArmR] = sides({ x: [-190, 70], y: [-140, 140], z: [-40, 190] });
const [lowerArmL, lowerArmR] = sides({ x: [-155, 0], y: [-100, 100], z: [-15, 15] });
const [handL, handR] = sides({ x: [-85, 85], y: [-90, 90], z: [-45, 45] });
const [hipL, hipR] = sides({ x: [-15, 15], y: [-15, 15], z: [-15, 15] });
const [upperLegL, upperLegR] = sides({ x: [-135, 50], y: [-70, 70], z: [-35, 100] });
const [lowerLegL, lowerLegR] = sides({ x: [0, 160], y: [-30, 30], z: [-10, 10] });
const [footL, footR] = sides({ x: [-40, 70], y: [-35, 35], z: [-30, 30] });
const [toeL, toeR] = sides({ x: [-50, 40], y: [-10, 10], z: [-10, 10] });

export const LIMITS: Record<JointId, Limit> = {
    pelvis: { x: [-60, 60], y: [-90, 90], z: [-45, 45] },
    spine1: spine,
    spine2: spine,
    chest: spine,
    neck: { x: [-45, 55], y: [-70, 70], z: [-35, 35] },
    head: { x: [-50, 60], y: [-80, 80], z: [-40, 40] },
    shoulderL,
    upperArmL,
    lowerArmL,
    handL,
    shoulderR,
    upperArmR,
    lowerArmR,
    handR,
    hipL,
    upperLegL,
    lowerLegL,
    footL,
    toeL,
    hipR,
    upperLegR,
    lowerLegR,
    footR,
    toeR,
};

const clamp = (v: number, [lo, hi]: Range) => Math.min(hi, Math.max(lo, v));

export const clampJoint = (j: JointId, e: Euler): Euler => {
    const l = LIMITS[j];
    return { x: clamp(e.x, l.x), y: clamp(e.y, l.y), z: clamp(e.z, l.z) };
};

/** The pose with every joint inside its limits (a new object; the input is not changed). */
export function clampPose(pose: Pose): Pose {
    const joints: Pose['joints'] = {};
    for (const j of JOINTS) {
        const e = pose.joints[j];
        if (e) joints[j] = clampJoint(j, e);
    }
    return { ...pose, joints };
}
