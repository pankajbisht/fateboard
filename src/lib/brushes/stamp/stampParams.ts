/**
 * Stamp brush settings: a stroke is a trail of "dabs", each a copy of the brush tip placed, sized, turned
 * and coloured by these settings (Procreate / Krita / Photoshop brush model). Every library brush
 * (`brushLibrary.ts`) is a partial of `StampParams` on top of `DEFAULT_STAMP`; the Brush settings panel
 * edits a per-brush override. A finished stroke stores its full, resolved settings (`StampStroke`), so later
 * library changes never alter a drawing. Pure.
 */

export const TIP_SHAPES = [
    'round',
    'square',
    'grain',
    'chalk',
    'bristle',
    'hatch',
    'star',
    'spark',
    'splat',
    'leaf',
    'grass',
    'cloud',
    'flame',
    'snow',
    'heart',
    'drop',
    'ring',
] as const;
export type TipShape = (typeof TIP_SHAPES)[number];

export const COLOR_MODES = ['solid', 'fire', 'gradient', 'rainbow'] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

/** How dabs combine inside one stroke ("add" glows: fire, light, neon). */
export const DAB_BLENDS = ['normal', 'add', 'multiply', 'screen'] as const;
export type DabBlend = (typeof DAB_BLENDS)[number];

export interface StampParams {
    /* tip */
    tip: TipShape;
    /** Edge: 0 = soft airbrush falloff, 1 = hard edge. */
    hardness: number;
    /** 0.05 (flat) … 1 (round). */
    roundness: number;
    /** Tip angle, degrees. */
    angle: number;
    /** Random turn, 0 … 1 (× 360°). */
    angleJitter: number;
    /** The tip turns with the stroke direction (flat brushes, calligraphy, speed lines). */
    followStroke: boolean;
    /** Watercolour wet edge: pigment pools at the rim of each dab, 0 … 1. */
    wetEdges: number;

    /* stroke */
    /** Distance between dabs as a fraction of the dab size, 0.02 … 3. */
    spacing: number;
    /** Opacity of one dab, 0.01 … 1 (overlaps build up; the stroke is capped by the brush opacity). */
    flow: number;
    /** Perpendicular random offset, × dab size, 0 … 6. */
    scatter: number;
    /** Dabs per step, 1 … 16. */
    count: number;

    /* dynamics */
    sizeJitter: number;
    opacityJitter: number;
    /** How much stylus pressure changes the size / the opacity, 0 … 1. A mouse is full pressure. */
    pressureSize: number;
    pressureOpacity: number;
    /** Speed changes the size: > 0 fast = thinner (ink), < 0 fast = thicker. -1 … 1. */
    velocitySize: number;
    /** Taper length at the start / end of the stroke in dab sizes, 0 … 20. */
    taperStart: number;
    taperEnd: number;
    /** Size along the stroke: > 0 the trail widens (smoke), < 0 it narrows. -1 … 1. */
    grow: number;
    /** Dabs rise by a random amount, 0 … 1 (smoke, embers, flames). */
    drift: number;
    /** Lightning zigzag: the trail swings across the stroke with sharp turns, 0 … 1 (bolts, cracks). */
    jag: number;

    /* colour */
    colorMode: ColorMode;
    /** Second colour: fire's cool end, the gradient's end. */
    color2: string;
    hueJitter: number;
    lightJitter: number;

    /* texture + render */
    /** Paper grain knocked out of the stroke, 0 … 1. */
    grain: number;
    /** Manga screentone: dot pitch in px (0 = off). */
    screentone: number;
    /** Soft halo around each dab, 0 … 1. */
    glow: number;
    blend: DabBlend;

    /* spray */
    /** Keeps emitting while the pointer is held still (airbrush build-up, spray can). */
    spray: boolean;
    /** Spray dabs per second at full flow, 10 … 2000. */
    sprayRate: number;
    /** Particle size as a fraction of the brush size, 0.005 … 1 (1 = the whole tip). */
    particle: number;
}

export const DEFAULT_STAMP: StampParams = {
    tip: 'round',
    hardness: 0.8,
    roundness: 1,
    angle: 0,
    angleJitter: 0,
    followStroke: false,
    wetEdges: 0,
    spacing: 0.12,
    flow: 1,
    scatter: 0,
    count: 1,
    sizeJitter: 0,
    opacityJitter: 0,
    pressureSize: 0.6,
    pressureOpacity: 0,
    velocitySize: 0,
    taperStart: 0,
    taperEnd: 0,
    grow: 0,
    drift: 0,
    jag: 0,
    colorMode: 'solid',
    color2: '#7a0f00',
    hueJitter: 0,
    lightJitter: 0,
    grain: 0,
    screentone: 0,
    glow: 0,
    blend: 'normal',
    spray: false,
    sprayRate: 300,
    particle: 1,
};

/** Number ranges (UI sliders use the same table). */
export const STAMP_RANGES = {
    hardness: [0, 1],
    roundness: [0.05, 1],
    angle: [0, 360],
    angleJitter: [0, 1],
    wetEdges: [0, 1],
    spacing: [0.02, 3],
    flow: [0.01, 1],
    scatter: [0, 6],
    count: [1, 16],
    sizeJitter: [0, 1],
    opacityJitter: [0, 1],
    pressureSize: [0, 1],
    pressureOpacity: [0, 1],
    velocitySize: [-1, 1],
    taperStart: [0, 20],
    taperEnd: [0, 20],
    grow: [-1, 1],
    drift: [0, 1],
    jag: [0, 1],
    hueJitter: [0, 1],
    lightJitter: [0, 1],
    grain: [0, 1],
    screentone: [0, 24],
    glow: [0, 1],
    sprayRate: [10, 2000],
    particle: [0.005, 1],
} as const satisfies Partial<Record<keyof StampParams, readonly [number, number]>>;

const HEX = /^#[0-9a-f]{6}$/i;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Full, safe settings from any partial input (bad values fall back to `base`). */
export function resolveStamp(
    patch: Partial<StampParams> | null | undefined,
    base: StampParams = DEFAULT_STAMP,
): StampParams {
    const out: StampParams = { ...base };
    if (!patch || typeof patch !== 'object') return out;
    const p = patch as Record<string, unknown>;
    for (const [key, [lo, hi]] of Object.entries(STAMP_RANGES)) {
        const v = Number(p[key]);
        if (p[key] !== undefined && Number.isFinite(v))
            (out as unknown as Record<string, number>)[key] = clamp(v, lo, hi);
    }
    out.count = Math.round(out.count);
    if (TIP_SHAPES.includes(p.tip as TipShape)) out.tip = p.tip as TipShape;
    if (COLOR_MODES.includes(p.colorMode as ColorMode)) out.colorMode = p.colorMode as ColorMode;
    if (DAB_BLENDS.includes(p.blend as DabBlend)) out.blend = p.blend as DabBlend;
    if (typeof p.color2 === 'string' && HEX.test(p.color2)) out.color2 = p.color2.toLowerCase();
    if (typeof p.followStroke === 'boolean') out.followStroke = p.followStroke;
    if (typeof p.spray === 'boolean') out.spray = p.spray;
    return out;
}
