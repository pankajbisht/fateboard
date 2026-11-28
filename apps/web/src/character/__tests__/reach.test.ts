// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { RECIPES, fromRecipe } from '../data/recipes';
import { solveFK } from '../rig/fk';
import { ground } from '../rig/grounding';
import { LIMITS, clampPose } from '../rig/limits';
import { armHand, handAtFull, solveReach } from '../rig/reach';
import { buildSkeleton } from '../rig/skeleton';
import { STAND_POSE } from '../schema/parse';
import type { Ground, JointId } from '../schema/types';

const bodies = [0, 1, 3, 8].map((i) => fromRecipe(RECIPES[i], `b${i}`));
const handOf = (skel: ReturnType<typeof buildSkeleton>, pose: typeof STAND_POSE, s: 'L' | 'R') =>
    ground(skel, solveFK(skel, pose), pose.ground).pos[`hand${s}` as JointId];

describe('solveReach', () => {
    it('puts the hand within half a centimetre of any point the arm can reach, on a child, a teen and tall adults', () => {
        for (const c of bodies) {
            const skel = buildSkeleton(c.body);
            const shoulder = ground(skel, solveFK(skel, STAND_POSE), 'both').pos.shoulderL;
            const reach = skel.upperArm + skel.foreArm;
            for (const [fx, fy, fz] of [
                [0.5, 0, 0.5],
                [0.3, 0.3, 0.6],
                [0.6, -0.2, 0.4],
                [-0.2, 0.1, 0.6],
                [0.4, 0.4, 0.3],
            ]) {
                const target: [number, number, number] = [
                    shoulder[0] + fx * reach,
                    shoulder[1] + fy * reach,
                    shoulder[2] + fz * reach,
                ];
                const r = solveReach(skel, STAND_POSE, 'L', target);
                expect(r.error, `${c.id} ${target}`).toBeLessThan(0.5);
                expect(handOf(skel, r.pose, 'L')).toSatisfy(
                    (h: number[]) =>
                        Math.hypot(h[0] - target[0], h[1] - target[1], h[2] - target[2]) < 0.5,
                );
            }
        }
    });

    it('works for the right arm too, mirrored', () => {
        const skel = buildSkeleton(bodies[2].body);
        const shoulder = ground(skel, solveFK(skel, STAND_POSE), 'both').pos.shoulderR;
        const reach = skel.upperArm + skel.foreArm;
        const r = solveReach(skel, STAND_POSE, 'R', [
            shoulder[0] - 0.4 * reach,
            shoulder[1] + 0.1 * reach,
            shoulder[2] + 0.6 * reach,
        ]);
        expect(r.error).toBeLessThan(0.5);
    });

    it('stays inside the joint limits, changes only that arm, and gets as close as it can to a target out of reach', () => {
        const skel = buildSkeleton(bodies[2].body);
        const r = solveReach(skel, STAND_POSE, 'L', [300, 150, 300]);
        expect(r.error).toBeGreaterThan(100);
        expect(clampPose(r.pose).joints).toEqual(r.pose.joints);
        const changed = (Object.keys(r.pose.joints) as JointId[]).filter(
            (j) => JSON.stringify(r.pose.joints[j]) !== JSON.stringify(STAND_POSE.joints[j]),
        );
        expect(changed.sort()).toEqual(['lowerArmL', 'upperArmL']);
        // pointing toward the target: the farther the target the straighter the arm
        expect(Math.abs(r.pose.joints.lowerArmL!.x)).toBeLessThan(10);
        void LIMITS;
    });

    it('is deterministic and does not change the pose it was given', () => {
        const skel = buildSkeleton(bodies[1].body);
        const before = JSON.stringify(STAND_POSE);
        const a = solveReach(skel, STAND_POSE, 'L', [20, 100, 30]);
        expect(solveReach(skel, STAND_POSE, 'L', [20, 100, 30])).toEqual(a);
        expect(JSON.stringify(STAND_POSE)).toBe(before);
    });
});

describe('armHand (the fast hand position the solver uses)', () => {
    it('is the same as posing and grounding the whole body, in every grounding, on a child and a tall adult', () => {
        const angles = [
            [{ x: 0, y: 0, z: 8 }, 8],
            [{ x: -90, y: -40, z: 60 }, 95],
            [{ x: 30, y: 70, z: -20 }, 130],
            [{ x: -150, y: 10, z: 120 }, 20],
        ] as const;
        for (const c of [bodies[0], bodies[3]]) {
            const skel = buildSkeleton(c.body);
            for (const g of ['both', 'left', 'right', 'air', 'floor'] as Ground[])
                for (const side of ['L', 'R'] as const) {
                    // a leaning, bent body, so the chain from the root to the shoulder is not trivial
                    const pose = {
                        ...STAND_POSE,
                        ground: g,
                        rootRotation: { yaw: 25, pitch: 10, roll: 4 },
                        joints: {
                            ...STAND_POSE.joints,
                            spine1: { x: 12, y: 8, z: -6 },
                            chest: { x: 9, y: -10, z: 5 },
                            upperLegL: { x: -35, y: 0, z: 4 },
                            lowerLegL: { x: 40, y: 0, z: 0 },
                        },
                    };
                    const fast = armHand(skel, pose, side);
                    for (const [u, e] of angles) {
                        const a = fast(u, e);
                        const b = handAtFull(skel, pose, side, u, e);
                        for (let k = 0; k < 3; k++)
                            expect(Math.abs(a[k] - b[k]), `${g} ${side} ${k}`).toBeLessThan(1e-6);
                    }
                }
        }
    });
});
