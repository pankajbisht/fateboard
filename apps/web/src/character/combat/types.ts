import type { Arm, Leg, PoseSpec } from '../data/poseDsl';

/**
 * Combat Sports Pack (docs/COMBAT_PACK.md §2): a move is data — three keys (start, peak, recover), each a pose in
 * body terms plus where the weight is, how many frames it takes and how it eases. The body-dependent parts (the
 * striking limb on its target, the weight over the support foot, a knee on the mat) are solved per skeleton by
 * `solve.ts`, so one move fits a child and a tall adult. Moves are written once, orthodox (left side leads);
 * southpaw is always `mirrorMove`.
 */
export type Discipline = 'boxing' | 'muay-thai' | 'mma' | 'wrestling' | 'bjj' | 'any';
export type MoveCategory =
    | 'punch'
    | 'kick'
    | 'knee'
    | 'elbow'
    | 'defence'
    | 'clinch'
    | 'takedown'
    | 'ground'
    | 'reaction'
    | 'stance';
export type Side = 'L' | 'R';
export type Stance = 'orthodox' | 'southpaw';
/** the striking surface: fist, ball of the foot, shin, knee, point of the elbow */
export type Limb = 'hand' | 'foot' | 'shin' | 'knee' | 'elbow';
/**
 * head = eye line, chin = the jaw (where elbows land), body = solar plexus / liver, belly = below the ribs (where knees land), leg = mid thigh,
 * floor = an opponent on the mat
 */
export type Target = 'head' | 'chin' | 'body' | 'belly' | 'leg' | 'floor';
/** snap = fast out (strikes), settle = slow in-out (recover), drop = accelerating (level change), linear */
export type Ease = 'snap' | 'settle' | 'drop' | 'linear';
export type KeyName = 'start' | 'peak' | 'recover';
export const KEY_NAMES: readonly KeyName[] = ['start', 'peak', 'recover'];

/** Arm terms + `shrug`: the shoulder raised (degrees) to hide the chin behind it. */
export interface FightArm extends Arm {
    shrug?: number;
}
/** Leg terms + `heel` (heel lifted, on the ball of the foot) and `pivot` (foot turned out +, in −). */
export interface FightLeg extends Leg {
    heel?: number;
    pivot?: number;
}
export interface FightSpec extends Omit<PoseSpec, 'armL' | 'armR' | 'legL' | 'legR'> {
    armL?: FightArm;
    armR?: FightArm;
    legL?: FightLeg;
    legR?: FightLeg;
}

/** Extra floor contacts (grounding is feet only): a knee on the mat. */
export type Contact = 'kneeL' | 'kneeR';

export interface MoveKey {
    spec: FightSpec;
    /** share of the weight on the LEAD foot, 0..1 (the torso leans over the support point) */
    weight: number;
    /** frames (24 fps) from the previous key to this one; 0 for the start */
    frames: number;
    ease: Ease;
    contact?: Contact[];
}

export interface Strike {
    limb: Limb;
    side: Side;
    target: Target;
    /** distance from the limb's root (shoulder / hip) to the target, as a share of the limb length */
    reach: number;
    /** cm toward the striking side (+) or across the centre line (−); hooks come from the side */
    across?: number;
}

export interface CombatMove {
    id: string;
    name: string;
    discipline: Discipline;
    category: MoveCategory;
    tags: readonly string[];
    strike?: Strike;
    keys: Record<KeyName, MoveKey>;
    /** frames frozen on the peak at impact (0 for non-strikes, 2..4 for strikes) */
    hitStop: number;
    /** the "how it works" note shown with the move */
    how: string;
}

/** A move ready for one stance (southpaw = mirrored): poses still body-free, contacts and strike side resolved. */
export interface StancedMove {
    move: CombatMove;
    stance: Stance;
    strike?: Strike;
    keys: Record<KeyName, MoveKey>;
}
