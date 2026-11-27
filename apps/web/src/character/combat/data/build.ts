import { mergeSpec } from '../fightDsl';
import type {
    CombatMove,
    Contact,
    Discipline,
    Ease,
    FightArm,
    FightSpec,
    MoveCategory,
    MoveKey,
    Strike,
} from '../types';

/**
 * Helpers for the move tables (docs/COMBAT_PACK.md §2). A key is its stance plus what changes; unless `free`, the
 * head turns so the eyes stay on the opponent (root yaw + spine twist + head turn = 0). Orthodox: L = lead.
 */
interface KeyOpts {
    weight?: number;
    frames?: number;
    ease?: Ease;
    contact?: Contact[];
    /** the head keeps its own turn (reactions, ground work) */
    free?: boolean;
}

export function key(base: FightSpec, over: FightSpec = {}, o: KeyOpts = {}): MoveKey {
    const spec = mergeSpec(base, over);
    if (!o.free) {
        const turn = -((spec.root?.yaw ?? 0) + (spec.spine?.twist ?? 0));
        spec.head = { ...spec.head, turn };
    }
    return {
        spec,
        weight: o.weight ?? 0.5,
        frames: o.frames ?? 0,
        ease: o.ease ?? 'linear',
        ...(o.contact ? { contact: o.contact } : {}),
    };
}

export function move(
    id: string,
    name: string,
    discipline: Discipline,
    category: MoveCategory,
    tags: string[],
    how: string,
    keys: { start: MoveKey; peak: MoveKey; recover: MoveKey },
    o: { strike?: Strike; hitStop?: number } = {},
): CombatMove {
    return {
        id,
        name,
        discipline,
        category,
        tags,
        how,
        keys,
        hitStop: o.hitStop ?? (o.strike ? 2 : 0),
        ...(o.strike ? { strike: o.strike } : {}),
    };
}

/** Rear fist on the cheek, elbow down by the ribs (searched on a child and a tall adult). */
export const REAR_GUARD: FightArm = { raise: 85, spread: 20, twist: -10, bend: 155 };
/** Both forearms up in front of the face. */
export const COVER: FightArm = { raise: 92, spread: 6, twist: -30, bend: 155, shrug: 10 };
/** Muay Thai: the hands high and apart (the rear one at the brow). */
export const THAI_REAR: FightArm = { raise: 82, spread: 30, twist: -20, bend: 135 };

/** Boxing, orthodox (BUG-279 convention): hips turned right, eyes forward, lead fist out at eye level. */
export const BOX: FightSpec = {
    root: { yaw: -30 },
    legL: { lift: 18, bend: 18, spread: 6, twist: 25 },
    legR: { lift: -16, bend: 16, spread: 10, twist: 15, heel: 12 },
    armL: { raise: 62, spread: 8, twist: -15, bend: 118 },
    armR: REAR_GUARD,
    spine: { bend: 10, twist: 8 },
    head: { nod: 14 },
    hands: ['fist', 'fist'],
};

/** Muay Thai: upright and squarer, weight on the bent rear leg, the lead foot light (ready to check or teep). */
export const THAI: FightSpec = {
    root: { yaw: -20 },
    legL: { lift: 24, bend: 10, spread: 6, twist: 18, heel: 14 },
    legR: { lift: -10, bend: 28, spread: 10, twist: 12 },
    armL: { raise: 80, spread: 10, twist: -30, bend: 95 },
    armR: THAI_REAR,
    spine: { bend: -4, twist: 4 },
    head: { nod: 6 },
    hands: ['fist', 'fist'],
};

/** MMA: wider and lower than boxing (ready to sprawl), hands a little lower and open-ready. */
export const MMA: FightSpec = {
    root: { yaw: -25 },
    legL: { lift: 20, bend: 26, spread: 9, twist: 22 },
    legR: { lift: -18, bend: 24, spread: 12, twist: 14, heel: 10 },
    armL: { raise: 55, spread: 12, twist: -20, bend: 110 },
    armR: { raise: 75, spread: 22, twist: -15, bend: 140 },
    spine: { bend: 14, twist: 6 },
    head: { nod: 14 },
    hands: ['fist', 'fist'],
};

/** Lying on the back (the lying poses' root): for guard work. */
export const ON_BACK = { pitch: -90, yaw: 90 };
