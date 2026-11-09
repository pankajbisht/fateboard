import * as fabric from 'fabric';

export type BrushType =
    | 'pencil'
    | 'marker'
    | 'ink'
    | 'calligraphy'
    | 'highlighter'
    | 'neon'
    | 'chalk'
    | 'crayon'
    | 'pattern'
    | 'spray'
    | 'airbrush'
    | 'splatter'
    | 'circle'
    | 'eraser';

/** How a brush actually draws. Several brush types share one engine. */
export type BrushEngine =
    | 'pencil' // single smooth stroked Path
    | 'neon' // pencil + light core + colored glow
    | 'ink' // variable-width filled shape (pressure / speed / taper)
    | 'calligraphy' // fixed-angle flat nib, filled shape
    | 'texture' // pencil with a grainy pattern stroke
    | 'pattern'
    | 'spray'
    | 'circle'
    | 'eraser';

export type LineCap = 'round' | 'butt' | 'square';
export type LineJoin = 'round' | 'bevel' | 'miter';
export type LineStyle = 'solid' | 'dashed' | 'dotted' | 'dashdot';
/** x = mirror left<->right, y = mirror top<->bottom, both = 4-way */
export type Symmetry = 'none' | 'x' | 'y' | 'both';
export type EraserMode = 'pixel' | 'stroke';
export type BlendMode = 'source-over' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten';

export interface BrushPreset {
    label: string;
    engine: BrushEngine;
    width: number;
    maxWidth: number;
    opacity: number; // 0..1
    lineCap: LineCap;
    smoothing: number; // 0..10
    blend?: BlendMode;
    texture?: 'chalk' | 'crayon';
    spray?: 'spray' | 'airbrush' | 'splatter';
}

export const BRUSH_ORDER: BrushType[] = [
    'pencil',
    'marker',
    'ink',
    'calligraphy',
    'highlighter',
    'neon',
    'chalk',
    'crayon',
    'pattern',
    'spray',
    'airbrush',
    'splatter',
    'circle',
    'eraser',
];

export const BRUSH_PRESETS: Record<BrushType, BrushPreset> = {
    pencil: {
        label: 'Pen',
        engine: 'pencil',
        width: 4,
        maxWidth: 60,
        opacity: 1,
        lineCap: 'round',
        smoothing: 2,
    },
    marker: {
        label: 'Marker',
        engine: 'pencil',
        width: 14,
        maxWidth: 100,
        opacity: 1,
        lineCap: 'round',
        smoothing: 3,
    },
    ink: {
        label: 'Ink brush',
        engine: 'ink',
        width: 10,
        maxWidth: 60,
        opacity: 1,
        lineCap: 'round',
        smoothing: 3,
    },
    calligraphy: {
        label: 'Calligraphy',
        engine: 'calligraphy',
        width: 12,
        maxWidth: 60,
        opacity: 1,
        lineCap: 'round',
        smoothing: 3,
    },
    highlighter: {
        label: 'Highlighter',
        engine: 'pencil',
        width: 24,
        maxWidth: 100,
        opacity: 0.4,
        lineCap: 'square',
        smoothing: 4,
        blend: 'multiply',
    },
    neon: {
        label: 'Neon',
        engine: 'neon',
        width: 6,
        maxWidth: 40,
        opacity: 1,
        lineCap: 'round',
        smoothing: 3,
    },
    chalk: {
        label: 'Chalk',
        engine: 'texture',
        texture: 'chalk',
        width: 18,
        maxWidth: 100,
        opacity: 0.9,
        lineCap: 'round',
        smoothing: 2,
    },
    crayon: {
        label: 'Crayon',
        engine: 'texture',
        texture: 'crayon',
        width: 14,
        maxWidth: 80,
        opacity: 1,
        lineCap: 'round',
        smoothing: 2,
    },
    pattern: {
        label: 'Pattern',
        engine: 'pattern',
        width: 20,
        maxWidth: 80,
        opacity: 1,
        lineCap: 'round',
        smoothing: 0,
    },
    spray: {
        label: 'Spray',
        engine: 'spray',
        spray: 'spray',
        width: 30,
        maxWidth: 120,
        opacity: 1,
        lineCap: 'round',
        smoothing: 0,
    },
    airbrush: {
        label: 'Airbrush',
        engine: 'spray',
        spray: 'airbrush',
        width: 40,
        maxWidth: 150,
        opacity: 0.8,
        lineCap: 'round',
        smoothing: 0,
    },
    splatter: {
        label: 'Splatter',
        engine: 'spray',
        spray: 'splatter',
        width: 40,
        maxWidth: 120,
        opacity: 1,
        lineCap: 'round',
        smoothing: 0,
    },
    circle: {
        label: 'Dots',
        engine: 'circle',
        width: 20,
        maxWidth: 80,
        opacity: 1,
        lineCap: 'round',
        smoothing: 0,
    },
    eraser: {
        label: 'Eraser',
        engine: 'eraser',
        width: 24,
        maxWidth: 150,
        opacity: 1,
        lineCap: 'round',
        smoothing: 2,
    },
};

export const getPreset = (b: string): BrushPreset =>
    BRUSH_PRESETS[b as BrushType] ?? BRUSH_PRESETS.pencil;
export const getEngine = (b: string): BrushEngine => getPreset(b).engine;

/** Brushes that make one stroked Path -> support caps, joins, dashes, fill, straight lines. */
export const isStrokeBrush = (b: string) =>
    ['pencil', 'neon', 'texture', 'pattern'].includes(getEngine(b));
/** Custom filled-shape brushes (pressure / nib). */
export const isVariableBrush = (b: string) => ['ink', 'calligraphy'].includes(getEngine(b));
/** Brushes whose color carries alpha directly (others get object-level opacity). */
export const usesRgbaColor = (b: string) =>
    ['pencil', 'neon', 'ink', 'calligraphy'].includes(getEngine(b));

export const BLEND_MODES: { value: BlendMode; label: string }[] = [
    { value: 'source-over', label: 'Normal' },
    { value: 'multiply', label: 'Multiply' },
    { value: 'screen', label: 'Screen' },
    { value: 'overlay', label: 'Overlay' },
    { value: 'darken', label: 'Darken' },
    { value: 'lighten', label: 'Lighten' },
];

export const SHADOW_PRESETS: { label: string; values: Record<string, unknown> }[] = [
    { label: 'Off', values: { shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 } },
    {
        label: 'Glow',
        values: {
            shadowBlur: 16,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            shadowMatchColor: true,
            shadowOpacity: 0.9,
        },
    },
    {
        label: 'Soft',
        values: {
            shadowBlur: 8,
            shadowOffsetX: 4,
            shadowOffsetY: 6,
            shadowMatchColor: false,
            brushShadowColor: '#000000',
            shadowOpacity: 0.35,
        },
    },
    {
        label: 'Hard',
        values: {
            shadowBlur: 0,
            shadowOffsetX: 4,
            shadowOffsetY: 4,
            shadowMatchColor: false,
            brushShadowColor: '#000000',
            shadowOpacity: 0.5,
        },
    },
];

export const PALETTE = [
    '#000000',
    '#374151',
    '#ffffff',
    '#78350f',
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#eab308',
    '#84cc16',
    '#22c55e',
    '#14b8a6',
    '#06b6d4',
    '#3b82f6',
    '#6366f1',
    '#a855f7',
    '#ec4899',
];

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Always returns '#rrggbb' (what <input type="color"> requires). */
export function toHex6(color: string): string {
    const c = (color ?? '').trim();
    const m = /^#?([0-9a-f]{3,8})$/i.exec(c);
    if (m) {
        let h = m[1];
        if (h.length === 3 || h.length === 4)
            h = h
                .split('')
                .map((x) => x + x)
                .join('');
        if (h.length === 6 || h.length === 8) return `#${h.slice(0, 6).toLowerCase()}`;
    }
    try {
        return `#${new fabric.Color(c).toHex().toLowerCase()}`;
    } catch {
        return '#000000';
    }
}

export function toRgba(color: string, alpha = 1): string {
    const n = parseInt(toHex6(color).slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${+alpha.toFixed(3)})`;
}

/** Blend a color toward white (used for the bright core of the neon brush). */
export function mixWithWhite(color: string, amount: number): string {
    const n = parseInt(toHex6(color).slice(1), 16);
    const mix = (v: number) => Math.round(v + (255 - v) * clamp(amount, 0, 1));
    const h = (v: number) => mix(v).toString(16).padStart(2, '0');
    return `#${h((n >> 16) & 255)}${h((n >> 8) & 255)}${h(n & 255)}`;
}

/** Ring cursor that matches the real brush size (max 128px browser limit). */
export function buildBrushCursor(size: number, eraser = false): string {
    const d = clamp(Math.round(size), 8, 120);
    const box = d + 4;
    const c = box / 2;
    const r = d / 2;
    const svg =
        `<svg xmlns='http://www.w3.org/2000/svg' width='${box}' height='${box}' viewBox='0 0 ${box} ${box}'>` +
        `<circle cx='${c}' cy='${c}' r='${r}' fill='none' stroke='white' stroke-width='3'/>` +
        `<circle cx='${c}' cy='${c}' r='${r}' fill='none' stroke='black' stroke-width='1'${
            eraser ? " stroke-dasharray='3 2'" : ''
        }/>` +
        `<circle cx='${c}' cy='${c}' r='1' fill='black'/>` +
        `</svg>`;
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") ${c} ${c}, crosshair`;
}

/* ------------------------------------------------------------------ */
/* grainy textures for chalk / crayon (cached per kind + color)        */
/* ------------------------------------------------------------------ */

const textureCache = new Map<string, HTMLCanvasElement>();

export function makeTexture(kind: 'chalk' | 'crayon', color: string, size = 96): HTMLCanvasElement {
    const hex = toHex6(color);
    const key = `${kind}:${hex}`;
    const cached = textureCache.get(key);
    if (cached) return cached;

    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;

    const img = ctx.createImageData(size, size);
    const coverage = kind === 'chalk' ? 0.55 : 0.82;
    // crayon gets faint horizontal streaks, chalk is pure grain
    const rowBias = Array.from({ length: size }, () =>
        kind === 'crayon' ? (Math.random() - 0.5) * 0.35 : 0,
    );

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            const on = Math.random() < clamp(coverage + rowBias[y], 0, 1);
            img.data[i] = r;
            img.data[i + 1] = g;
            img.data[i + 2] = b;
            img.data[i + 3] = on ? 150 + Math.random() * 105 : kind === 'crayon' ? 40 : 0;
        }
    }
    ctx.putImageData(img, 0, 0);

    if (textureCache.size > 30) textureCache.clear();
    textureCache.set(key, c);
    return c;
}

export const DEFAULT_BRUSH_STATE = {
    brush: 'pencil' as BrushType,
    width: 4,
    color: '#000000',
    /** BUG-002: was `opacity` (shared with the selection and the filter slice) */
    brushOpacity: 1,
    smoothing: 2,
    lineCap: 'round' as LineCap,
    lineJoin: 'round' as LineJoin,
    lineStyle: 'solid' as LineStyle,
    blend: 'source-over' as BlendMode,
    taper: 4, // ink brush: 0..10
    nibAngle: 45, // calligraphy: degrees
    // shadow
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    /** BUG-002: was `shadowColor` (shared with the shape shadow colour) */
    brushShadowColor: '#000000',
    shadowOpacity: 0.6,
    shadowMatchColor: true, // glow in the brush color
    // fill for closed / filled shapes
    fillEnabled: false,
    fillColor: '#3b82f6',
    fillOpacity: 0.3,
    // aids
    straightLine: false,
    symmetry: 'none' as Symmetry,
    symmetryCenter: null as { x: number; y: number } | null,
    eraserMode: 'pixel' as EraserMode,
    recentColors: [] as string[],
    cursor: 'crosshair',
};
