/**
 * Color harmonies: colors that go with a base color, found by turning its hue on the color wheel
 * (the RGB / HSL wheel that screens and design tools use, not the painter's RYB wheel).
 */
import { hexToRgb, hslToRgb, hsvToRgb, rgbToHex, rgbToHsl, rgbToHsv } from './colorMath';
import { DEFAULT_GRADIENT, type GradientFill } from './fillStyle';

export type HarmonyId =
    | 'analogous'
    | 'complementary'
    | 'split-complementary'
    | 'triadic'
    | 'square'
    | 'compound'
    | 'shades'
    | 'monochromatic';

/** Schemes that keep the hue and step brightness / lightness instead of turning the hue. */
export type ToneHarmonyId = 'shades' | 'monochromatic';
export type HueHarmonyId = Exclude<HarmonyId, ToneHarmonyId>;
export const isToneHarmony = (id: HarmonyId): id is ToneHarmonyId =>
    id === 'shades' || id === 'monochromatic';

export const HARMONIES: { id: HarmonyId; label: string; hint: string }[] = [
    { id: 'analogous', label: 'Analogous', hint: 'Calm, harmonious' },
    { id: 'complementary', label: 'Complementary', hint: 'High contrast' },
    { id: 'split-complementary', label: 'Split complementary', hint: 'Contrast, less harsh' },
    { id: 'triadic', label: 'Triad', hint: 'Colorful but balanced' },
    { id: 'square', label: 'Square', hint: 'Rich, four even hues' },
    { id: 'compound', label: 'Compound', hint: 'Two close pairs, opposite' },
    { id: 'shades', label: 'Shades', hint: 'One hue, darker steps' },
    { id: 'monochromatic', label: 'Monochromatic', hint: 'Always safe' },
];

/** Hue turns (degrees) per scheme; 0 = the base color itself. */
const TURNS: Record<HueHarmonyId, number[]> = {
    analogous: [-30, 0, 30],
    complementary: [0, 180],
    'split-complementary': [0, 150, 210],
    triadic: [0, 120, 240],
    square: [0, 90, 180, 270],
    compound: [0, 30, 180, 210],
};

/** Hue turns (degrees) of a hue-based scheme, the base (0) included. */
export const harmonyTurns = (id: Exclude<HarmonyId, 'monochromatic'>): readonly number[] =>
    TURNS[id];

/** Monochromatic lightness: 5 steps 15 apart, kept inside 8-95 so none is plain black / white. */
const MONO_STEP = 15;
const MONO_MIN = 8;
const MONO_MAX = 95;
/** Shades: 5 brightness (HSB) steps 20 apart inside 15-100 (100 = the pure color, no white added). */
const SHADE_STEP = 20;
const SHADE_MIN = 15;
const SHADE_MAX = 100;

/** Five steps `step` apart around `value` inside lo-hi; the step nearest `value` is marked. */
function steps(value: number, step: number, lo: number, hi: number) {
    const mid = Math.min(hi - 2 * step, Math.max(lo + 2 * step, value));
    const all = [-2, -1, 0, 1, 2].map((i) => mid + i * step);
    const nearest = all.reduce(
        (best, x, i) => (Math.abs(x - value) < Math.abs(all[best] - value) ? i : best),
        0,
    );
    return { all, nearest };
}

/** The scheme's colors as #rrggbb, base color included exactly. [] for invalid input. */
export function harmonyColors(hex: string, id: HarmonyId): string[] {
    const rgb = hexToRgb(hex);
    if (!rgb) return [];
    const base = rgbToHex(rgb);
    const hsl = rgbToHsl(rgb);
    if (id === 'shades') {
        const hsv = rgbToHsv(rgb);
        const { all, nearest } = steps(hsv.v, SHADE_STEP, SHADE_MIN, SHADE_MAX);
        // dark -> light, like Monochromatic
        return all.map((v, i) => (i === nearest ? base : rgbToHex(hsvToRgb({ ...hsv, v }))));
    }
    if (id !== 'monochromatic') {
        return TURNS[id].map((t) =>
            t === 0 ? base : rgbToHex(hslToRgb({ ...hsl, h: (((hsl.h + t) % 360) + 360) % 360 })),
        );
    }
    // dark -> light around the base; the step nearest the base is the base itself
    const { all, nearest } = steps(hsl.l, MONO_STEP, MONO_MIN, MONO_MAX);
    return all.map((l, i) => (i === nearest ? base : rgbToHex(hslToRgb({ ...hsl, l }))));
}

/** False for grays, black and white (no hue to turn: only Monochromatic means anything). */
export function hasHue(hex: string): boolean {
    const rgb = hexToRgb(hex);
    return !!rgb && rgbToHsv(rgb).s > 0;
}

/** The scheme as evenly spaced gradient stops; keeps the current gradient's type, angle and center. */
export function harmonyGradient(colors: string[], current?: GradientFill): GradientFill {
    const last = Math.max(1, colors.length - 1);
    return {
        ...(current ?? DEFAULT_GRADIENT),
        stops: colors.map((color, i) => ({ offset: i / last, color })),
    };
}
