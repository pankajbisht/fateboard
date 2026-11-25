/**
 * Pen tool options (the Pen options bar): drawing mode and the look of new paths: stroke colour and
 * width, line ends, corners, dashes, arrowheads, and the fill of closed shapes.
 */
import { PAINT_DEFAULTS } from '@/lib/paintToggle';
import type { PenNode, PenPoint } from '@/lib/canvas/penPath';
import { head as arrowHead } from '@/lib/utils/shapeConnectors';
import { PEN_SHAPES, type PenShape } from '@/lib/canvas/penShape';

/** Pen = click / drag points; Curvature = click, the curve bends through them; Freeform = drag by hand. */
export const PEN_MODES = ['pen', 'curvature', 'freeform'] as const;
export type PenMode = (typeof PEN_MODES)[number];

export const LINE_CAPS = ['round', 'square', 'butt'] as const;
export const LINE_JOINS = ['round', 'miter', 'bevel'] as const;
export const DASHES = ['solid', 'dashed', 'dotted'] as const;
export const ARROWS = ['none', 'end', 'both'] as const;

export type PenStyle = {
    stroke: string;
    /** At 100 % (scaled like new shapes on the design board). */
    strokeWidth: number;
    /** Fill of closed shapes when `fillEnabled`; open paths are never filled. */
    fill: string;
    fillEnabled: boolean;
    lineCap: (typeof LINE_CAPS)[number];
    lineJoin: (typeof LINE_JOINS)[number];
    dash: (typeof DASHES)[number];
    /** Arrowheads on open paths (closed shapes never get one). */
    arrow: (typeof ARROWS)[number];
    /** Inkscape "Shape": an open path becomes a filled outline that is thin / thick along its length. */
    shape: PenShape;
    /** Full thickness of a shaped path, at 100 %. */
    shapeWidth: number;
};

export const DEFAULT_PEN_STYLE: PenStyle = {
    stroke: PAINT_DEFAULTS.shape.stroke,
    strokeWidth: PAINT_DEFAULTS.shape.strokeWidth,
    fill: PAINT_DEFAULTS.shape.fill,
    fillEnabled: false,
    lineCap: 'round',
    lineJoin: 'round',
    dash: 'solid',
    arrow: 'none',
    shape: 'none',
    shapeWidth: 16,
};

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const oneOf = <T extends string>(list: readonly T[], v: unknown, fallback: T): T =>
    list.includes(v as T) ? (v as T) : fallback;

export const isPenMode = (v: unknown): v is PenMode => PEN_MODES.includes(v as PenMode);

/** Valid style from a partial update: bad colours / values are ignored, the width is clamped. */
export function sanitizePenStyle(
    base: PenStyle,
    patch: Partial<Record<keyof PenStyle, unknown>>,
): PenStyle {
    const color = (v: unknown, fallback: string) =>
        typeof v === 'string' && HEX.test(v) ? v : fallback;
    const width = Number(patch.strokeWidth);
    const shapeWidth = Number(patch.shapeWidth);
    return {
        stroke: color(patch.stroke, base.stroke),
        strokeWidth:
            patch.strokeWidth !== undefined && Number.isFinite(width)
                ? Math.min(100, Math.max(0.5, width))
                : base.strokeWidth,
        fill: color(patch.fill, base.fill),
        fillEnabled: typeof patch.fillEnabled === 'boolean' ? patch.fillEnabled : base.fillEnabled,
        lineCap: oneOf(LINE_CAPS, patch.lineCap, base.lineCap),
        lineJoin: oneOf(LINE_JOINS, patch.lineJoin, base.lineJoin),
        dash: oneOf(DASHES, patch.dash, base.dash),
        arrow: oneOf(ARROWS, patch.arrow, base.arrow),
        shape: oneOf(PEN_SHAPES, patch.shape, base.shape),
        shapeWidth:
            patch.shapeWidth !== undefined && Number.isFinite(shapeWidth)
                ? Math.min(200, Math.max(1, shapeWidth))
                : base.shapeWidth,
    };
}

/** Fabric stroke props for a new path whose stroke is `width` scene px. Dotted = round dots. */
export const penStrokeProps = (style: PenStyle, width: number) => ({
    strokeLineCap: style.dash === 'dotted' ? ('round' as const) : style.lineCap,
    strokeLineJoin: style.lineJoin,
    strokeDashArray:
        style.dash === 'dashed'
            ? [width * 3, width * 2]
            : style.dash === 'dotted'
              ? [0.1, width * 2]
              : null,
});

const unit = (from: PenPoint, to: PenPoint) => {
    const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    return { x: (to.x - from.x) / len, y: (to.y - from.y) / len };
};
const same = (a: PenPoint, b: PenPoint) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) < 1e-6;

/** The point the curve comes from as it reaches `tip` (handle, else the neighbour's handle / anchor). */
const behind = (
    tip: PenNode,
    tipHandle: PenPoint | undefined,
    other: PenNode,
    otherHandle?: PenPoint,
) => [tipHandle, otherHandle, other].find((p): p is PenPoint => !!p && !same(p, tip)) ?? other;

/** Path data for the arrowheads of an open path (appended after its own data). */
export function penArrowData(nodes: readonly PenNode[], style: PenStyle, width: number): string {
    if (style.arrow === 'none' || nodes.length < 2) return '';
    const size = Math.max(10, width * 4);
    const last = nodes[nodes.length - 1];
    const prev = nodes[nodes.length - 2];
    let d = arrowHead(last, unit(behind(last, last.in, prev, prev.out), last), size);
    if (style.arrow === 'both') {
        const [first, second] = nodes;
        d += arrowHead(first, unit(behind(first, first.out, second, second.in), first), size);
    }
    return d;
}
