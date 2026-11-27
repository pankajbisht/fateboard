/**
 * Pencil tool (Shift + P) style. The Pencil draws in the drawing colour with its OWN settings
 * (thickness, opacity, smoothing, stylus pressure, auto-close); it never reads or changes the Draw
 * panel's brush settings (decision 2026-11-11, extended 2026-11-12). While the Pencil is active
 * the brush slice builds the brush from `drawingState(state)`.
 */
import { creationScaleOf } from '@/lib/canvas/creationScale';
import { sprayState } from './sprayStyle';

/**
 * Pencil modes (the Mode menu of the Pencil bar). Laser is listed there too but is its own tool
 * (`activeTool: 'laser'`, K): it is never stored here.
 */
export type PencilMode = 'pencil' | 'highlighter' | 'dashed' | 'shape' | 'eraser';
export const PENCIL_MODES: { value: PencilMode | 'laser'; label: string }[] = [
    { value: 'pencil', label: 'Pencil' },
    { value: 'highlighter', label: 'Highlighter' },
    { value: 'dashed', label: 'Dashed' },
    { value: 'shape', label: 'Smart shape' },
    { value: 'eraser', label: 'Eraser' },
    { value: 'laser', label: 'Laser' },
];
const STORED_MODES: readonly string[] = ['pencil', 'highlighter', 'dashed', 'shape', 'eraser'];

export type PencilStyle = {
    /** What a stroke does: a line, a highlight, dashes, a clean shape or an erase. */
    mode: PencilMode;
    /** Line width at 100 % (screen px on the design board, scene px on the whiteboard). */
    width: number;
    /** 0.05 … 1 */
    opacity: number;
    /** Stabiliser, 0 (raw) … 10 (smoothest). */
    smoothing: number;
    /** A stylus varies the width with pressure; a mouse keeps a constant width. */
    pressure: boolean;
    /** A stroke that ends near its start becomes a closed shape. */
    autoClose: boolean;
};

export const DEFAULT_PENCIL_STYLE: PencilStyle = {
    mode: 'pencil',
    width: 2,
    opacity: 1,
    smoothing: 4,
    pressure: false,
    autoClose: true,
};

export const PENCIL_LIMITS = {
    width: { min: 1, max: 50 },
    opacity: { min: 0.05, max: 1 },
    smoothing: { min: 0, max: 10 },
} as const;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const finite = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? v : fallback;

/** Valid style from a partial update (out-of-range numbers are clamped, junk is ignored). */
export function sanitizePencilStyle(
    base: PencilStyle,
    patch: Partial<Record<keyof PencilStyle, unknown>>,
): PencilStyle {
    const { width, opacity, smoothing } = PENCIL_LIMITS;
    return {
        mode: STORED_MODES.includes(patch.mode as string)
            ? (patch.mode as PencilMode)
            : (base.mode ?? 'pencil'),
        width: clamp(Math.round(finite(patch.width, base.width)), width.min, width.max),
        opacity: clamp(finite(patch.opacity, base.opacity), opacity.min, opacity.max),
        smoothing: clamp(finite(patch.smoothing, base.smoothing), smoothing.min, smoothing.max),
        pressure: typeof patch.pressure === 'boolean' ? patch.pressure : base.pressure,
        autoClose: typeof patch.autoClose === 'boolean' ? patch.autoClose : base.autoClose,
    };
}

type DrawingSettings = Record<string, unknown> & { activeTool?: unknown; pencilStyle?: unknown };

/** The brush settings of the Pencil: the drawing colour + the Pencil style and mode, no Draw effects. */
export const pencilState = <S extends DrawingSettings>(s: S): S => {
    const style = { ...DEFAULT_PENCIL_STYLE, ...(s.pencilStyle as Partial<PencilStyle>) };
    const mode = style.mode;
    const width = Math.max(
        1,
        style.width * creationScaleOf(s as Parameters<typeof creationScaleOf>[0]),
    );
    const base = {
        ...s,
        // pressure: the variable-width engine, width from the stylus only (not from speed)
        brush: style.pressure && mode === 'pencil' ? 'ink' : 'pencil',
        taper: 0,
        speedWidth: false,
        width,
        brushOpacity: style.opacity,
        smoothing: style.smoothing,
        autoClose: style.autoClose && mode === 'pencil',
        lineCap: 'round',
        lineJoin: 'round',
        lineStyle: 'solid',
        straightLine: false,
        blend: 'source-over',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        symmetry: 'none',
        fillEnabled: false,
    };
    if (mode === 'highlighter')
        return {
            ...base,
            width: Math.max(16, width * 6),
            brushOpacity: Math.min(style.opacity, 0.4),
            blend: 'multiply',
            lineCap: 'butt',
        };
    if (mode === 'dashed') return { ...base, lineStyle: 'dashed' };
    if (mode === 'eraser')
        return { ...base, brush: 'eraser', eraserMode: 'stroke', width: Math.max(12, width * 4) };
    return base; // pencil, shape (the recognizer runs when the stroke is finished)
};

/** The settings the canvas draws with: the Brush panel's, or the Pencil's / Spray's while active. */
export const drawingState = <S extends DrawingSettings>(s: S): S =>
    s.activeTool === 'pencil' ? pencilState(s) : s.activeTool === 'spray' ? sprayState(s) : s;
