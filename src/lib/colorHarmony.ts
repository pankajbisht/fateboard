/**
 * Color harmonies: colors that go with a base color, found by turning its hue on the color wheel
 * (the RGB / HSL wheel that screens and design tools use, not the painter's RYB wheel).
 */
import { hexToRgb, hslToRgb, rgbToHex, rgbToHsl, rgbToHsv } from './colorMath';
import { DEFAULT_GRADIENT, type GradientFill } from './fillStyle';

export type HarmonyId =
    'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'monochromatic';

export const HARMONIES: { id: HarmonyId; label: string; hint: string }[] = [
    { id: 'complementary', label: 'Complementary', hint: 'High contrast' },
    { id: 'analogous', label: 'Analogous', hint: 'Calm, harmonious' },
    { id: 'triadic', label: 'Triadic', hint: 'Colorful but balanced' },
    { id: 'split-complementary', label: 'Split-complementary', hint: 'Contrast, less harsh' },
    { id: 'monochromatic', label: 'Monochromatic', hint: 'Always safe' },
];

/** Hue turns (degrees) per scheme; 0 = the base color itself. */
const TURNS: Record<Exclude<HarmonyId, 'monochromatic'>, number[]> = {
    complementary: [0, 180],
    analogous: [-30, 0, 30],
    triadic: [0, 120, 240],
    'split-complementary': [0, 150, 210],
};

/** Monochromatic lightness: 5 steps 15 apart, kept inside 8-95 so none is plain black / white. */
const MONO_STEP = 15;
const MONO_MIN = 8;
const MONO_MAX = 95;

/** The scheme's colors as #rrggbb, base color included exactly. [] for invalid input. */
export function harmonyColors(hex: string, id: HarmonyId): string[] {
    const rgb = hexToRgb(hex);
    if (!rgb) return [];
    const base = rgbToHex(rgb);
    const hsl = rgbToHsl(rgb);
    if (id !== 'monochromatic') {
        return TURNS[id].map((t) =>
            t === 0 ? base : rgbToHex(hslToRgb({ ...hsl, h: (((hsl.h + t) % 360) + 360) % 360 })),
        );
    }
    // dark -> light around the base; the step nearest the base is the base itself
    const mid = Math.min(MONO_MAX - 2 * MONO_STEP, Math.max(MONO_MIN + 2 * MONO_STEP, hsl.l));
    const ls = [-2, -1, 0, 1, 2].map((i) => mid + i * MONO_STEP);
    const nearest = ls.reduce(
        (best, l, i) => (Math.abs(l - hsl.l) < Math.abs(ls[best] - hsl.l) ? i : best),
        0,
    );
    return ls.map((l, i) => (i === nearest ? base : rgbToHex(hslToRgb({ ...hsl, l }))));
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
