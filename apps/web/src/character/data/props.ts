import { PROP_KINDS, type Held, type HeldHand, type PropKind } from '../schema/propKinds';
import type { V3 } from '../rig/math';

/**
 * Held objects as data (docs/CHARACTER_STUDIO.md phase 3). A prop is a list of capsules in the hand's frame, in
 * fractions of the character's height H: the grip is at the origin and the long axis is z (through the fist, the
 * thumb side is +z, the way a hand holds a handle). `render/props.ts` draws them on the hand joint, so a prop follows
 * the arm in every pose. Gloves cover the fist; the rifle spans both hands (drawn from their positions).
 */
export interface PropPart {
    a: V3;
    b: V3;
    /** radii at a and b, in H */
    ra: number;
    rb: number;
    color: string;
    /** drawn behind the hand (the pommel end) */
    back?: boolean;
}
export interface PropDef {
    name: string;
    /** 'two' = both hands hold it (rifle, gloves) */
    hands: 'one' | 'two';
    parts: PropPart[];
}

const STEEL = '#cbd5e1';
const GOLD = '#d4a017';
const WOOD = '#78350f';
const GRIP = '#1f2937';

const blade = (len: number, w: number, from = 0.02): PropPart => ({
    a: [0, 0, from],
    b: [0, 0, len],
    ra: w,
    rb: w * 0.45,
    color: STEEL,
});

export const PROP_DEFS: Record<PropKind, PropDef> = {
    katana: {
        name: 'Katana',
        hands: 'one',
        parts: [
            { a: [0, 0, -0.045], b: [0, 0, 0.02], ra: 0.006, rb: 0.006, color: GRIP },
            { a: [0, -0.012, 0.025], b: [0, 0.012, 0.025], ra: 0.011, rb: 0.011, color: GOLD },
            blade(0.4, 0.0095, 0.03),
        ],
    },
    sword: {
        name: 'Sword',
        hands: 'one',
        parts: [
            { a: [0, 0, -0.05], b: [0, 0, 0.02], ra: 0.007, rb: 0.007, color: WOOD },
            { a: [0, -0.03, 0.025], b: [0, 0.03, 0.025], ra: 0.008, rb: 0.008, color: GOLD },
            blade(0.5, 0.016, 0.03),
        ],
    },
    knife: {
        name: 'Knife',
        hands: 'one',
        parts: [
            { a: [0, 0, -0.035], b: [0, 0, 0.012], ra: 0.007, rb: 0.007, color: GRIP },
            { a: [0, -0.012, 0.014], b: [0, 0.012, 0.014], ra: 0.006, rb: 0.006, color: GOLD },
            blade(0.1, 0.011, 0.016),
        ],
    },
    'bamboo-staff': {
        name: 'Bamboo staff',
        hands: 'one',
        parts: [
            { a: [0, 0, -0.52], b: [0, 0, 0.52], ra: 0.0095, rb: 0.0095, color: '#a3b24a' },
            { a: [0, 0, 0.2], b: [0, 0, 0.215], ra: 0.0125, rb: 0.0125, color: '#6b7a2a' },
            { a: [0, 0, -0.25], b: [0, 0, -0.235], ra: 0.0125, rb: 0.0125, color: '#6b7a2a' },
            { a: [0, 0, 0.45], b: [0, 0, 0.465], ra: 0.0125, rb: 0.0125, color: '#6b7a2a' },
        ],
    },
    torch: {
        name: 'Torch',
        hands: 'one',
        parts: [
            { a: [0, 0, -0.07], b: [0, 0, 0.12], ra: 0.008, rb: 0.01, color: WOOD },
            { a: [0, 0, 0.12], b: [0, 0, 0.165], ra: 0.018, rb: 0.022, color: '#4b2e1b' },
            { a: [0, 0, 0.17], b: [0, 0, 0.235], ra: 0.026, rb: 0.012, color: '#f97316' },
            { a: [0, 0, 0.18], b: [0, 0, 0.215], ra: 0.014, rb: 0.007, color: '#fde047' },
        ],
    },
    bat: {
        name: 'Bat',
        hands: 'one',
        parts: [
            { a: [0, 0, -0.03], b: [0, 0, 0.02], ra: 0.008, rb: 0.008, color: GRIP },
            { a: [0, 0, 0.02], b: [0, 0, 0.36], ra: 0.01, rb: 0.022, color: '#d6b26e' },
        ],
    },
    rifle: {
        name: 'Rifle',
        hands: 'two',
        parts: [],
    },
    'boxing-gloves': {
        name: 'Boxing gloves',
        hands: 'two',
        parts: [],
    },
};

export const PROP_IDS = PROP_KINDS;
export const TWO_HAND: PropKind[] = PROP_KINDS.filter((k) => PROP_DEFS[k].hands === 'two');

/**
 * The rules for what the hands hold: two-hand items take both hands (and clear the rest), one-hand items go in a
 * named hand, at most one item per hand (the first one stays), at most two items.
 */
export function normalizeHeld(held: Held[]): Held[] {
    const used = new Set<HeldHand>();
    const out: Held[] = [];
    for (const h of held) {
        if (PROP_DEFS[h.kind].hands === 'two') {
            if (out.length) continue;
            return [{ kind: h.kind, hand: 'both' }];
        }
        const hand: HeldHand = h.hand === 'both' ? 'R' : h.hand;
        if (used.has(hand)) continue;
        used.add(hand);
        out.push({ kind: h.kind, hand });
    }
    return out;
}

/** What is held in one hand (a two-hand item is in both). */
export const heldIn = (held: Held[], side: 'L' | 'R'): PropKind | null =>
    held.find((h) => h.hand === 'both' || h.hand === side)?.kind ?? null;
