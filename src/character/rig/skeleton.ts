import type { Body, JointId } from '../schema/types';
import type { V3 } from './math';
import { mangaAnatomy } from './anatomy';
import { mangaProportions } from './proportions';

/**
 * The canonical skeleton for one body: where each joint sits relative to its parent at rest (arms hanging,
 * legs straight, facing +z), plus the sizes the renderer needs. Proportions follow age: a 5-year-old is about
 * 5 heads tall, an adult 7.5; legs grow faster than the torso; elders lose a little height.
 */
export const PARENT: Record<JointId, JointId | null> = {
    pelvis: null,
    spine1: 'pelvis',
    spine2: 'spine1',
    chest: 'spine2',
    neck: 'chest',
    head: 'neck',
    shoulderL: 'chest',
    upperArmL: 'shoulderL',
    lowerArmL: 'upperArmL',
    handL: 'lowerArmL',
    shoulderR: 'chest',
    upperArmR: 'shoulderR',
    lowerArmR: 'upperArmR',
    handR: 'lowerArmR',
    hipL: 'pelvis',
    upperLegL: 'hipL',
    lowerLegL: 'upperLegL',
    footL: 'lowerLegL',
    toeL: 'footL',
    hipR: 'pelvis',
    upperLegR: 'hipR',
    lowerLegR: 'upperLegR',
    footR: 'lowerLegR',
    toeR: 'footR',
};

export interface Skeleton {
    /** rest offset of each joint from its parent (in the parent's frame) */
    offset: Record<JointId, V3>;
    /** height of the pelvis joint above the floor at rest */
    pelvisHeight: number;
    height: number;
    headHeight: number;
    upperArm: number;
    foreArm: number;
    hand: number;
    thigh: number;
    shin: number;
    ankle: number;
    foot: number;
    /** drawing sizes (radii and widths) */
    size: {
        head: V3;
        neck: number;
        shoulderW: number;
        /** full width of the body at the chest, arms excluded (manga body only) */
        chestW?: number;
        chestDepth: number;
        waistW: number;
        hipW: number;
        hipDepth: number;
        belly: number;
        bust: number;
        upperArm: number;
        foreArm: number;
        wrist: number;
        hand: number;
        thigh: number;
        knee: number;
        ankle: number;
        foot: number;
    };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** 0 at 5 years … 1 when grown (18). */
export const growth = (age: number) => clamp01((age - 5) / 13);
/** 0 until 55 … 1 at 80. */
export const ageing = (age: number) => clamp01((age - 55) / 25);

/** Standing height in cm for this body. */
export function standingHeight(b: Body): number {
    const adult = lerp(152, 196, b.height) - 10 * b.gender;
    const child = lerp(100, 118, b.height);
    const g = growth(b.age);
    // growth spurt: slow at first, then fast in the teens
    return lerp(child, adult, g * g * (3 - 2 * g)) * (1 - 0.035 * ageing(b.age));
}

export function buildSkeleton(b: Body): Skeleton {
    const g = growth(b.age);
    const old = ageing(b.age);
    const H = standingHeight(b);
    // the manga body reads its proportions from a head-unit table (rig/proportions.ts); classic is unchanged
    const manga = b.bodyStyle === 'manga' ? mangaProportions(b, H) : null;
    const heads = manga ? manga.heads : lerp(5, 7.5, g) - 0.2 * old;
    const headH = H / heads;
    const neck = manga
        ? headH * manga.neck
        : headH * lerp(0.18, 0.32, b.neckLength) * lerp(0.75, 1, g);
    // floor to hip joint: children have shorter legs
    const legH = H * (manga ? manga.legFrac : lerp(0.42, 0.47, g) + (b.legLength - 0.5) * 0.06);
    const ankle = H * 0.04;
    const legBones = legH - ankle;
    const thigh = legBones * 0.52;
    const shin = legBones - thigh;
    const pelvisDrop = H * 0.03;
    // floor → pelvis (legH + drop) → neck base (torso) → head joint (neck) → top of the head (headH) = H
    const torso = H - headH - neck - legH - pelvisDrop;
    const armScale = 1 + (b.armLength - 0.5) * 0.14;
    // the manga anatomy table (rig/anatomy.ts) has its own arm lengths, limb radii and torso widths
    const A = manga ? mangaAnatomy(b, H, headH, g) : null;
    const upperArm = A ? A.upperArm : H * 0.186 * armScale;
    const foreArm = A ? A.foreArm : H * 0.15 * armScale;
    const hand = A ? A.hand : H * 0.1 * lerp(0.9, 1, g);
    const foot = A ? A.foot : H * 0.145;

    const male = 1 - b.gender;
    const classicShoulderW =
        H * lerp(0.205, 0.235, male) * lerp(0.85, 1.15, b.shoulderWidth) * lerp(0.9, 1, g) +
        H * 0.03 * b.muscle;
    const shoulderW = A ? A.shoulderW : classicShoulderW;
    const hipW = A
        ? A.hipW
        : H * lerp(0.165, 0.2, b.gender) * lerp(0.85, 1.15, b.hipWidth) + H * 0.035 * b.fat;
    const thick = 1 + 0.55 * b.fat + 0.25 * b.muscle;
    // the manga limbs are a little slimmer
    const limb = H * lerp(0.03, 0.026, b.gender) * thick * (manga ? 0.92 : 1);

    const offset: Record<JointId, V3> = {
        pelvis: [0, 0, 0],
        spine1: [0, torso * 0.22, 0],
        spine2: [0, torso * 0.26, 0],
        chest: [0, torso * 0.26, 0],
        neck: [0, torso * 0.26, 0],
        head: [0, neck, 0],
        shoulderL: [shoulderW * 0.1, -torso * (manga ? 0.02 : 0.06), 0],
        upperArmL: [shoulderW * 0.36, 0, 0],
        lowerArmL: [0, -upperArm, 0],
        handL: [0, -foreArm, 0],
        shoulderR: [-shoulderW * 0.1, -torso * (manga ? 0.02 : 0.06), 0],
        upperArmR: [-shoulderW * 0.36, 0, 0],
        lowerArmR: [0, -upperArm, 0],
        handR: [0, -foreArm, 0],
        hipL: [hipW * 0.28, -pelvisDrop, 0],
        upperLegL: [0, 0, 0],
        lowerLegL: [0, -thigh, 0],
        footL: [0, -shin, 0],
        toeL: [0, -ankle, foot * 0.72],
        hipR: [-hipW * 0.28, -pelvisDrop, 0],
        upperLegR: [0, 0, 0],
        lowerLegR: [0, -thigh, 0],
        footR: [0, -shin, 0],
        toeR: [0, -ankle, foot * 0.72],
    };

    return {
        offset,
        pelvisHeight: legH + pelvisDrop,
        height: H,
        headHeight: headH,
        upperArm,
        foreArm,
        hand,
        thigh,
        shin,
        ankle,
        foot,
        size: {
            head: [headH * 0.4, headH * 0.5, headH * 0.44],
            neck: A ? A.r.neck : limb * 0.95 * lerp(0.9, 1.2, b.muscle),
            shoulderW,
            ...(A ? { chestW: A.chestW } : {}),
            chestDepth: H * 0.11 * (1 + 0.35 * b.fat + 0.15 * b.muscle),
            waistW: A
                ? A.waistW
                : H * lerp(0.165, 0.135, b.gender) * (1 + 0.6 * b.fat) * (manga?.waist ?? 1),
            hipW,
            hipDepth: H * 0.1 * (1 + 0.4 * b.fat),
            belly: H * 0.07 * b.fat * b.fat * 1.6,
            // its own setting, not the frame: any frame takes any bust
            bust: H * 0.03 * b.bust * g,
            upperArm: A ? A.r.upperArm : limb * lerp(1, 1.25, b.muscle),
            foreArm: A ? A.r.foreArm : limb * 0.85,
            wrist: A ? A.r.wrist : limb * 0.6,
            hand: limb * 0.85,
            thigh: A ? A.r.thigh : limb * 1.55 * (1 + 0.15 * b.gender),
            knee: A ? A.r.knee : limb * 1.05,
            ankle: A ? A.r.ankle : limb * 0.72,
            foot: limb * 0.8,
        },
    };
}
