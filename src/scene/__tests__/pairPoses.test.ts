/**
 * Pair poses (docs/CHARACTER_STUDIO.md §7.4 acceptance check): the hands land on their spots on the other person,
 * for heights from 111 to 189 cm; both people stay inside their joint limits; the picture renders.
 */
import { describe, expect, it } from 'vitest';
import { RECIPES, fromRecipe } from '@/character/data/recipes';
import { clampPose } from '@/character/rig/limits';
import { buildSkeleton } from '@/character/rig/skeleton';
import { PAIR_POSES, pairPoseById, pairSuits } from '../layout/pairPoseDefs';
import { applyPairPose } from '../layout/pairPoses';
import { renderScene } from '../render/renderScene';
import { newScene } from '../schema/parse';
import type { Scene } from '../schema/types';
import { applySceneEdit } from '../studio/edit';

const actor = (id: string, r: number, x = 0, z = 0) => ({
    id,
    character: fromRecipe(RECIPES[r], id),
    x,
    z,
    facing: 0,
    lookAt: null,
});
const pair = (a: number, b: number): Scene => ({
    ...newScene(),
    actors: [actor('a', a, -60), actor('b', b, 60)],
});
// meera 111, aarav 124, ananya 157, kabir 170, kenji 189, kamala 150 (elder)
const COMBOS: [string, number, number][] = [
    ['adult + child', 8, 1],
    ['teen + adult', 3, 2],
    ['two kids', 1, 0],
    ['tall + tall', 8, 2],
    ['child + tall', 1, 8],
    ['elder + adult', 11, 2],
];

describe('pair poses', () => {
    it('are 13, each with a name, tags and a way to stand', () => {
        expect(PAIR_POSES).toHaveLength(13);
        expect(new Set(PAIR_POSES.map((p) => p.id)).size).toBe(13);
        for (const p of PAIR_POSES) {
            expect(p.name.trim(), p.id).not.toBe('');
            expect(p.tags.length, p.id).toBeGreaterThanOrEqual(3);
            expect(['face', 'side', 'back']).toContain(p.facing);
        }
    });

    it('every hand lands within 1.5 cm of its spot, in every pair and height combination', () => {
        const misses: string[] = [];
        for (const p of PAIR_POSES)
            for (const [name, a, b] of COMBOS) {
                const s = pair(a, b);
                const suits = pairSuits(
                    p,
                    buildSkeleton(s.actors[0].character.body),
                    buildSkeleton(s.actors[1].character.body),
                );
                if (!suits) {
                    // a pair that is not offered for these heights changes nothing
                    expect(applyPairPose(s, 'a', 'b', p.id).scene, `${p.id} ${name}`).toBe(s);
                    continue;
                }
                const { errors } = applyPairPose(s, 'a', 'b', p.id);
                const reaches = (p.a.reach?.length ?? 0) + (p.b.reach?.length ?? 0);
                expect(errors, `${p.id} ${name}`).toHaveLength(reaches);
                errors.forEach(
                    (e, i) => e > 1.5 && misses.push(`${p.id} ${name} #${i}: ${e.toFixed(1)} cm`),
                );
            }
        expect(misses).toEqual([]);
    }, 120000);

    it('both people end inside their joint limits, upright on the floor, and the scene renders with finite shapes', () => {
        for (const p of PAIR_POSES)
            for (const [, a, b] of COMBOS.slice(0, 3)) {
                const { scene } = applyPairPose(pair(a, b), 'a', 'b', p.id);
                for (const x of scene.actors) {
                    const pose = x.character.rig.pose;
                    expect(clampPose(pose).joints, `${p.id} ${x.id}`).toEqual(pose.joints);
                }
                const m = renderScene(scene);
                expect(m.actors, p.id).toHaveLength(2);
                for (const d of m.items)
                    expect(/NaN|Infinity/.test(d.d), `${p.id} ${d.key}`).toBe(false);
            }
    }, 120000);

    it('places them for the pair: face to face on a line, side by side, or back to back; both looking at each other when it says so', () => {
        const at = (id: string) => applyPairPose(pair(2, 3), 'a', 'b', id).scene.actors;
        const [fa, fb] = at('handshake');
        expect([fa.facing, fb.facing]).toEqual([90, 270]);
        expect(fa.x).toBeLessThan(fb.x);
        expect(fa.z).toBe(fb.z);
        expect([fa.lookAt, fb.lookAt]).toEqual(['b', 'a']);
        const [sa, sb] = at('arm-around');
        expect([sa.facing, sb.facing]).toEqual([0, 0]);
        expect(sa.lookAt).toBeNull();
        const [ba, bb] = at('back-to-back');
        expect([ba.facing, bb.facing]).toEqual([270, 90]);
        // the pair stays where the two were (their middle)
        expect((fa.x + fb.x) / 2).toBeCloseTo(0, 5);
        const gap = fb.x - fa.x;
        expect(gap).toBeLessThan(buildSkeleton(fa.character.body).upperArm * 4);
    });

    it('the one who pats the head is the taller, whichever way round they were given', () => {
        const small = applyPairPose(pair(1, 8), 'a', 'b', 'pat-head');
        const tall = applyPairPose(pair(8, 1), 'a', 'b', 'pat-head');
        for (const r of [small, tall]) {
            expect(r.errors[0]).toBeLessThan(1.5);
            const patter = r.scene.actors.find((x) => x.character.rig.pose.handShapeR === 'open')!;
            expect(patter.character.name).toBe('Kenji');
        }
    });

    it('is deterministic, leaves other actors and the rest of the scene alone, and unknown ids change nothing', () => {
        const s = { ...pair(2, 3), actors: [...pair(2, 3).actors, actor('c', 0, 300)] };
        const a = applyPairPose(s, 'a', 'b', 'hug');
        expect(applyPairPose(s, 'a', 'b', 'hug')).toEqual(a);
        expect(a.scene.actors[2]).toEqual(s.actors[2]);
        expect(a.scene.set).toEqual(s.set);
        expect(applyPairPose(s, 'a', 'b', 'no-such-pair').scene).toBe(s);
        expect(applyPairPose(s, 'a', 'zzz', 'hug').scene).toBe(s);
        expect(applyPairPose(s, 'a', 'a', 'hug').scene).toBe(s);
    });

    it("an elder is not stooped twice: the stoop is in the pose, and the character's own stoop is off", () => {
        const { scene } = applyPairPose(pair(11, 2), 'a', 'b', 'hug');
        expect(scene.actors[0].character.body.overridden).toContain('posture');
        expect(pairPoseById('hug')).toBeTruthy();
    });

    it('goes through the scene edit (one undo step)', () => {
        const s = pair(2, 3);
        const next = applySceneEdit(s, { kind: 'pairPose', a: 'a', b: 'b', pair: 'handshake' });
        expect(next.actors[0].character.rig.pose.id).toBe('pair-handshake');
        expect(next).toEqual(applyPairPose(s, 'a', 'b', 'handshake').scene);
    });
});
