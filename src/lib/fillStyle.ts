/**
 * Read / write an object's fill (none, solid, linear or radial gradient) and drop shadow in one
 * plain shape the UI can edit. Pure helpers: store actions apply the Fabric values they build.
 */
import * as fabric from 'fabric';

export type GradientStop = { offset: number; color: string };

export type GradientFill = {
    type: 'linear' | 'radial';
    /** Linear direction in degrees (0 = left -> right, 90 = top -> bottom). */
    angle: number;
    /** Radial center as a fraction of the object box (0..1). */
    center: { x: number; y: number };
    /** Radial size as a fraction of the object box (0.5 = touches the edges). */
    radius: number;
    stops: GradientStop[];
};

export type FillKind = 'none' | 'solid' | 'linear' | 'radial';

export type FillSnapshot = { kind: FillKind; color?: string; gradient?: GradientFill };

export type ShadowStyle = {
    color: string;
    opacity: number;
    blur: number;
    offsetX: number;
    offsetY: number;
};

export const DEFAULT_GRADIENT: GradientFill = {
    type: 'linear',
    angle: 90,
    center: { x: 0.5, y: 0.5 },
    radius: 0.5,
    stops: [
        { offset: 0, color: '#22a7ff' },
        { offset: 1, color: '#0a60d6' },
    ],
};

export const GRADIENT_PRESETS: { id: string; label: string; stops: GradientStop[] }[] = [
    {
        id: 'ocean',
        label: 'Ocean',
        stops: [
            { offset: 0, color: '#22a7ff' },
            { offset: 1, color: '#0a60d6' },
        ],
    },
    {
        id: 'sunset',
        label: 'Sunset',
        stops: [
            { offset: 0, color: '#ff7f0e' },
            { offset: 1, color: '#e11d48' },
        ],
    },
    {
        id: 'mint',
        label: 'Mint',
        stops: [
            { offset: 0, color: '#34d399' },
            { offset: 1, color: '#0ea5e9' },
        ],
    },
    {
        id: 'violet',
        label: 'Violet',
        stops: [
            { offset: 0, color: '#a855f7' },
            { offset: 1, color: '#6366f1' },
        ],
    },
    {
        id: 'peach',
        label: 'Peach',
        stops: [
            { offset: 0, color: '#fde68a' },
            { offset: 1, color: '#fb7185' },
        ],
    },
    {
        id: 'mono',
        label: 'Mono',
        stops: [
            { offset: 0, color: '#ffffff' },
            { offset: 1, color: '#111827' },
        ],
    },
    {
        id: 'rainbow',
        label: 'Rainbow',
        stops: [
            { offset: 0, color: '#ef4444' },
            { offset: 0.25, color: '#f59e0b' },
            { offset: 0.5, color: '#22c55e' },
            { offset: 0.75, color: '#3b82f6' },
            { offset: 1, color: '#a855f7' },
        ],
    },
];

export const SHADOW_PRESETS: { id: string; label: string; shadow: ShadowStyle }[] = [
    {
        id: 'soft',
        label: 'Soft',
        shadow: { color: '#000000', opacity: 0.2, blur: 12, offsetX: 0, offsetY: 6 },
    },
    {
        id: 'medium',
        label: 'Medium',
        shadow: { color: '#000000', opacity: 0.25, blur: 20, offsetX: 0, offsetY: 10 },
    },
    {
        id: 'strong',
        label: 'Strong',
        shadow: { color: '#000000', opacity: 0.35, blur: 40, offsetX: 0, offsetY: 20 },
    },
    {
        id: 'glow',
        label: 'Glow',
        shadow: { color: '#22a7ff', opacity: 0.8, blur: 24, offsetX: 0, offsetY: 0 },
    },
    {
        id: 'long',
        label: 'Long',
        shadow: { color: '#000000', opacity: 0.3, blur: 0, offsetX: 12, offsetY: 12 },
    },
];

/* ------------------------------- colors -------------------------------- */

const clamp01 = (v: number) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));

/** Any CSS color Fabric understands -> { hex, alpha }. */
export function parseColor(input: unknown): { hex: string; alpha: number } {
    const c = new fabric.Color(typeof input === 'string' && input ? input : '#000000');
    const [r, g, b, a] = c.getSource();
    const hex = `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
    return { hex, alpha: a ?? 1 };
}

export const toRgba = (hex: string, opacity: number) => {
    const { hex: h } = parseColor(hex);
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return `rgba(${n(1)}, ${n(3)}, ${n(5)}, ${Math.round(clamp01(opacity) * 1000) / 1000})`;
};

const mix = (a: string, b: string, t: number) => {
    const pa = parseColor(a).hex;
    const pb = parseColor(b).hex;
    const ch = (s: string, i: number) => parseInt(s.slice(i, i + 2), 16);
    return `#${[1, 3, 5]
        .map((i) =>
            Math.round(ch(pa, i) + (ch(pb, i) - ch(pa, i)) * t)
                .toString(16)
                .padStart(2, '0'),
        )
        .join('')}`;
};

/* ------------------------------- gradient ------------------------------ */

export const sortStops = (stops: GradientStop[]) =>
    [...stops]
        .map((s) => ({ ...s, offset: clamp01(s.offset) }))
        .sort((a, b) => a.offset - b.offset);

export const reverseStops = (stops: GradientStop[]) =>
    sortStops(stops.map((s) => ({ ...s, offset: Math.round((1 - s.offset) * 1000) / 1000 })));

/** Add a stop at `offset`, colored as the gradient looks there. Returns the new list + its index. */
export function insertStop(stops: GradientStop[], offset: number) {
    const sorted = sortStops(stops);
    const at = clamp01(offset);
    const after = sorted.findIndex((s) => s.offset >= at);
    let color: string;
    if (after <= 0) color = sorted[0]?.color ?? '#000000';
    else {
        const a = sorted[after - 1];
        const b = sorted[after];
        color = mix(a.color, b.color, (at - a.offset) / (b.offset - a.offset || 1));
    }
    const next = sortStops([...sorted, { offset: at, color }]);
    return { stops: next, index: next.findIndex((s) => s.offset === at && s.color === color) };
}

/** CSS preview of a gradient (for swatches / the stop bar). */
export const gradientCss = (g: Pick<GradientFill, 'stops'>, angle = 90) =>
    `linear-gradient(${angle + 90}deg, ${sortStops(g.stops)
        .map((s) => `${s.color} ${Math.round(s.offset * 100)}%`)
        .join(', ')})`;

/** Fabric gradient in percentage units (follows the object when it is resized). */
export function toFabricGradient(g: GradientFill) {
    const colorStops = sortStops(g.stops);
    if (g.type === 'linear') {
        const rad = (g.angle * Math.PI) / 180;
        return new fabric.Gradient({
            type: 'linear',
            gradientUnits: 'percentage',
            coords: {
                x1: 0.5 - Math.cos(rad) / 2,
                y1: 0.5 - Math.sin(rad) / 2,
                x2: 0.5 + Math.cos(rad) / 2,
                y2: 0.5 + Math.sin(rad) / 2,
            },
            colorStops,
        });
    }
    return new fabric.Gradient({
        type: 'radial',
        gradientUnits: 'percentage',
        coords: {
            x1: g.center.x,
            y1: g.center.y,
            r1: 0,
            x2: g.center.x,
            y2: g.center.y,
            r2: g.radius,
        },
        colorStops,
    });
}

const isGradient = (v: unknown): v is fabric.Gradient<'linear' | 'radial'> =>
    !!v && typeof v === 'object' && Array.isArray((v as { colorStops?: unknown }).colorStops);

/** What the object's fill is, in an editable shape. */
export function readFill(obj: fabric.FabricObject | null | undefined): FillSnapshot {
    const fill = obj?.fill;
    if (isGradient(fill)) {
        const w = obj?.width || 1;
        const h = obj?.height || 1;
        const px = fill.gradientUnits !== 'percentage';
        const c = fill.coords as { x1: number; y1: number; x2: number; y2: number; r2?: number };
        const fx = (v: number) => (px ? v / w : v);
        const fy = (v: number) => (px ? v / h : v);
        const stops = fill.colorStops.map((s) => ({
            offset: clamp01(s.offset),
            color: parseColor(s.color).hex,
        }));
        const gradient: GradientFill = {
            type: fill.type === 'radial' ? 'radial' : 'linear',
            angle:
                fill.type === 'radial'
                    ? 90
                    : ((Math.atan2(fy(c.y2) - fy(c.y1), fx(c.x2) - fx(c.x1)) * 180) / Math.PI +
                          360) %
                      360,
            // radial geometry only exists on radial fills; a linear fill switched to radial starts centered
            center:
                fill.type === 'radial'
                    ? { x: fx(c.x2 ?? 0.5), y: fy(c.y2 ?? 0.5) }
                    : { x: 0.5, y: 0.5 },
            radius:
                fill.type === 'radial' ? (px ? (c.r2 ?? 0) / Math.max(w, h) : (c.r2 ?? 0.5)) : 0.5,
            stops: sortStops(stops),
        };
        return { kind: gradient.type, gradient };
    }
    if (typeof fill !== 'string' || !fill || fill === 'transparent') return { kind: 'none' };
    const { hex, alpha } = parseColor(fill);
    return alpha === 0 ? { kind: 'none' } : { kind: 'solid', color: hex };
}

/* -------------------------------- shadow -------------------------------- */

export function readShadow(obj: fabric.FabricObject | null | undefined): ShadowStyle | null {
    const s = obj?.shadow as fabric.Shadow | null | undefined;
    if (!s) return null;
    const { hex, alpha } = parseColor(s.color);
    return {
        color: hex,
        opacity: Math.round(alpha * 1000) / 1000,
        blur: Number(s.blur) || 0,
        offsetX: Number(s.offsetX) || 0,
        offsetY: Number(s.offsetY) || 0,
    };
}

export const shadowToFabric = (s: ShadowStyle) =>
    new fabric.Shadow({
        color: toRgba(s.color, s.opacity),
        blur: Math.max(0, s.blur),
        offsetX: s.offsetX,
        offsetY: s.offsetY,
    });
