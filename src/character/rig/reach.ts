import type { Euler, JointId, Pose } from '../schema/types';
import { solveFK } from './fk';
import { ground } from './grounding';
import { clampJoint } from './limits';
import { add, apply, dist, fromEuler, mul, type V3 } from './math';
import { PARENT, type Skeleton } from './skeleton';

/**
 * Reaching (docs/CHARACTER_STUDIO.md phase 3, pair poses): sets one arm so its hand is at a target point, for any
 * body. Three joints decide it (the upper arm's three angles and the elbow's bend); the solver starts from several
 * arm positions, then refines the best by coordinate descent with shrinking steps, always inside the joint limits.
 * Pure and deterministic. The target is in the same space as the posed skeleton (feet on the floor, y up).
 */
type Side = 'L' | 'R';
const ZERO: Euler = { x: 0, y: 0, z: 0 };

/** Where the hand is for these arm angles, with the whole body posed and grounded for each one (the reference). */
export function handAtFull(skel: Skeleton, pose: Pose, s: Side, upper: Euler, elbow: number): V3 {
    const joints = {
        ...pose.joints,
        [`upperArm${s}`]: upper,
        [`lowerArm${s}`]: { x: elbow, y: 0, z: 0 },
    };
    const posed = ground(skel, solveFK(skel, { ...pose, joints }), pose.ground);
    return posed.pos[`hand${s}` as JointId];
}

/**
 * The hand's position as a function of the arm angles, the same as `handAtFull` but fast: the arm does not move the feet,
 * so (unless the body lies on the floor, where an arm can be its lowest point) the body is posed and grounded once, and
 * each candidate only turns the three joints of the arm. The solver tries about 1000 candidates for every reach.
 */
export function armHand(skel: Skeleton, pose: Pose, s: Side): (upper: Euler, elbow: number) => V3 {
    if (pose.ground === 'floor') return (u, e) => handAtFull(skel, pose, s, u, e);
    const upperId = `upperArm${s}` as JointId;
    const lowerId = `lowerArm${s}` as JointId;
    const handId = `hand${s}` as JointId;
    const base = ground(skel, solveFK(skel, pose), pose.ground);
    const parent = PARENT[upperId] as JointId;
    const parentRot = base.rot[parent];
    const upperPos = add(base.pos[parent], apply(parentRot, skel.offset[upperId]));
    return (upper, elbow) => {
        const upperRot = mul(parentRot, fromEuler(upper));
        const lowerPos = add(upperPos, apply(upperRot, skel.offset[lowerId]));
        const lowerRot = mul(upperRot, fromEuler({ x: elbow, y: 0, z: 0 }));
        return add(lowerPos, apply(lowerRot, skel.offset[handId]));
    };
}

const START_RAISE = [-60, -30, 0, 30, 60, 90, 120, 150, 175];
const START_SPREAD = [0, 30, 60, 90, 120, 150];
const START_TWIST = [-100, -50, 0, 50];
const START_BEND = [15, 55, 95, 135];
/** how many of the best starting arms are refined */
const REFINE = 3;

export interface Reached {
    pose: Pose;
    /** how far the hand ends from the target (cm) */
    error: number;
}

export function solveReach(skel: Skeleton, pose: Pose, s: Side, target: V3): Reached {
    const k = s === 'L' ? 1 : -1;
    const upperId = `upperArm${s}` as JointId;
    const lowerId = `lowerArm${s}` as JointId;
    const make = (raise: number, spread: number, twist: number): Euler =>
        clampJoint(upperId, { x: -raise, y: k * twist, z: k * (spread + 8) });
    const hand = armHand(skel, pose, s);
    const cost = (u: Euler, bend: number) => dist(hand(u, bend), target);

    // coarse: a grid of starting arms, the best few kept
    const starts: { u: Euler; bend: number; c: number }[] = [];
    for (const r of START_RAISE)
        for (const sp of START_SPREAD)
            for (const tw of START_TWIST)
                for (const b of START_BEND) {
                    const u = make(r, sp, tw);
                    const e = clampJoint(lowerId, { x: -b, y: 0, z: 0 }).x;
                    starts.push({ u, bend: e, c: cost(u, e) });
                }
    starts.sort((a, b) => a.c - b.c);

    // fine: coordinate descent from each of the best, steps 16° → 0.25°
    let best = starts[0];
    for (const start of starts.slice(0, REFINE)) {
        let { u, bend, c } = start;
        for (let step = 16; step >= 0.25; step /= 2)
            for (let round = 0; round < 30; round++) {
                let moved = false;
                for (const axis of ['x', 'y', 'z', 'bend'] as const)
                    for (const d of [step, -step]) {
                        const nu =
                            axis === 'bend'
                                ? u
                                : clampJoint(upperId, { ...u, [axis]: u[axis] + d });
                        const nb =
                            axis === 'bend'
                                ? clampJoint(lowerId, { x: bend + d, y: 0, z: 0 }).x
                                : bend;
                        const nc = cost(nu, nb);
                        if (nc < c - 1e-9) {
                            u = nu;
                            bend = nb;
                            c = nc;
                            moved = true;
                        }
                    }
                if (!moved) break;
            }
        if (c < best.c) best = { u, bend, c };
        if (best.c < 0.05) break;
    }
    const { u, bend, c } = best;
    return {
        pose: {
            ...pose,
            joints: { ...pose.joints, [upperId]: u, [lowerId]: { ...ZERO, x: bend } },
        },
        error: c,
    };
}

/**
 * The pose bent at the spine (`bend` forward, `side` to the character's left) and crouched (`crouch`: knees and hips
 * bent, degrees added to the pose), all kept inside the joint limits.
 */
export function leaned(pose: Pose, bend: number, side: number, crouch = 0): Pose {
    const joints = { ...pose.joints };
    const add = (j: JointId, dx: number, dz = 0) => {
        const e = joints[j] ?? ZERO;
        joints[j] = clampJoint(j, { ...e, x: e.x + dx, z: e.z + dz });
    };
    add('spine1', bend * 0.3, -side * 0.3);
    add('spine2', bend * 0.35, -side * 0.35);
    add('chest', bend * 0.35, -side * 0.35);
    if (crouch)
        for (const l of ['L', 'R'] as const) {
            // thighs forward, shins back, feet kept flat
            add(`upperLeg${l}` as JointId, -crouch);
            add(`lowerLeg${l}` as JointId, crouch * 1.9);
            add(`foot${l}` as JointId, -crouch * 0.9);
        }
    return { ...pose, joints };
}

const CROUCH = [0, 25, 50, 72];
const LEAN_BEND = [0, 14, 28, 42, 56];
const LEAN_SIDE = [-20, 0, 20];
/** the gentlest postures first: a little crouch beats a big lean beats a twist */
const POSTURES = CROUCH.flatMap((c) =>
    LEAN_BEND.flatMap((b) => LEAN_SIDE.map((sd) => ({ c, b, sd }))),
)
    .filter((p) => p.c || p.b || p.sd)
    .sort(
        (x, y) => x.c * 0.6 + x.b + Math.abs(x.sd) * 0.7 - (y.c * 0.6 + y.b + Math.abs(y.sd) * 0.7),
    );

/**
 * Like `solveReach`, and when the target is too far or too low for the arm alone (an adult reaching a child's
 * shoulder), tries bending the knees and leaning toward it, the gentlest posture that works first.
 */
export function reachWithLean(
    skel: Skeleton,
    pose: Pose,
    s: Side,
    target: V3,
    tolerance = 0.4,
): Reached {
    let best = solveReach(skel, pose, s, target);
    if (best.error <= tolerance) return best;
    for (const p of POSTURES) {
        const r = solveReach(skel, leaned(pose, p.b, p.sd, p.c), s, target);
        if (r.error < best.error) best = r;
        if (best.error <= tolerance) return best;
    }
    return best;
}
