/** Things a character holds (data/props.ts has the shapes). Gloves and the rifle use both hands. */
export const PROP_KINDS = [
    'katana',
    'sword',
    'knife',
    'bamboo-staff',
    'torch',
    'bat',
    'rifle',
    'boxing-gloves',
] as const;
export type PropKind = (typeof PROP_KINDS)[number];

/** Which hand holds it: 'both' for the two-hand items. */
export type HeldHand = 'L' | 'R' | 'both';
export interface Held {
    kind: PropKind;
    hand: HeldHand;
}
