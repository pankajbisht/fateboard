import { withPosture } from '@/character/render/renderCharacter';
import { solveFK } from '@/character/rig/fk';
import { ground } from '@/character/rig/grounding';
import { clampPose } from '@/character/rig/limits';
import { apply, dist, rotY, type V3 } from '@/character/rig/math';
import { reachWithLean } from '@/character/rig/reach';
import { ageing, buildSkeleton } from '@/character/rig/skeleton';
import type { HandShape, Pose } from '@/character/schema/types';
import type { Scene, SceneActor } from '../schema/types';
import { pairPoseById, pairSuits, type Body, type PairPose, type Side } from './pairPoseDefs';

/**
 * Applying a pair pose (docs/CHARACTER_STUDIO.md phase 3 / 8): places two actors for the pair, gives each its base
 * pose, then solves each reaching arm so the hand lands on its spot on the other person, whatever the heights (the
 * body leans toward a target it cannot reach standing). Pure and deterministic. Elder stoop is baked into the pose
 * (and the character's own stoop turned off), so what was solved is exactly what is drawn.
 */
const ROUNDS = 3;

interface Built {
    actor: SceneActor;
    skel: ReturnType<typeof buildSkeleton>;
    pose: Pose;
}

const bodyOf = (b: Built): Body => {
    const a = b.actor;
    const posed = ground(b.skel, solveFK(b.skel, clampPose(b.pose)), b.pose.ground);
    return {
        skel: b.skel,
        posed,
        at: (p: V3) => {
            const w = apply(rotY(a.facing), p);
            return [a.x + w[0], w[1], a.z + w[2]];
        },
    };
};
const toRig = (a: SceneActor, w: V3): V3 => apply(rotY(-a.facing), [w[0] - a.x, w[1], w[2] - a.z]);

export interface PairResult {
    scene: Scene;
    /** distance (cm) between each reaching hand and its spot, in the order a's arms then b's */
    errors: number[];
}

function start(actor: SceneActor, side: Side, x: number, facing: number): Built {
    const skel = buildSkeleton(actor.character.body);
    // the person's own stoop is part of the pose from now on
    const base = withPosture(side.pose, ageing(actor.character.body.age));
    const hands = (s: 'L' | 'R'): HandShape =>
        side.reach?.find((r) => r.arm === s)?.hand ??
        side.pose[s === 'L' ? 'handShapeL' : 'handShapeR'];
    const pose: Pose = { ...base, handShapeL: hands('L'), handShapeR: hands('R') };
    return { actor: { ...actor, x, facing }, skel, pose };
}

export function applyPairPose(scene: Scene, aId: string, bId: string, pairId: string): PairResult {
    const def: PairPose | undefined = pairPoseById(pairId);
    let ai = scene.actors.find((x) => x.id === aId);
    let bi = scene.actors.find((x) => x.id === bId);
    if (!def || !ai || !bi || ai.id === bi.id) return { scene, errors: [] };
    // some pairs need the taller person as `a` (the one who pats, points down)
    if (
        def.taller === 'a' &&
        buildSkeleton(bi.character.body).height > buildSkeleton(ai.character.body).height
    )
        [ai, bi] = [bi, ai];

    if (!pairSuits(def, buildSkeleton(ai.character.body), buildSkeleton(bi.character.body)))
        return { scene, errors: [] };
    const cx = (ai.x + bi.x) / 2;
    const cz = (ai.z + bi.z) / 2;
    const gap0 = def.gap(buildSkeleton(ai.character.body), buildSkeleton(bi.character.body));
    const faceA = def.facing === 'face' ? 90 : def.facing === 'back' ? 270 : 0;
    const faceB = def.facing === 'face' ? 270 : def.facing === 'back' ? 90 : 0;
    const aActor = ai;
    const bActor = bi;

    /** Place the two `k` times their usual distance apart and put every hand on its spot. */
    const solve = (k: number) => {
        const gap = gap0 * k;
        let a = start({ ...aActor, z: cz }, def.a, cx - gap / 2, faceA);
        let b = start({ ...bActor, z: cz }, def.b, cx + gap / 2, faceB);

        const reachOf = (me: Built, other: Built, side: Side): Built => {
            let cur = me;
            for (const r of side.reach ?? []) {
                const target = toRig(cur.actor, r.to(bodyOf(cur), bodyOf(other)));
                cur = { ...cur, pose: reachWithLean(cur.skel, cur.pose, r.arm, target).pose };
            }
            return cur;
        };
        for (let round = 0; round < ROUNDS; round++) {
            a = reachOf(a, b, def.a);
            b = reachOf(b, a, def.b);
        }
        // how well the hands landed
        const errors: number[] = [];
        const measure = (me: Built, other: Built, side: Side) => {
            const mb = bodyOf(me);
            const ob = bodyOf(other);
            for (const r of side.reach ?? [])
                errors.push(dist(mb.at(mb.posed.pos[`hand${r.arm}` as 'handL']), r.to(mb, ob)));
        };
        measure(a, b, def.a);
        measure(b, a, def.b);
        return { a, b, errors };
    };
    // short arms (the manga body's reach about a third of its height) may not reach at the usual distance:
    // stand a little closer until every hand lands (never closer than half the usual)
    let best = solve(1);
    for (const k of [0.92, 0.84, 0.76, 0.68, 0.6, 0.52]) {
        if (Math.max(0, ...best.errors) <= 1.2) break;
        const next = solve(k);
        if (Math.max(0, ...next.errors) < Math.max(0, ...best.errors)) best = next;
    }
    const { a, b, errors } = best;

    const finish = (x: Built, other: SceneActor): SceneActor => ({
        ...x.actor,
        lookAt: def.look ? other.id : null,
        character: {
            ...x.actor.character,
            body: {
                ...x.actor.character.body,
                overridden: [...new Set([...x.actor.character.body.overridden, 'posture'])],
            },
            rig: { pose: { ...x.pose, id: `pair-${def.id}`, name: def.name } },
        },
    });
    const na = finish(a, b.actor);
    const nb = finish(b, a.actor);
    return {
        scene: {
            ...scene,
            actors: scene.actors.map((x) => (x.id === na.id ? na : x.id === nb.id ? nb : x)),
        },
        errors,
    };
}
