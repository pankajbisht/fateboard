// @vitest-environment node
/**
 * Character Studio phase 1: skeleton proportions, FK, two-bone IK, joint limits, mirror, blend, keyframe
 * export and foot contact (docs/CHARACTER_STUDIO.md §5).
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_BODY, STAND_POSE, parsePose } from '../schema/parse';
import { JOINTS, type Body, type JointId, type Pose } from '../schema/types';
import { solveFK } from '../rig/fk';
import { footBottom, ground } from '../rig/grounding';
import { twoBoneIK } from '../rig/ik';
import { clampPose, LIMITS } from '../rig/limits';
import { dist, type V3 } from '../rig/math';
import { blendPoses, mirrorPose, poseToKeyframes } from '../rig/poseOps';
import { PARENT, buildSkeleton, standingHeight } from '../rig/skeleton';

const body = (patch: Partial<Body> = {}): Body => ({ ...DEFAULT_BODY, ...patch });
const pose = (patch: Partial<Pose>): Pose => ({ ...STAND_POSE, joints: {}, ...patch });
const close = (a: V3, b: V3, eps = 1e-6) =>
    a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 5 - Math.log10(eps * 1e6)));

describe('skeleton', () => {
    it('heads tall: about 5 for a 5-year-old, 7.5 for an adult', () => {
        for (const [age, heads] of [
            [5, 5],
            [30, 7.5],
        ]) {
            const s = buildSkeleton(body({ age }));
            expect(s.height / s.headHeight).toBeCloseTo(heads, 1);
        }
    });

    it('at rest the toes are on the floor and the top of the head is at the standing height', () => {
        for (const b of [body({ age: 6 }), body(), body({ age: 78, fat: 0.9, gender: 1 })]) {
            const s = buildSkeleton(b);
            const p = solveFK(s, pose({}));
            expect(p.pos.toeL[1]).toBeCloseTo(0, 6);
            expect(p.pos.head[1] + s.headHeight).toBeCloseTo(standingHeight(b), 6);
        }
    });

    it('children are shorter, elders a little shorter than adults', () => {
        expect(standingHeight(body({ age: 6 }))).toBeLessThan(standingHeight(body({ age: 14 })));
        expect(standingHeight(body({ age: 14 }))).toBeLessThan(standingHeight(body({ age: 30 })));
        expect(standingHeight(body({ age: 80 }))).toBeLessThan(standingHeight(body({ age: 30 })));
    });
});

describe('forward kinematics', () => {
    const s = buildSkeleton(body());

    it('an arm raised forward (x = -90) points toward the viewer at shoulder height', () => {
        const p = solveFK(s, pose({ joints: { upperArmL: { x: -90, y: 0, z: 0 } } }));
        const shoulder = p.pos.upperArmL;
        const elbow = p.pos.lowerArmL;
        expect(elbow[1]).toBeCloseTo(shoulder[1], 6);
        expect(elbow[2] - shoulder[2]).toBeCloseTo(s.upperArm, 6);
    });

    it('a left arm spread out (z = +90) points to the character’s left (+x)', () => {
        const p = solveFK(s, pose({ joints: { upperArmL: { x: 0, y: 0, z: 90 } } }));
        expect(p.pos.lowerArmL[0] - p.pos.upperArmL[0]).toBeCloseTo(s.upperArm, 6);
    });

    it('bones keep their length in any pose', () => {
        const wild = pose({
            rootRotation: { yaw: 37, pitch: 12, roll: -8 },
            joints: Object.fromEntries(
                JOINTS.map((j, i) => [j, { x: (i * 37) % 90, y: (i * 53) % 70, z: (i * 29) % 60 }]),
            ),
        });
        const rest = solveFK(s, pose({}));
        const posed = solveFK(s, wild);
        for (const j of JOINTS) {
            const parent = PARENT[j];
            if (!parent) continue;
            expect(dist(posed.pos[j], posed.pos[parent])).toBeCloseTo(
                dist(rest.pos[j], rest.pos[parent]),
                6,
            );
        }
    });
});

describe('two-bone IK', () => {
    it('reaches a target in range and keeps both lengths', () => {
        const r = twoBoneIK([0, 0, 0], [0, -10, 1], [0, -20, 0], [5, -15, 3]);
        expect(dist(r.end, [5, -15, 3])).toBeLessThan(1e-6);
        expect(dist([0, 0, 0], r.mid)).toBeCloseTo(Math.hypot(10, 1), 6);
        expect(dist(r.mid, r.end)).toBeCloseTo(Math.hypot(10, 1), 6);
        expect(r.mid[2]).toBeGreaterThan(0); // the knee still bends forward
    });

    it('out of reach: the limb points straight at the target', () => {
        const r = twoBoneIK([0, 0, 0], [0, -10, 0.5], [0, -20, 0], [0, -100, 0]);
        expect(r.end[1]).toBeCloseTo(-2 * Math.hypot(10, 0.5), 4);
        expect(r.end[0]).toBeCloseTo(0, 6);
    });
});

describe('joint limits', () => {
    it('elbows and knees bend one way only; left and right are mirrored', () => {
        const p = clampPose(
            pose({
                joints: {
                    lowerArmL: { x: 40, y: 0, z: 0 },
                    lowerLegR: { x: -30, y: 0, z: 0 },
                    upperArmR: { x: 0, y: 0, z: 150 },
                },
            }),
        );
        expect(p.joints.lowerArmL!.x).toBe(0);
        expect(p.joints.lowerLegR!.x).toBe(0);
        expect(p.joints.upperArmR!.z).toBe(LIMITS.upperArmR.z[1]);
        expect(LIMITS.upperArmR.z).toEqual([-LIMITS.upperArmL.z[1], -LIMITS.upperArmL.z[0]]);
    });
});

describe('mirror, blend, keyframes', () => {
    const s = buildSkeleton(body());
    const wave = parsePose({
        id: 'wave',
        rootRotation: { yaw: 20, pitch: 5, roll: 3 },
        rootOffset: { x: 4, y: 0, z: 0 },
        joints: {
            upperArmL: { x: -20, y: 10, z: 150 },
            lowerArmL: { x: -60, y: 0, z: 0 },
            chest: { x: 5, y: 15, z: -8 },
        },
        headLook: { yaw: 25, pitch: 5 },
        handShapeL: 'wave',
        ground: 'left',
    });

    it('a mirrored pose is the reflection of the original, and mirroring twice gives it back', () => {
        const a = solveFK(s, wave);
        const b = solveFK(s, mirrorPose(wave));
        const swap = (j: JointId) =>
            (j.endsWith('L')
                ? `${j.slice(0, -1)}R`
                : j.endsWith('R')
                  ? `${j.slice(0, -1)}L`
                  : j) as JointId;
        for (const j of JOINTS) {
            const [x, y, z] = a.pos[j];
            close(b.pos[swap(j)], [-x, y, z]);
        }
        expect(mirrorPose(wave)).toMatchObject({ handShapeR: 'wave', ground: 'right' });
        expect(mirrorPose(mirrorPose(wave))).toEqual(wave);
    });

    it('blending takes angles the short way round', () => {
        const a = pose({ joints: { head: { x: 0, y: 170, z: 0 } } });
        const b = pose({ joints: { head: { x: 0, y: -170, z: 0 } } });
        expect(Math.abs(blendPoses(a, b, 0.5).joints.head!.y)).toBeCloseTo(180, 6);
        expect(blendPoses(a, b, 0)).toMatchObject({ joints: { head: { y: 170 } } });
        expect(blendPoses(a, wave, 1).handShapeL).toBe('wave');
    });

    it('a pose exports every rig value on the shared paths', () => {
        const keys = poseToKeyframes(wave);
        expect(keys).toHaveLength(JOINTS.length * 3 + 3 + 3 + 2 + 2);
        expect(keys).toContainEqual({ path: 'rig.lowerArmL.x', value: -60 });
        expect(keys).toContainEqual({ path: 'rig.root.yaw', value: 20 });
        expect(keys).toContainEqual({ path: 'rig.handL.shape', value: 'wave' });
    });
});

describe('foot contact on any body', () => {
    // a lunge: both feet down, legs at different angles
    const lunge = pose({
        joints: {
            upperLegL: { x: -55, y: 0, z: 0 },
            lowerLegL: { x: 60, y: 0, z: 0 },
            upperLegR: { x: 25, y: 0, z: 0 },
            lowerLegR: { x: 10, y: 0, z: 0 },
        },
    });
    const bodies = { child: body({ age: 7 }), adult: body(), elder: body({ age: 76, fat: 0.7 }) };

    it.each(Object.entries(bodies))('%s: both feet stay on the floor', (_, b) => {
        const s = buildSkeleton(b);
        const p = ground(s, solveFK(s, lunge), 'both');
        expect(footBottom(s, p, 'L')).toBeCloseTo(0, 2);
        expect(footBottom(s, p, 'R')).toBeCloseTo(0, 2);
    });

    // fate-reviewer (2026-11-18): a straight leg has no bend plane; turned round, its knee must still bend
    // toward the character's front, not toward the world's +z
    it('a turned character bends a straight leg forward (its own front)', () => {
        const s = buildSkeleton(body());
        const turned = pose({
            rootRotation: { yaw: 180, pitch: 0, roll: 0 },
            joints: { upperLegL: { x: -35, y: 0, z: 0 } }, // left leg forward and straight; right straight down
        });
        const p = ground(s, solveFK(s, turned), 'both');
        expect(footBottom(s, p, 'R')).toBeCloseTo(0, 2);
        const forward = [p.rot.pelvis[2], p.rot.pelvis[5], p.rot.pelvis[8]] as V3;
        const mid = p.pos.upperLegR.map((v, i) => (v + p.pos.footR[i]) / 2) as V3;
        const knee = p.pos.lowerLegR.map((v, i) => v - mid[i]) as V3;
        expect(knee[0] * forward[0] + knee[1] * forward[1] + knee[2] * forward[2]).toBeGreaterThan(
            0.5,
        );
    });

    it('standing on one foot: that foot on the floor, the other one free', () => {
        const s = buildSkeleton(body());
        const kick = pose({ joints: { upperLegR: { x: -80, y: 0, z: 0 } } });
        const p = ground(s, solveFK(s, kick), 'left');
        expect(footBottom(s, p, 'L')).toBeCloseTo(0, 6);
        expect(footBottom(s, p, 'R')).toBeGreaterThan(10);
    });
});
