import type { Body } from '../schema/types';
import type { MangaVariant } from '../schema/bodyStyles';

/**
 * The manga proportion table (docs/CHARACTER_STUDIO.md, manga body). Everything is in head units, so every height
 * and age works: a teen or adult is 7.5–8 heads tall, a child 5–6, an elder about half a head less (a slight stoop
 * comes from the posture setting). Landmarks from the top of the head: chin 1.0, nipples 2.0, navel 3.0,
 * crotch 4.2, knee 5.9 (the owner's reference sheet, 2026-11-24), feet at the full height. `mangaProportions` turns a body into the numbers
 * `buildSkeleton` uses; the classic body never reads this file.
 */
export const LANDMARKS = { chin: 1.0, nipples: 2.0, navel: 3.0, crotch: 4.2, knee: 5.9 } as const;

interface VariantRow {
    /** full-grown height in heads */
    heads: number;
    /** shoulder width in head widths (male, female) */
    shoulder: [number, number];
    /** hip width in head widths */
    hip: number;
    /** waist width against the classic waist (1 = same) */
    waist: number;
    /** visible neck length in head heights */
    neck: number;
    /** extra leg length as a share of the height */
    legBias: number;
    /**
     * shoulder and chest breadth against the anatomy table (rig/anatomy.ts sets the widths; `shoulder` above only
     * shapes the skeleton's first guess): 1 = the measured reference
     */
    breadth: number;
}

export const VARIANTS: Record<MangaVariant, VariantRow> = {
    shonen: {
        heads: 7.5,
        shoulder: [2.05, 1.65],
        hip: 1.3,
        waist: 1,
        neck: 0.26,
        legBias: 0,
        breadth: 1,
    },
    shojo: {
        heads: 7.8,
        shoulder: [1.85, 1.5],
        hip: 1.25,
        waist: 0.9,
        neck: 0.24,
        legBias: 0.01,
        breadth: 1,
    },
    webtoon: {
        heads: 8,
        shoulder: [2, 1.6],
        hip: 1.3,
        waist: 0.94,
        neck: 0.25,
        legBias: 0.035,
        breadth: 1,
    },
    seinen: {
        heads: 8,
        shoulder: [2.15, 1.7],
        hip: 1.3,
        waist: 1,
        neck: 0.29,
        legBias: 0.01,
        breadth: 1.08,
    },
    josei: {
        heads: 7.9,
        shoulder: [1.95, 1.55],
        hip: 1.3,
        waist: 0.93,
        neck: 0.26,
        legBias: 0.015,
        breadth: 1.03,
    },
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export interface MangaProportions {
    heads: number;
    /** floor to hip joint, as a share of the height */
    legFrac: number;
    neck: number;
    shoulderW: number;
    hipW: number;
    /** against the classic waist */
    waist: number;
}

/** Height in heads for an age: a child 5.3–6, a teen 7–7.5, an adult the variant's, an elder about half a head less. */
export function mangaHeads(age: number, variant: MangaVariant): number {
    const g = clamp01((age - 5) / 13);
    const old = clamp01((age - 55) / 25);
    return lerp(5.3, VARIANTS[variant].heads, g ** 1.4) - 0.5 * old;
}

export function mangaProportions(b: Body, H: number): MangaProportions {
    const v = VARIANTS[b.mangaVariant];
    const g = clamp01((b.age - 5) / 13);
    const heads = mangaHeads(b.age, b.mangaVariant);
    const headH = H / heads;
    const headW = headH * 0.8;
    const male = 1 - b.gender;
    // crotch at 4 heads from the top when grown (legs longer than the torso); children's legs are shorter
    const grown = (heads - LANDMARKS.crotch) / heads + 0.01 + v.legBias;
    const legFrac = lerp(0.42, grown, g) + (b.legLength - 0.5) * 0.06;
    const shoulderHeads = lerp(1.35, lerp(v.shoulder[1], v.shoulder[0], male), g);
    return {
        heads,
        legFrac,
        neck: v.neck * lerp(0.75, 1.25, b.neckLength) * lerp(0.8, 1, g),
        shoulderW: headW * shoulderHeads * lerp(0.88, 1.12, b.shoulderWidth) + H * 0.025 * b.muscle,
        hipW:
            headW * v.hip * lerp(0.9, 1.1, b.hipWidth) * lerp(1, 1.12, b.gender) + H * 0.03 * b.fat,
        waist: v.waist,
    };
}

/** Where each landmark is, in cm above the floor, for a figure `heads` tall and `H` cm high. */
export const landmarkHeights = (H: number, heads: number) =>
    Object.fromEntries(
        Object.entries(LANDMARKS).map(([k, n]) => [k, H - (n * H) / heads]),
    ) as Record<keyof typeof LANDMARKS, number>;
