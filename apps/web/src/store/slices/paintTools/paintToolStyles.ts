/**
 * Settings of the Paint bucket (G), Lasso (L) and Geometry (D) tools: types, defaults and sanitisers (pure).
 * Their option bars write them through `setBucketStyle` / `setLassoStyle` / `setGeometryStyle`.
 */
import {
    ANGLE_STEPS,
    DRAFTER_MODES,
    ISO_PEN_WIDTHS_MM,
    type DrafterMode,
} from '@/lib/canvas/drafter';
import {
    COMPASS_MODES,
    GEOMETRY_INSTRUMENTS,
    SCALE_TICKS_MM,
    SET_SQUARE_KINDS,
    type CompassMode,
    type GeometryInstrument,
    type SetSquareKind,
} from '@/lib/canvas/geometry';
import type { LassoMode } from '@/lib/canvas/lasso';

export type BucketMode = 'auto' | 'region' | 'shape';
export type BucketStyle = {
    /** auto: a closed shape under the click is recoloured, else the enclosed area is filled. */
    mode: BucketMode;
    /** 0 … 255: colour difference that still counts as the same area. */
    tolerance: number;
    /** Closes openings in the line art up to about 2 × this, in screen px (0 … 20). */
    gap: number;
    /** The fill reaches this far under the lines, in screen px (0 … 6). */
    expand: number;
    /** behind: the new fill goes under the line art around it; top: above everything. */
    placement: 'behind' | 'top';
};

export type LassoStyle = {
    /** select: pick objects; fill: the loop becomes a filled shape in the drawing colour. */
    action: 'select' | 'fill';
    /** touch: any overlap picks an object; contain: only objects fully inside. */
    match: LassoMode;
};

export type GeometryStyle = {
    /** The instrument in use (the tool's Mode): Drafter, Scale, Set square, Protractor or Compass. */
    instrument: GeometryInstrument;
    /** Drafter mode. */
    mode: DrafterMode;
    /** Angle step in degrees (Drafter head, Protractor, Compass arc; Shift on the Scale). */
    step: (typeof ANGLE_STEPS)[number];
    /** Instrument rotation (degrees): the Drafter head and the Set square turn by it. */
    base: number;
    /** Technical pen width, mm (ISO 128), for every instrument. */
    penMm: (typeof ISO_PEN_WIDTHS_MM)[number];
    /** Scale: lengths snap to this many mm (0 = any length). */
    scaleTickMm: (typeof SCALE_TICKS_MM)[number];
    setSquare: SetSquareKind;
    compass: CompassMode;
};

export const DEFAULT_BUCKET_STYLE: BucketStyle = {
    mode: 'auto',
    tolerance: 40,
    gap: 2,
    expand: 1,
    placement: 'behind',
};
export const DEFAULT_LASSO_STYLE: LassoStyle = { action: 'select', match: 'touch' };
export const DEFAULT_GEOMETRY_STYLE: GeometryStyle = {
    instrument: 'drafter',
    mode: 'line',
    step: 15,
    base: 0,
    penMm: 0.35,
    scaleTickMm: 1,
    setSquare: '45',
    compass: 'circle',
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const num = (v: unknown, fallback: number, lo: number, hi: number) =>
    typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : fallback;
const oneOf = <T>(v: unknown, list: readonly T[], fallback: T): T =>
    list.includes(v as T) ? (v as T) : fallback;

export function sanitizeBucketStyle(
    base: BucketStyle,
    p: Partial<Record<keyof BucketStyle, unknown>>,
): BucketStyle {
    return {
        mode: oneOf(p.mode, ['auto', 'region', 'shape'] as const, base.mode),
        tolerance: Math.round(num(p.tolerance, base.tolerance, 0, 255)),
        gap: Math.round(num(p.gap, base.gap, 0, 20)),
        expand: Math.round(num(p.expand, base.expand, 0, 6)),
        placement: oneOf(p.placement, ['behind', 'top'] as const, base.placement),
    };
}

export function sanitizeLassoStyle(
    base: LassoStyle,
    p: Partial<Record<keyof LassoStyle, unknown>>,
): LassoStyle {
    return {
        action: oneOf(p.action, ['select', 'fill'] as const, base.action),
        match: oneOf(p.match, ['touch', 'contain'] as const, base.match),
    };
}

export function sanitizeGeometryStyle(
    base: GeometryStyle,
    p: Partial<Record<keyof GeometryStyle, unknown>>,
): GeometryStyle {
    return {
        instrument: oneOf(p.instrument, GEOMETRY_INSTRUMENTS, base.instrument),
        mode: oneOf(p.mode, DRAFTER_MODES, base.mode),
        step: oneOf(p.step, ANGLE_STEPS, base.step),
        base: ((num(p.base, base.base, -1e6, 1e6) % 360) + 360) % 360,
        penMm: oneOf(p.penMm, ISO_PEN_WIDTHS_MM, base.penMm),
        scaleTickMm: oneOf(p.scaleTickMm, SCALE_TICKS_MM, base.scaleTickMm),
        setSquare: oneOf(p.setSquare, SET_SQUARE_KINDS, base.setSquare),
        compass: oneOf(p.compass, COMPASS_MODES, base.compass),
    };
}
