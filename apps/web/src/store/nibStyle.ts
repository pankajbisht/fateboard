/**
 * Calligraphy pen options (brush `nib`, Inkscape Calligraphy tool). The nib width is the brush width; these are
 * the rest. Shown in the header context row while drawing with the Calligraphy pen.
 */
export type NibStyle = {
    /** -1 … 1: positive = fast strokes get thinner, negative = thicker. */
    thinning: number;
    /** nib angle in degrees, -90 … 90 (0 = horizontal) */
    angle: number;
    /** 0 … 1: 1 = the nib keeps its angle, 0 = it turns across the stroke */
    fixation: number;
    /** 0 … 5: round ends */
    caps: number;
};

/** Inkscape's defaults (thinning 10, angle 30, fixation 90, caps 0). */
export const DEFAULT_NIB_STYLE: NibStyle = { thinning: 0.1, angle: 30, fixation: 0.9, caps: 0 };

const LIMITS: Record<keyof NibStyle, [number, number]> = {
    thinning: [-1, 1],
    angle: [-90, 90],
    fixation: [0, 1],
    caps: [0, 5],
};

/** Valid style from a partial update: non-numbers are ignored, numbers clamped. */
export function sanitizeNibStyle(
    base: NibStyle,
    patch: Partial<Record<keyof NibStyle, unknown>>,
): NibStyle {
    const out = { ...base };
    (Object.keys(LIMITS) as (keyof NibStyle)[]).forEach((key) => {
        const v = Number(patch[key]);
        if (patch[key] === undefined || patch[key] === null || !Number.isFinite(v)) return;
        out[key] = Math.min(LIMITS[key][1], Math.max(LIMITS[key][0], v));
    });
    return out;
}
