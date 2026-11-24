import type { Body } from '../schema/types';
import { VARIANTS } from './proportions';

/**
 * The manga anatomy table (docs/CHARACTER_STUDIO.md, manga body). Measured from a reference figure drawing of a man
 * and a woman standing, as a fraction of the standing height H and in head units (hu = H / heads): where the arms
 * end (the fingertips at crotch height, so the arm from shoulder joint to fingertip is about 0.36 H), how thick each
 * limb is (a radius, as a share of H), how wide the shoulders, waist and hips are. Male and female columns blend with
 * the gender slider; muscle and fat then thicken what they thicken. The classic body never reads this table.
 */
type Pair = readonly [male: number, female: number];
const mix = (p: Pair, gender: number) => p[0] + (p[1] - p[0]) * gender;

/** Lengths along the bone, as a share of H. */
const LEN = {
    upperArm: [0.152, 0.143] as Pair,
    foreArm: [0.122, 0.114] as Pair,
    hand: [0.08, 0.072] as Pair,
};
/**
 * Foot length in head units. Not measured from the reference (its feet are foreshortened): the figure-drawing
 * convention of about one head for a man, a little less for a woman (manga feet are small).
 */
const FOOT_HU: Pair = [1, 0.88];
/** Radii (half the width), as a share of H. */
const RADIUS = {
    upperArm: [0.0235, 0.0185] as Pair,
    foreArm: [0.0205, 0.0165] as Pair,
    wrist: [0.0145, 0.0115] as Pair,
    // a woman's thigh is fuller against her hips than the reference drew it (male, female read apart)
    thigh: [0.0435, 0.041] as Pair,
    knee: [0.0335, 0.0255] as Pair,
    ankle: [0.0205, 0.0145] as Pair,
    neck: [0.03, 0.0255] as Pair,
};
/**
 * Widths in head units (hu): shoulder joints apart, waist, hips (full widths of the body, arms excluded). The male
 * waist and chest and the female hips are set away from the reference (DECISIONS 2026-11-24, owner: male and female
 * bodies must read apart): a man is a V (broad chest, waist well under it, hips about 0.7 of the shoulders), a woman an
 * hourglass (hips about as wide as the shoulders, waist under 0.65 of the hips).
 */
const WIDTH_HU = {
    shoulder: [1.65, 1.28] as Pair,
    waist: [1.12, 0.8] as Pair,
    hip: [1.42, 1.5] as Pair,
    chest: [1.38, 0.98] as Pair,
};

export interface MangaAnatomy {
    upperArm: number;
    foreArm: number;
    hand: number;
    foot: number;
    r: {
        upperArm: number;
        foreArm: number;
        wrist: number;
        thigh: number;
        knee: number;
        ankle: number;
        neck: number;
    };
    /** distance between the shoulder joints as the skeleton wants it (it puts them at 0.46 of it from the centre) */
    shoulderW: number;
    waistW: number;
    hipW: number;
    /** the body (arms excluded) at the chest, full width */
    chestW: number;
}

export function mangaAnatomy(b: Body, H: number, headH: number, grown: number): MangaAnatomy {
    const g = b.gender;
    const m = b.muscle;
    const f = b.fat;
    // a child is not a small adult: the limbs are a little thicker against the height
    const child = 1 + (1 - grown) * 0.18;
    const k = (v: number) => v * H * child;
    // the variant's build (seinen broader); 1 for the measured variants
    const breadth = VARIANTS[b.mangaVariant].breadth;
    return {
        upperArm: mix(LEN.upperArm, g) * H * (1 + (b.armLength - 0.5) * 0.14),
        foreArm: mix(LEN.foreArm, g) * H * (1 + (b.armLength - 0.5) * 0.14),
        hand: mix(LEN.hand, g) * H,
        foot: mix(FOOT_HU, g) * headH,
        r: {
            upperArm: k(mix(RADIUS.upperArm, g)) * (0.92 + 0.3 * m + 0.25 * f),
            foreArm: k(mix(RADIUS.foreArm, g)) * (0.94 + 0.22 * m + 0.18 * f),
            wrist: k(mix(RADIUS.wrist, g)) * (0.96 + 0.1 * m + 0.08 * f),
            thigh: k(mix(RADIUS.thigh, g)) * (0.9 + 0.16 * m + 0.4 * f),
            knee: k(mix(RADIUS.knee, g)) * (0.95 + 0.1 * m + 0.2 * f),
            ankle: k(mix(RADIUS.ankle, g)) * (0.97 + 0.06 * m + 0.1 * f),
            neck: k(mix(RADIUS.neck, g)) * (0.92 + 0.3 * m),
        },
        // shoulder joints sit at 0.46 of the shoulderW parameter from the middle
        shoulderW:
            ((mix(WIDTH_HU.shoulder, g) * headH) / 0.46 / 2) *
                (0.9 + 0.2 * b.shoulderWidth) *
                breadth +
            H * 0.012 * m,
        waistW: ((mix(WIDTH_HU.waist, g) * headH) / 0.8) * (1 + 0.55 * f),
        chestW: mix(WIDTH_HU.chest, g) * headH * (0.92 + 0.14 * m + 0.1 * f) * breadth,
        hipW: mix(WIDTH_HU.hip, g) * headH * (0.9 + 0.2 * b.hipWidth) + H * 0.03 * f,
    };
}
