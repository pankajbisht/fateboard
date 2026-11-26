import type { Profile } from './bentLimb';

/**
 * The manga body's chosen look for the shoulder + sleeve, the arm and hand, and the skirt (owner redraw request,
 * 2026-11-25; three candidates per task were compared and variant A kept: a set-in sleeve, natural arms, a hand about
 * 0.75 of the face, an A-line skirt with a waistband). Only the drawing: bone lengths, joint pivots, part keys and
 * poses are untouched.
 */
export interface SleeveLook {
    /** the sleeve's head reaches this far back past the shoulder joint (× its radius), over the torso */
    back: number;
    /** radius of the round head round the joint (× the sleeve radius): it hides the joint in every pose */
    cap: number;
    /** the hem opening (× the arm radius there): > 1 flares */
    hem: number;
    /** the torso's trapezius ring: how far it drops (share of the torso length) and how far out it reaches (0..1) */
    slopeDrop: number;
    slopeReach: number;
}

export interface ArmLook {
    upper: Profile;
    fore: Profile;
}

export interface HandLook {
    /** the drawn hand's size (× the hand bone; the wrist pivot stays) */
    scale: number;
    /** finger width */
    finger: number;
    /** curl of a relaxed hand (× the table): lower = fingers more readable */
    relax: number;
}

export interface SkirtLook {
    /** waistband depth (share of the torso length), 0 = none */
    band: number;
    /** how far the hem dips at the front and back (× the hem depth): a soft curve, not a ruler line */
    hemCurve: number;
    /** fold lines from the hips to the hem */
    folds: number;
    /** extra flare at the hem (× the garment's own) */
    flare: number;
}

const LOOK = {
    // a set-in T-shirt sleeve: the head round the shoulder point, a little flare at the hem
    sleeve: {
        back: 0.35,
        cap: 1.02,
        hem: 1.06,
        slopeDrop: 0.05,
        slopeReach: 0.5,
    } satisfies SleeveLook,
    // natural arms: full at the deltoid, narrowing to the elbow, a slight knob, forearm swell then a slim wrist
    arm: {
        upper: [
            [0, 1.16],
            [0.18, 1.14],
            [0.55, 1.0],
            [0.86, 0.88],
            [1, 0.93],
        ],
        fore: [
            [0, 1],
            [0.22, 1.1],
            [0.6, 0.9],
            [1, 0.74],
        ],
    } satisfies ArmLook,
    // the bone is 0.6 of a head: 1.25 brings the drawn hand to about 0.75 of the face
    hand: { scale: 1.25, finger: 1.1, relax: 0.7 } satisfies HandLook,
    // an A-line skirt: waistband, soft curved hem, three soft folds
    skirt: { band: 0.07, hemCurve: 1, folds: 3, flare: 1 } satisfies SkirtLook,
};

export const mangaLook = () => LOOK;
