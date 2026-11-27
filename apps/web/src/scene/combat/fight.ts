import { solveKeys } from '@/character/combat/bake';
import { leadSide, stanced } from '@/character/combat/mirror';
import { moveById } from '@/character/combat/registry';
import { bodyPoint, effector } from '@/character/combat/solve';
import type { KeyName, Stance, StancedMove, Strike } from '@/character/combat/types';
import { solveFK } from '@/character/rig/fk';
import { ground } from '@/character/rig/grounding';
import { dist, type V3 } from '@/character/rig/math';
import { blendPoses } from '@/character/rig/poseOps';
import { buildSkeleton, type Skeleton } from '@/character/rig/skeleton';
import type { Body, Pose } from '@/character/schema/types';
import { FIGHT_FX_KEYS, type Scene, type SceneActor, type SceneFight } from '../schema/types';
import { EXCHANGES, type ExchangeDef } from './exchanges';

/**
 * Placing an exchange (docs/COMBAT_PACK.md, Stage 4): the attacker stands at -x facing +x, the defender at +x
 * facing -x (the pair-pose convention). Distance, the defender's sideways offset and the height of the strike all
 * come from the bodies: the defender's target point (hit / block: at the answer's peak; miss: where it was before
 * the evasion) is found first, the two are spaced so the attacker's solo strike reaches it, then the attacker's
 * strike is solved again onto the exact point (so a tall and a short fighter line up). Pure and deterministic.
 */
export interface ExchangeSolve {
    def: ExchangeDef;
    attacker: StancedMove;
    defender: StancedMove;
    a: Record<KeyName, Pose>;
    b: Record<KeyName, Pose>;
    /** distance between the two along x (cm) */
    gap: number;
    /** the defender's sideways offset (cm, world z) */
    dz: number;
    /** cm between the striking surface and the target at the peak */
    error: number;
    /** where the strike lands and the limb's path to it, in the attacker's floor frame (for the effects) */
    impact: V3;
    trail: V3[];
}

const grounded = (skel: Skeleton, p: Pose) => ground(skel, solveFK(skel, p), p.ground);
/** how far grounding moves this pose up (+) or down: rig y = floor y − shift */
const shiftOf = (skel: Skeleton, p: Pose) =>
    grounded(skel, p).pos.pelvis[1] - solveFK(skel, p).pos.pelvis[1];

export const exchangeById = (id: string) => EXCHANGES.all.find((e) => e.id === id);

export function solveExchange(
    bodyA: Body,
    bodyB: Body,
    exchangeId: string,
    stanceA: Stance = 'orthodox',
    stanceB: Stance = 'orthodox',
): ExchangeSolve | null {
    const def = exchangeById(exchangeId);
    const atk = def && moveById(def.attack);
    const dfn = def && moveById(def.defend);
    if (!def || !atk || !dfn) return null;
    const attacker = stanced(atk, stanceA);
    const defender = stanced(dfn, stanceB);
    // a takedown has no strike: the two are spaced so the lead hand reaches the defender's lead thigh (the grip),
    // and the attacker's pose is kept as written
    const strike: Strike = attacker.strike ?? {
        limb: 'hand',
        side: stanceA === 'orthodox' ? 'L' : 'R',
        target: 'leg',
        reach: 0.85,
    };
    const sa = buildSkeleton(bodyA);
    const sb = buildSkeleton(bodyB);

    // the defender's answer, and the point the strike is aimed at (in the defender's floor space)
    const b = solveKeys(sb, defender);
    // a block meets the strike at its peak; a miss and a hit are aimed where the defender is before reacting
    // (the head snaps back after the punch lands, not before)
    const at = def.contact === 'block' ? b.peak : b.start;
    const target = bodyPoint(sb, grounded(sb, at), strike.target, leadSide(stanceB));

    // the attacker's solo strike: how far ahead of them it lands and how far to the side
    const solo = solveKeys(sa, attacker);
    const reach = effector(sa, grounded(sa, solo.peak), strike.limb, strike.side);
    // attacker rig +z → world +x, rig +x → world −z; defender rig +z → world −x, rig +x → world +z
    const minGap = (sa.size.chestDepth + sb.size.chestDepth) * 0.5 + 8;
    const gap = Math.max(minGap, reach[2] + target[2]);
    const dz = -reach[0] - target[0];

    // aim the strike at the exact point, in the attacker's rig space
    const worldT: V3 = [gap / 2 - target[2], target[1], dz + target[0]];
    const toA: V3 = [-(worldT[2] - 0), worldT[1] - shiftOf(sa, solo.peak), worldT[0] + gap / 2];
    const a = attacker.strike ? solveKeys(sa, attacker, toA) : solo;
    const hitA = effector(sa, solveFK(sa, a.peak), strike.limb, strike.side);
    const surface = (p: Pose) => effector(sa, grounded(sa, p), strike.limb, strike.side);
    const trail = [0, 0.4, 0.7, 1].map((t) => surface(blendPoses(a.start, a.peak, t)));
    return {
        def,
        attacker,
        defender,
        a,
        b,
        gap,
        dz,
        // a takedown is judged on spacing only (the shot's pose decides where the hands go up and down)
        error: attacker.strike ? dist(hitA, toA) : Math.hypot(hitA[0] - toA[0], hitA[2] - toA[2]),
        impact: trail[trail.length - 1],
        trail,
    };
}

export interface PlaceResult {
    scene: Scene;
    /** cm the strike lands from its target (NaN when nothing was placed) */
    error: number;
}

/** Puts two actors of the scene into an exchange, shown at `key` (the peak by default). One undo step for callers. */
export function placeExchange(
    scene: Scene,
    attackerId: string,
    defenderId: string,
    exchangeId: string,
    opts: { stanceA?: Stance; stanceB?: Stance; key?: KeyName } = {},
): PlaceResult {
    const ai = scene.actors.find((x) => x.id === attackerId);
    const bi = scene.actors.find((x) => x.id === defenderId);
    if (!ai || !bi || ai.id === bi.id) return { scene, error: NaN };
    const r = solveExchange(
        ai.character.body,
        bi.character.body,
        exchangeId,
        opts.stanceA,
        opts.stanceB,
    );
    if (!r) return { scene, error: NaN };
    const key = opts.key ?? 'peak';
    const cx = (ai.x + bi.x) / 2;
    const cz = (ai.z + bi.z) / 2;
    const put = (
        x: SceneActor,
        pose: Pose,
        px: number,
        pz: number,
        facing: number,
        other: string,
    ) => ({
        ...x,
        x: px,
        z: pz,
        facing,
        lookAt: other,
        character: {
            ...x.character,
            body: {
                ...x.character.body,
                overridden: [...new Set([...x.character.body.overridden, 'posture'])],
            },
            rig: { pose: { ...pose, id: `fight-${r.def.id}`, name: r.def.name } },
        },
    });
    const na = put(ai, r.a[key], cx - r.gap / 2, cz, 90, bi.id);
    // the impact picture of a hit shows the reaction just starting (the head 30 % of the way back)
    const shown =
        key === 'peak' && r.def.contact === 'hit' ? blendPoses(r.b.start, r.b.peak, 0.3) : r.b[key];
    const nb = put(bi, shown, cx + r.gap / 2, cz + r.dz, 270, ai.id);
    return {
        scene: {
            ...scene,
            actors: scene.actors.map((x) => (x.id === na.id ? na : x.id === nb.id ? nb : x)),
            fight: {
                attacker: ai.id,
                defender: bi.id,
                exchange: r.def.id,
                contact: r.def.contact,
                key,
                // a new exchange keeps the effect settings chosen before
                intensity: scene.fight?.intensity ?? 'normal',
                effects:
                    scene.fight?.effects ??
                    (Object.fromEntries(
                        FIGHT_FX_KEYS.map((k) => [k, true]),
                    ) as SceneFight['effects']),
                impact: r.impact,
                trail: r.trail,
            },
        },
        error: r.error,
    };
}
