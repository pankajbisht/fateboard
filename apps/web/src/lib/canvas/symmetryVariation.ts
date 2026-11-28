/**
 * Per-copy variation for symmetry copies: copy k of n gets k / n of the hue turn, the fade and the shrink, and
 * a seeded random wobble (the same seed gives the same pattern, so Undo / Redo and "lock this one" are stable).
 * Pure.
 */
export type CopyVariation = {
    /** Hue turn in degrees. */
    hue: number;
    /** Opacity factor (1 = unchanged). */
    opacity: number;
    /** Scale factor about the copy's own centre. */
    scale: number;
    /** Offset (scene px) and turn (degrees). */
    dx: number;
    dy: number;
    turn: number;
};

export type VariationSettings = {
    hue: number;
    fade: number;
    shrink: number;
    wobble: number;
    seed: number;
};

/** mulberry32: small, fast, seeded PRNG in [0, 1). */
export function seededRandom(seed: number): () => number {
    let a = seed >>> 0 || 1;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export const hasVariation = (v: VariationSettings | null | undefined): v is VariationSettings =>
    !!v && (v.hue !== 0 || v.fade > 0 || v.shrink > 0 || v.wobble > 0);

/** Variation of copy `k` (1-based) of `n` copies. */
export function variationFor(k: number, n: number, v: VariationSettings): CopyVariation {
    const t = n > 0 ? k / n : 0;
    const rnd = seededRandom(v.seed * 7919 + k * 104729);
    const w = v.wobble;
    return {
        hue: v.hue * k,
        opacity: Math.max(0.05, 1 - v.fade * t),
        scale: Math.max(0.05, 1 - v.shrink * t),
        dx: w ? (rnd() * 2 - 1) * w : 0,
        dy: w ? (rnd() * 2 - 1) * w : 0,
        turn: w ? (rnd() * 2 - 1) * Math.min(15, w / 4) : 0,
    };
}

/** RGB(A) → HSL turn → RGB(A). Accepts r, g, b in 0–255; returns them rounded. */
export function turnHue(r: number, g: number, b: number, deg: number): [number, number, number] {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    const d = max - min;
    if (d === 0) return [r, g, b]; // grey: no hue to turn
    const s = d / (1 - Math.abs(2 * l - 1));
    let h = max === rn ? ((gn - bn) / d) % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
    h = (((h * 60 + deg) % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    const [r1, g1, b1] =
        h < 60
            ? [c, x, 0]
            : h < 120
              ? [x, c, 0]
              : h < 180
                ? [0, c, x]
                : h < 240
                  ? [0, x, c]
                  : h < 300
                    ? [x, 0, c]
                    : [c, 0, x];
    return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
}
