import type {
    CombatMove,
    Contact,
    FightArm,
    FightLeg,
    FightSpec,
    MoveKey,
    Side,
    Stance,
    StancedMove,
    Strike,
} from './types';

/**
 * Stances (docs/COMBAT_PACK.md §2): moves are written orthodox; southpaw mirrors them across the body's centre
 * plane. Mirroring at the spec level (swap left / right, negate turns and leans) gives the same result as
 * `mirrorPose` on the compiled pose, and keeps the strike side and the knee contacts in step.
 */
export const otherSide = (s: Side): Side => (s === 'L' ? 'R' : 'L');
const neg = (v: number | undefined) => (v === undefined ? undefined : -v + 0);

export function mirrorSpec(s: FightSpec): FightSpec {
    const out: FightSpec = { ...s };
    if (s.root)
        out.root = { ...s.root, yaw: neg(s.root.yaw), roll: neg(s.root.roll), x: neg(s.root.x) };
    if (s.spine) out.spine = { ...s.spine, side: neg(s.spine.side), twist: neg(s.spine.twist) };
    if (s.head) out.head = { ...s.head, turn: neg(s.head.turn), tilt: neg(s.head.tilt) };
    const arms: [FightArm | undefined, FightArm | undefined] = [s.armR, s.armL];
    const legs: [FightLeg | undefined, FightLeg | undefined] = [s.legR, s.legL];
    out.armL = arms[0];
    out.armR = arms[1];
    out.legL = legs[0];
    out.legR = legs[1];
    if (s.hands) out.hands = [s.hands[1], s.hands[0]];
    if (s.ground === 'left') out.ground = 'right';
    else if (s.ground === 'right') out.ground = 'left';
    return out;
}

const mirrorContact = (c: Contact): Contact => (c === 'kneeL' ? 'kneeR' : 'kneeL');

function mirrorKey(k: MoveKey): MoveKey {
    return {
        ...k,
        spec: mirrorSpec(k.spec),
        ...(k.contact ? { contact: k.contact.map(mirrorContact) } : {}),
    };
}

const mirrorStrike = (s: Strike): Strike => ({ ...s, side: otherSide(s.side) });

export function stanced(move: CombatMove, stance: Stance = 'orthodox'): StancedMove {
    if (stance === 'orthodox') return { move, stance, strike: move.strike, keys: move.keys };
    return {
        move,
        stance,
        strike: move.strike && mirrorStrike(move.strike),
        keys: {
            start: mirrorKey(move.keys.start),
            peak: mirrorKey(move.keys.peak),
            recover: mirrorKey(move.keys.recover),
        },
    };
}

/** The lead side of a stance (the foot and hand nearer the opponent). */
export const leadSide = (stance: Stance): Side => (stance === 'orthodox' ? 'L' : 'R');
