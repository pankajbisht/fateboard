import { blendPoses } from '../rig/poseOps';
import { buildSkeleton, type Skeleton } from '../rig/skeleton';
import type { V3 } from '../rig/math';
import type { Body, Pose } from '../schema/types';
import { ease } from './ease';
import { fightPose } from './fightDsl';
import { leadSide, stanced } from './mirror';
import { solveKeyPose } from './solve';
import type { CombatMove, KeyName, Stance, StancedMove } from './types';
import { KEY_NAMES } from './types';

/**
 * Playback (docs/COMBAT_PACK.md §5 Q1, decided 2026-11-27): a move is baked once per body into frame poses —
 * start → peak with the peak's ease (a strike snaps out), the peak held `hitStop` frames (the freeze on impact),
 * peak → recover with the recover's ease (slower back). The timeline swaps cached drawings of these frames; nothing
 * is solved or allocated during playback.
 */
export interface BakedMove {
    frames: Pose[];
    /** index of the impact frame (the first peak frame) */
    hit: number;
    keys: Record<KeyName, Pose>;
}

/** The three key poses of a move on one body, before solving (body-free; the library shows the peak). */
export function keyPose(sm: StancedMove, name: KeyName): Pose {
    const m = sm.move;
    const id = name === 'peak' ? m.id : `${m.id}-${name}`;
    return fightPose(id, m.name, [...m.tags, m.discipline, 'combat'], sm.keys[name].spec);
}

/** The key poses solved on one body. `target` (rig space) aims the peak strike at a real opponent (Stage 4). */
export function solveKeys(skel: Skeleton, sm: StancedMove, target?: V3): Record<KeyName, Pose> {
    const lead = leadSide(sm.stance);
    const out = {} as Record<KeyName, Pose>;
    for (const name of KEY_NAMES)
        out[name] = solveKeyPose(
            skel,
            keyPose(sm, name),
            sm.keys[name],
            lead,
            name === 'peak' ? sm.strike : undefined,
            name === 'peak' ? target : undefined,
        );
    return out;
}

/** `hitStop` overrides the move's freeze on impact (0 = no freeze: the effects' hit-stop switch off). */
export function bakeKeys(
    sm: StancedMove,
    keys: Record<KeyName, Pose>,
    hitStop = sm.move.hitStop,
): BakedMove {
    const frames: Pose[] = [keys.start];
    const seg = (a: Pose, b: Pose, name: KeyName) => {
        const k = sm.keys[name];
        const n = Math.max(1, Math.round(k.frames));
        for (let i = 1; i <= n; i++) frames.push(blendPoses(a, b, ease(k.ease, i / n)));
    };
    seg(keys.start, keys.peak, 'peak');
    const hit = frames.length - 1;
    for (let i = 0; i < hitStop; i++) frames.push(keys.peak);
    seg(keys.peak, keys.recover, 'recover');
    return { frames, hit, keys };
}

export function bakeMove(skel: Skeleton, sm: StancedMove, target?: V3): BakedMove {
    return bakeKeys(sm, solveKeys(skel, sm, target));
}

/** Solo bakes are cached per move, stance and body (bounded: the oldest goes first). */
const CACHE = new Map<string, BakedMove>();
const CACHE_MAX = 48;

export function bakeCached(body: Body, move: CombatMove, stance: Stance = 'orthodox'): BakedMove {
    const key = `${move.id}|${stance}|${JSON.stringify(body)}`;
    const hit = CACHE.get(key);
    if (hit) {
        CACHE.delete(key);
        CACHE.set(key, hit);
        return hit;
    }
    const baked = bakeMove(buildSkeleton(body), stanced(move, stance));
    CACHE.set(key, baked);
    if (CACHE.size > CACHE_MAX) CACHE.delete(CACHE.keys().next().value as string);
    return baked;
}
