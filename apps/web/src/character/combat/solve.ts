import { pointOn, solveFK, type Posed } from '../rig/fk';
import { ground } from '../rig/grounding';
import { clampJoint, clampPose } from '../rig/limits';
import { apply, dist, rotY, type V3 } from '../rig/math';
import { leaned } from '../rig/reach';
import type { Skeleton } from '../rig/skeleton';
import type { Euler, JointId, Pose } from '../schema/types';
import type { Contact, Limb, MoveKey, Side, Strike, Target } from './types';

/**
 * The body-dependent half of a move (docs/COMBAT_PACK.md §2), solved per skeleton, pure and deterministic:
 * - the striking surface (fist, ball of the foot, shin, knee, elbow) is put on its target by a numeric limb solve
 *   that starts from the authored angles (so a hook stays a hook) and stays inside the joint limits;
 * - the torso leans over the support point the weight share names;
 * - a knee contact lowers the body until that knee rests on the mat and puts the other foot down.
 * Positions are in the rig's space (cm, y up, +x the character's left, +z forward), before grounding.
 */
const ZERO: Euler = { x: 0, y: 0, z: 0 };

const CHAIN: Record<Limb, ['upperArm' | 'upperLeg', 'lowerArm' | 'lowerLeg']> = {
    hand: ['upperArm', 'lowerArm'],
    elbow: ['upperArm', 'lowerArm'],
    foot: ['upperLeg', 'lowerLeg'],
    shin: ['upperLeg', 'lowerLeg'],
    knee: ['upperLeg', 'lowerLeg'],
};

/** Where the striking surface is. */
export function effector(skel: Skeleton, p: Posed, limb: Limb, s: Side): V3 {
    switch (limb) {
        case 'hand':
            return pointOn(p, `hand${s}`, [0, -skel.hand * 0.5, 0]);
        case 'elbow':
            return p.pos[`lowerArm${s}`];
        case 'knee':
            return p.pos[`lowerLeg${s}`];
        case 'shin':
            return pointOn(p, `lowerLeg${s}`, [0, -skel.shin * 0.65, 0]);
        case 'foot':
            return pointOn(p, `foot${s}`, [0, -skel.ankle, skel.foot * 0.5]);
    }
}

/** Length from the limb's root (shoulder / hip) to its striking surface, straight. */
export function limbLength(skel: Skeleton, limb: Limb): number {
    switch (limb) {
        case 'hand':
            return skel.upperArm + skel.foreArm + skel.hand * 0.5;
        case 'elbow':
            return skel.upperArm;
        case 'knee':
            return skel.thigh;
        case 'shin':
            return skel.thigh + skel.shin * 0.65;
        case 'foot':
            return skel.thigh + skel.shin + skel.ankle;
    }
}

const rootOf = (p: Posed, limb: Limb, s: Side): V3 => p.pos[`${CHAIN[limb][0]}${s}` as JointId];

export interface Solved {
    pose: Pose;
    /** cm between the striking surface and its target */
    error: number;
}

/** Below this many cm the strike counts as landed; above it the solver tries other starts (and leans, for legs). */
const LANDED = 2;
/** Upper-joint starts tried when the authored angles do not land (rig Euler degrees; z is mirrored per side). */
const ARM_STARTS: [number, number][] = [-150, -110, -70, -30, 10].flatMap((x) =>
    [0, 40, 80, 120].map((z): [number, number] => [x, z]),
);
const LEG_STARTS: [number, number][] = [-125, -95, -65, -35, 0].flatMap((x) =>
    [0, 35, 70, 95].map((z): [number, number] => [x, z]),
);
const LEAN_ROLLS = [12, 24, 36, 48];

interface Attempt {
    u: Euler;
    b: Euler;
    c: number;
}

/**
 * Moves the limb (upper joint on all three axes, lower joint bend) so its striking surface lands on `target`.
 * Coordinate descent from the authored angles, steps 12° → 0.5°, so a hook stays a hook. Only when that does not
 * land: a few other starts (the best three by first cost), and for a leg a lean of the whole body away from the
 * kick with the standing hip opening to keep the standing leg upright (a head kick cannot be thrown upright).
 * Everything stays inside the joint limits.
 */
export function solveLimb(skel: Skeleton, pose: Pose, limb: Limb, s: Side, target: V3): Solved {
    const up = `${CHAIN[limb][0]}${s}` as JointId;
    const lo = `${CHAIN[limb][1]}${s}` as JointId;
    const k = s === 'L' ? 1 : -1;
    const leg = CHAIN[limb][0] === 'upperLeg';

    const attempt = (base: Pose): Attempt & { base: Pose } => {
        const withJ = (nu: Euler, nb: Euler): Pose => ({
            ...base,
            joints: { ...base.joints, [up]: nu, [lo]: nb },
        });
        const cost = (nu: Euler, nb: Euler) =>
            dist(effector(skel, solveFK(skel, withJ(nu, nb)), limb, s), target);
        const descend = (u0: Euler, b0: Euler): Attempt => {
            let u = u0;
            let b = b0;
            let c = cost(u, b);
            for (let step = 12; step >= 0.5; step /= 2)
                for (let round = 0; round < 24; round++) {
                    let moved = false;
                    for (const axis of ['x', 'y', 'z', 'bend'] as const)
                        for (const d of [step, -step]) {
                            const nu =
                                axis === 'bend' ? u : clampJoint(up, { ...u, [axis]: u[axis] + d });
                            const nb = axis === 'bend' ? clampJoint(lo, { ...b, x: b.x + d }) : b;
                            const nc = cost(nu, nb);
                            if (nc < c - 1e-6) {
                                u = nu;
                                b = nb;
                                c = nc;
                                moved = true;
                            }
                        }
                    if (!moved || c < 0.3) break;
                }
            return { u, b, c };
        };
        const b0 = clampJoint(lo, base.joints[lo] ?? ZERO);
        let best = descend(clampJoint(up, base.joints[up] ?? ZERO), b0);
        if (best.c > LANDED) {
            const starts = (leg ? LEG_STARTS : ARM_STARTS)
                .map(([x, z]) => clampJoint(up, { x, y: 0, z: k * z }))
                .map((u) => ({ u, c: cost(u, b0) }))
                .sort((p, q) => p.c - q.c)
                .slice(0, 3);
            for (const st of starts) {
                const r = descend(st.u, b0);
                if (r.c < best.c) best = r;
                if (best.c <= LANDED) break;
            }
        }
        return { ...best, base };
    };

    let best = attempt(pose);
    if (leg && best.c > LANDED) {
        const stand = `upperLeg${s === 'L' ? 'R' : 'L'}` as JointId;
        for (const roll of LEAN_ROLLS) {
            for (const sign of [1, -1]) {
                const r = sign * roll;
                const sl = pose.joints[stand] ?? ZERO;
                const leaned: Pose = {
                    ...pose,
                    rootRotation: { ...pose.rootRotation, roll: pose.rootRotation.roll + r },
                    joints: { ...pose.joints, [stand]: clampJoint(stand, { ...sl, z: sl.z - r }) },
                };
                const a = attempt(leaned);
                // a lean must earn its place: at least 2 cm better
                if (a.c < best.c - 2) best = a;
            }
            if (best.c <= LANDED) break;
        }
    }
    return {
        pose: { ...best.base, joints: { ...best.base.joints, [up]: best.u, [lo]: best.b } },
        error: best.c,
    };
}

/** How far grounding lifts (+) or drops (−) the body: rig space → floor space. */
const groundShift = (skel: Skeleton, pose: Pose, raw: Posed) =>
    ground(skel, raw, pose.ground).pos.pelvis[1] - raw.pos.pelvis[1];

/** Standing heights of a target on a body of this size (floor space). */
export function targetHeight(skel: Skeleton, target: Target): number {
    switch (target) {
        case 'head':
            return skel.height - skel.headHeight * 0.6;
        case 'chin':
            return skel.height - skel.headHeight * 0.95;
        case 'body':
            return skel.pelvisHeight + (skel.height - skel.pelvisHeight) * 0.38;
        case 'belly':
            return skel.pelvisHeight + (skel.height - skel.pelvisHeight) * 0.16;
        case 'leg':
            return skel.pelvisHeight * 0.68;
        case 'floor':
            return 18;
    }
}

/** sin 40°: the highest a knee strike aims above the hip */
const KNEE_RISE = 0.64;

/**
 * Solo aim (no opponent placed yet): an opponent of the same size straight ahead, the target at `reach` × the
 * limb length from the limb's root, at the target's height, on the fighter's centre line (+ `across`).
 */
export function soloAim(skel: Skeleton, pose: Pose, strike: Strike): V3 {
    const raw = solveFK(skel, pose);
    const shift = groundShift(skel, pose, raw);
    const root = rootOf(raw, strike.limb, strike.side);
    const k = strike.side === 'L' ? 1 : -1;
    const centre =
        strike.target === 'head' || strike.target === 'chin' ? raw.pos.head[0] : raw.pos.chest[0];
    const x = centre + k * (strike.across ?? 0);
    const y = targetHeight(skel, strike.target) - shift;
    const r = strike.reach * limbLength(skel, strike.limb);
    const dx = x - root[0];
    let dy = y - root[1];
    // a thigh cannot point more than about 45° above level: a knee rises forward into the belly, not straight up
    if (strike.limb === 'knee') dy = Math.min(dy, r * KNEE_RISE);
    const side = dx * dx + dy * dy;
    if (side < r * r * 0.96) return [x, y, root[2] + Math.sqrt(r * r - side)];
    // too far up, down or across for this limb (an elbow or knee at head height): the nearest point it can reach
    // toward the target, a little forward of the joint (a knee rises into the belly, an elbow to the jaw)
    const fwd = r * 0.2;
    const n = Math.hypot(dx, dy, fwd);
    return [root[0] + (dx / n) * r, root[1] + (dy / n) * r, root[2] + (fwd / n) * r];
}

/** A point on a body to aim at (floor space when `p` is grounded): face, solar plexus, lead thigh, chest. */
export function bodyPoint(skel: Skeleton, p: Posed, target: Target, lead: Side = 'L'): V3 {
    switch (target) {
        case 'head':
            return pointOn(p, 'head', [0, skel.headHeight * 0.4, skel.size.head[2] * 0.7]);
        case 'chin':
            return pointOn(p, 'head', [0, skel.headHeight * 0.05, skel.size.head[2] * 0.85]);
        case 'body':
            return pointOn(p, 'spine2', [0, 0, skel.size.chestDepth * 0.5]);
        case 'belly':
            return pointOn(p, 'spine1', [0, 0, skel.size.chestDepth * 0.5 + skel.size.belly * 0.4]);
        case 'leg': {
            const k = lead === 'L' ? 1 : -1;
            return pointOn(p, `upperLeg${lead}`, [
                k * skel.size.thigh * 0.6,
                -skel.thigh * 0.55,
                0,
            ]);
        }
        case 'floor':
            return pointOn(p, 'chest', [0, 0, skel.size.chestDepth * 0.5]);
    }
}

const MAX_LEAN = 10;
const DEG = 180 / Math.PI;

/**
 * Leans the torso part of the way over the support point (`weight` = share on the lead foot), at most 10° each
 * way: the authored lean stays the main shape, this keeps the balance believable on every build.
 */
export function leanOver(skel: Skeleton, pose: Pose, weight: number, lead: Side): Pose {
    if (pose.ground !== 'both') return pose;
    const raw = solveFK(skel, pose);
    const rear: Side = lead === 'L' ? 'R' : 'L';
    const a = raw.pos[`foot${rear}`];
    const b = raw.pos[`foot${lead}`];
    const w = Math.min(1, Math.max(0, weight));
    const support: V3 = [a[0] + (b[0] - a[0]) * w, 0, a[2] + (b[2] - a[2]) * w];
    const chest = raw.pos.chest;
    const local = apply(rotY(-pose.rootRotation.yaw), [
        support[0] - chest[0],
        0,
        support[2] - chest[2],
    ]);
    const h = Math.max(10, chest[1] - raw.pos.pelvis[1]);
    const lim = (v: number) => Math.max(-MAX_LEAN, Math.min(MAX_LEAN, v));
    const bend = lim(Math.atan2(local[2], h) * DEG * 0.5);
    const side = lim(Math.atan2(local[0], h) * DEG * 0.5);
    if (Math.abs(bend) < 0.5 && Math.abs(side) < 0.5) return pose;
    return leaned(pose, bend, side);
}

/** Lowers the body until the contact knee rests on the mat; with one knee down, the other foot is put down too. */
export function kneeDown(skel: Skeleton, pose: Pose, contact: readonly Contact[] = []): Pose {
    if (!contact.length) return pose;
    const raw = solveFK(skel, pose);
    const kneeY = Math.min(
        ...contact.map((c) => raw.pos[c === 'kneeL' ? 'lowerLegL' : 'lowerLegR'][1]),
    );
    const drop = kneeY - skel.size.knee * 0.5;
    let p: Pose = {
        ...pose,
        ground: 'air',
        rootOffset: { ...pose.rootOffset, y: pose.rootOffset.y - drop },
    };
    if (contact.length === 1) {
        const other: Side = contact[0] === 'kneeL' ? 'R' : 'L';
        const ball = effector(skel, solveFK(skel, p), 'foot', other);
        p = solveLimb(skel, p, 'foot', other, [ball[0], 1, ball[2]]).pose;
    }
    return p;
}

/** A key's pose before its strike is solved: the weight lean, then the knee contact. */
export function prepareKey(skel: Skeleton, base: Pose, key: MoveKey, lead: Side): Pose {
    return kneeDown(skel, leanOver(skel, base, key.weight, lead), key.contact);
}

/**
 * One key on one body: compiled pose → weight → knee contact → strike on target (the peak only; after the
 * contact, so ground-and-pound aims from the kneeling height).
 */
export function solveKeyPose(
    skel: Skeleton,
    base: Pose,
    key: MoveKey,
    lead: Side,
    strike?: Strike,
    target?: V3,
): Pose {
    let p = prepareKey(skel, base, key, lead);
    if (strike)
        p = solveLimb(skel, p, strike.limb, strike.side, target ?? soloAim(skel, p, strike)).pose;
    return clampPose(p);
}
