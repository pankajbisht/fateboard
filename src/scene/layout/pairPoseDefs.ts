import { pose } from '@/character/data/poseDsl';
import { pointOn, type Posed } from '@/character/rig/fk';
import type { V3 } from '@/character/rig/math';
import type { Skeleton } from '@/character/rig/skeleton';
import type { HandShape, JointId, Pose } from '@/character/schema/types';

/**
 * Pose pairs (docs/CHARACTER_STUDIO.md phase 3 / 8): two people in contact, as data. Each pair says how they stand
 * (distance and facing), each person's base pose, and which hand goes where on the other person (a point on a joint,
 * or a point between them). `pairPoses.ts` places the two and solves the arms, so contacts land for any pair of
 * heights; the contact test checks every pair across 120–190 cm.
 */
export interface Body {
    skel: Skeleton;
    posed: Posed;
    /** a point in this person's rig space → world */
    at: (rig: V3) => V3;
}
/** A point in the world, chosen from both people. */
export type Spot = (me: Body, other: Body) => V3;
export interface Reach {
    arm: 'L' | 'R';
    to: Spot;
    hand?: HandShape;
}
export interface Side {
    pose: Pose;
    reach?: Reach[];
}
export type Facing = 'face' | 'side' | 'back';
export interface PairPose {
    id: string;
    name: string;
    tags: readonly string[];
    facing: Facing;
    /** distance between the two (cm, along the line between them) */
    gap: (a: Skeleton, b: Skeleton) => number;
    a: Side;
    b: Side;
    /** both look at each other */
    look?: boolean;
    /** `a` is always the taller of the two (the one who pats, points down, lifts) */
    taller?: 'a';
    /** the tallest may be at most this many times the shortest (a waltz hold needs similar heights) */
    maxRatio?: number;
}

const armOf = (s: Skeleton) => s.upperArm + s.foreArm;
/** A point on one of the person's joints (`local` in the joint's own frame), in the world. */
export const on = (b: Body, j: JointId, local: V3 = [0, 0, 0]): V3 =>
    b.at(pointOn(b.posed, j, local));
const mid2 = (p: V3, q: V3): V3 => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
const dsl = (id: string, spec: Parameters<typeof pose>[4]) => pose(id, id, 'pair', ['pair'], spec);
const calm = dsl('pair-calm', {});

/** Hug: both arms round the other's back, at a height this person can reach (a child hugs the waist). */
const back =
    (arm: 'L' | 'R'): Spot =>
    (me, other) => {
        const k = arm === 'L' ? 1 : -1;
        const sh = on(me, 'shoulderL')[1];
        const p = on(other, 'spine2', [
            k * other.skel.size.shoulderW * 0.26,
            0,
            -other.skel.size.chestDepth * 0.56,
        ]);
        const reach = armOf(me.skel);
        // the hugger may crouch to a smaller person (the solver bends the knees), but cannot hug above their own shoulder
        return [p[0], Math.min(Math.max(p[1], sh - reach * 1.7), sh + reach * 0.05), p[2]];
    };
/**
 * A meeting height both can reach: each person reaches from a little above their shoulder down to about a third of
 * an arm below it; `want` is kept when it fits (the shorter person's shoulder, usually).
 */
/** The point between the two, nearer the person with the shorter arm (both sides get the same point). */
const nearer = (me: Body, other: Body): V3 => {
    const a = on(me, 'chest');
    const b = on(other, 'chest');
    const t = armOf(me.skel) / (armOf(me.skel) + armOf(other.skel));
    return [a[0] + (b[0] - a[0]) * t, 0, a[2] + (b[2] - a[2]) * t];
};
const meetHeight = (me: Body, other: Body, want: number): number => {
    const sh = (b: Body) => on(b, 'shoulderL')[1];
    const lo = Math.max(sh(me) - 0.62 * armOf(me.skel), sh(other) - 0.62 * armOf(other.skel));
    const hi = Math.min(sh(me) + 0.9 * armOf(me.skel), sh(other) + 0.9 * armOf(other.skel));
    return lo <= hi ? Math.min(hi, Math.max(lo, want)) : (lo + hi) / 2;
};
/** Hands meet between the two at a height both can reach, near `dy` from the shorter person's shoulder. */
const lowMid =
    (dy: number): Spot =>
    (me, other) => {
        const m = nearer(me, other);
        const want = Math.min(on(me, 'shoulderL')[1], on(other, 'shoulderL')[1]) + dy;
        return [m[0], meetHeight(me, other, want), m[2]];
    };
/** High-five height: each hand about three quarters of an arm above its shoulder, the lower of the two. */
const highMid: Spot = (me, other) => {
    const m = nearer(me, other);
    const y = (b: Body) => on(b, 'shoulderL')[1] + 0.75 * armOf(b.skel);
    return [m[0], meetHeight(me, other, Math.min(y(me), y(other))), m[2]];
};
/** A point on the other person, moved to a height this person can reach (the hand lands as near as it can). */
const reachable =
    (spot: Spot): Spot =>
    (me, other) => {
        const p = spot(me, other);
        const sh = on(me, 'shoulderL')[1];
        const r = armOf(me.skel);
        return [p[0], Math.min(Math.max(p[1], sh - r * 0.62), sh + r * 0.9), p[2]];
    };
const shoulderOf =
    (side: 'L' | 'R', up = 3): Spot =>
    (_me, other) => {
        const p = on(other, `shoulder${side}` as JointId);
        return [p[0], p[1] + up, p[2]];
    };

export const PAIR_POSES: PairPose[] = [
    {
        id: 'handshake',
        name: 'Handshake',
        tags: ['greeting', 'meet', 'hands', 'business'],
        facing: 'face',
        gap: (a, b) => 0.7 * (armOf(a) + armOf(b)),
        a: { pose: calm, reach: [{ arm: 'R', to: lowMid(-14), hand: 'grip' }] },
        b: { pose: calm, reach: [{ arm: 'R', to: lowMid(-14), hand: 'grip' }] },
        look: true,
    },
    {
        id: 'high-five',
        name: 'High five',
        tags: ['greeting', 'celebrate', 'hands', 'team'],
        facing: 'face',
        gap: (a, b) => 0.7 * (armOf(a) + armOf(b)),
        a: {
            pose: dsl('pair-hf', { spine: { bend: -4 } }),
            reach: [{ arm: 'R', to: highMid, hand: 'open' }],
        },
        b: {
            pose: dsl('pair-hf', { spine: { bend: -4 } }),
            reach: [{ arm: 'R', to: highMid, hand: 'open' }],
        },
        look: true,
    },
    {
        id: 'fist-bump',
        name: 'Fist bump',
        tags: ['greeting', 'friends', 'cool', 'hands'],
        facing: 'face',
        gap: (a, b) => 0.7 * (armOf(a) + armOf(b)),
        a: { pose: calm, reach: [{ arm: 'R', to: lowMid(-10), hand: 'fist' }] },
        b: { pose: calm, reach: [{ arm: 'R', to: lowMid(-10), hand: 'fist' }] },
        look: true,
    },
    {
        id: 'hug',
        name: 'Hug',
        tags: ['affection', 'love', 'family', 'friends', 'embrace'],
        facing: 'face',
        gap: (a, b) => 0.5 * (a.size.chestDepth + b.size.chestDepth) + 6,
        a: {
            pose: dsl('pair-hug', { head: { tilt: 8 } }),
            reach: [
                { arm: 'L', to: back('L'), hand: 'open' },
                { arm: 'R', to: back('R'), hand: 'open' },
            ],
        },
        b: {
            pose: dsl('pair-hug', { head: { tilt: -8 } }),
            reach: [
                { arm: 'L', to: back('L'), hand: 'open' },
                { arm: 'R', to: back('R'), hand: 'open' },
            ],
        },
    },
    {
        id: 'arm-around',
        name: 'Arm around the shoulder',
        tags: ['friends', 'support', 'buddy', 'photo'],
        facing: 'side',
        gap: (a, b) => 0.5 * (a.size.shoulderW + b.size.shoulderW) + 8,
        a: { pose: calm, reach: [{ arm: 'L', to: shoulderOf('L'), hand: 'relaxed' }] },
        b: {
            pose: dsl('pair-aroundb', { head: { tilt: 6 } }),
            reach: [
                {
                    arm: 'R',
                    to: (me, o) => on(o, 'spine1', [o.skel.size.waistW * 0.5, 0, -2]),
                    hand: 'relaxed',
                },
            ],
        },
        taller: 'a',
    },
    {
        id: 'hand-on-shoulder',
        name: 'Hand on the shoulder',
        tags: ['comfort', 'support', 'friends', 'care'],
        facing: 'side',
        gap: (a, b) => 0.5 * (a.size.shoulderW + b.size.shoulderW) + 18,
        a: { pose: calm, reach: [{ arm: 'L', to: shoulderOf('R'), hand: 'open' }] },
        b: { pose: dsl('pair-sad', { spine: { bend: 10 }, head: { nod: 16 } }) },
        taller: 'a',
    },
    {
        id: 'side-hug',
        name: 'Side hug',
        tags: ['affection', 'friends', 'photo', 'family'],
        facing: 'side',
        gap: (a, b) => 0.5 * (a.size.shoulderW + b.size.shoulderW) + 4,
        a: {
            pose: calm,
            reach: [
                {
                    arm: 'L',
                    to: (me, o) => on(o, 'spine2', [-o.skel.size.shoulderW * 0.5, 0, -2]),
                    hand: 'relaxed',
                },
            ],
        },
        b: {
            pose: dsl('pair-sidehug', { head: { tilt: 8 } }),
            reach: [
                {
                    arm: 'R',
                    to: (me, o) => on(o, 'spine1', [o.skel.size.waistW * 0.5, 0, -2]),
                    hand: 'relaxed',
                },
            ],
        },
    },
    {
        id: 'holding-hands',
        name: 'Holding hands',
        tags: ['love', 'walk', 'friends', 'couple', 'kids'],
        facing: 'side',
        gap: (a, b) => 0.5 * (a.size.shoulderW + b.size.shoulderW) + 22,
        a: {
            pose: calm,
            reach: [
                { arm: 'L', to: (me, o) => mid2(on(me, 'handL'), on(o, 'handR')), hand: 'grip' },
            ],
        },
        b: {
            pose: calm,
            reach: [
                { arm: 'R', to: (me, o) => mid2(on(o, 'handL'), on(me, 'handR')), hand: 'grip' },
            ],
        },
    },
    {
        id: 'back-to-back',
        name: 'Back to back',
        tags: ['team', 'cool', 'defend', 'partners', 'poster'],
        facing: 'back',
        gap: (a, b) => 0.5 * (a.size.chestDepth + b.size.chestDepth) + 6,
        a: {
            pose: dsl('pair-b2b', {
                armL: { raise: 30, twist: -70, bend: 112 },
                armR: { raise: 34, twist: -62, bend: 118 },
                head: { nod: -4 },
            }),
        },
        b: {
            pose: dsl('pair-b2b', {
                armL: { raise: 34, twist: -62, bend: 118 },
                armR: { raise: 30, twist: -70, bend: 112 },
                head: { nod: -4 },
            }),
        },
    },
    {
        id: 'shoulder-lean',
        name: 'Head on the shoulder',
        tags: ['love', 'tired', 'friends', 'comfort', 'couple'],
        facing: 'side',
        gap: (a, b) => 0.5 * (a.size.shoulderW + b.size.shoulderW) + 6,
        a: { pose: calm },
        b: { pose: dsl('pair-lean', { head: { tilt: 22 }, spine: { side: 8 } }) },
    },
    {
        id: 'pat-head',
        name: 'Pat on the head',
        tags: ['kind', 'praise', 'family', 'teacher', 'kid'],
        facing: 'face',
        gap: (a, b) => 0.5 * (a.size.chestDepth + b.size.chestDepth) + 22,
        a: {
            pose: calm,
            reach: [
                {
                    arm: 'R',
                    to: (_me, o) => on(o, 'head', [0, o.skel.size.head[1] * 1.9, 0]),
                    hand: 'open',
                },
            ],
        },
        b: { pose: dsl('pair-pat', { head: { nod: 10 } }) },
        look: true,
        taller: 'a',
    },
    {
        id: 'dance-hold',
        name: 'Dance hold',
        tags: ['dance', 'waltz', 'couple', 'wedding', 'romantic'],
        facing: 'face',
        gap: (a, b) =>
            0.5 * (a.size.chestDepth + b.size.chestDepth) +
            14 +
            0.3 * Math.abs(a.height - b.height),
        a: {
            pose: dsl('pair-waltz', { spine: { bend: -6 }, head: { turn: 14 } }),
            reach: [
                {
                    arm: 'R',
                    to: (me, o) =>
                        on(o, 'spine2', [
                            -o.skel.size.shoulderW * 0.28,
                            0,
                            -o.skel.size.chestDepth * 0.56,
                        ]),
                    hand: 'open',
                },
                {
                    arm: 'L',
                    to: (me, o) => {
                        const m = lowMid(0)(me, o);
                        return [m[0], m[1], m[2] + 0.5 * armOf(me.skel)];
                    },
                    hand: 'grip',
                },
            ],
        },
        b: {
            pose: dsl('pair-waltz', { spine: { bend: -6 }, head: { turn: -14 } }),
            reach: [
                {
                    arm: 'L',
                    to: reachable((_me, o) => {
                        const p = on(o, 'shoulderR');
                        return [p[0], p[1] + 2, p[2]];
                    }),
                    hand: 'open',
                },
                {
                    arm: 'R',
                    to: (me, o) => {
                        const m = lowMid(0)(me, o);
                        return [m[0], m[1], m[2] - 0.5 * armOf(o.skel)];
                    },
                    hand: 'grip',
                },
            ],
        },
        maxRatio: 1.3,
    },
    {
        id: 'point-at',
        name: 'Pointing at someone',
        tags: ['argue', 'blame', 'accuse', 'talk', 'conflict'],
        facing: 'face',
        gap: (a) => 0.8 * armOf(a) + 18,
        a: {
            pose: calm,
            reach: [
                {
                    arm: 'R',
                    to: reachable((_me, o) => on(o, 'chest', [0, 0, o.skel.size.chestDepth * 0.5])),
                    hand: 'point',
                },
            ],
        },
        b: {
            pose: dsl('pair-defend', {
                armL: { raise: 30, twist: -70, bend: 112 },
                armR: { raise: 34, twist: -62, bend: 118 },
                head: { nod: 6 },
            }),
        },
        look: true,
        taller: 'a',
    },
];

/** Can these two do this pair pose? (heights) */
export const pairSuits = (def: PairPose, a: Skeleton, b: Skeleton) =>
    !def.maxRatio || Math.max(a.height, b.height) / Math.min(a.height, b.height) <= def.maxRatio;

export const pairPoseById = (id: string) => PAIR_POSES.find((p) => p.id === id);
