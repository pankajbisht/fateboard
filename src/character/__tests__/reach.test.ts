import { describe, expect, it } from 'vitest';
import { RECIPES, fromRecipe } from '../data/recipes';
import { solveFK } from '../rig/fk';
import { ground } from '../rig/grounding';
import { LIMITS, clampPose } from '../rig/limits';
import { solveReach } from '../rig/reach';
import { buildSkeleton } from '../rig/skeleton';
import { STAND_POSE } from '../schema/parse';
import type { JointId } from '../schema/types';

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
