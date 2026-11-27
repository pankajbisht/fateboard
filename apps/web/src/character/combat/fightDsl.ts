import { pose } from '../data/poseDsl';
import type { PoseSpec } from '../data/poseDsl';
import { clampPose } from '../rig/limits';
import type { Euler, JointId, Pose } from '../schema/types';
import type { FightSpec } from './types';

/**
 * Fight poses in body terms (docs/COMBAT_PACK.md §2): the pose DSL plus the details a fighter needs —
 * `leg.heel` (on the ball of the foot: the foot points down, the toes bend back so they stay on the floor),
 * `leg.pivot` (the foot turns on its ball: out +, in −) and `arm.shrug` (the shoulder lifted to cover the chin).
 * The result is always inside the joint limits.
 */
const ZERO: Euler = { x: 0, y: 0, z: 0 };

export function fightPose(
    id: string,
    name: string,
    tags: readonly string[],
    s: FightSpec,
    category = 'martial',
): Pose {
    const p = pose(id, name, category, [...tags], s as PoseSpec);
    const joints = { ...p.joints };
    for (const side of ['L', 'R'] as const) {
        const k = side === 'L' ? 1 : -1;
        const leg = s[`leg${side}`];
        const foot = `foot${side}` as JointId;
        const toe = `toe${side}` as JointId;
        const f = joints[foot] ?? ZERO;
        const heel = leg?.heel ?? 0;
        joints[foot] = { x: f.x + heel, y: k * (leg?.pivot ?? 0) + 0, z: f.z };
        if (heel) joints[toe] = { x: -heel, y: 0, z: 0 };
        const shrug = s[`arm${side}`]?.shrug ?? 0;
        if (shrug) joints[`shoulder${side}` as JointId] = { x: 0, y: 0, z: k * shrug };
    }
    return clampPose({ ...p, joints });
}

/** `over` on top of `base`, one body part at a time (a move's key = its stance with what changes). */
export function mergeSpec(base: FightSpec, over: FightSpec = {}): FightSpec {
    const out: FightSpec = { ...base, ...over };
    for (const k of ['root', 'spine', 'head', 'armL', 'armR', 'legL', 'legR'] as const)
        if (base[k] || over[k]) (out as Record<string, unknown>)[k] = { ...base[k], ...over[k] };
    return out;
}
