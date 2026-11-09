import * as fabric from 'fabric';

/* -------------------------------------------------------------------------- */
/*  Limits (protect the browser from accidental 100k-object requests)          */
/* -------------------------------------------------------------------------- */
export const LIMITS = {
    maxGridSide: 50, // rows / cols for Repeat Grid
    maxClones: 2000, // total clones per operation
    maxTileSide: 24, // rows / cols inside a pattern tile
    maxTileItems: 400, // objects drawn into one tile
    maxTilePx: 4096, // largest tile bitmap side, in pixels
} as const;

/* -------------------------------------------------------------------------- */
/*  Small helpers                                                              */
/* -------------------------------------------------------------------------- */
export const clampInt = (value: number, min: number, max: number, fallback = min) =>
    Math.min(max, Math.max(min, Math.round(Number.isFinite(value) ? value : fallback)));

const mod = (a: number, n: number) => ((a % n) + n) % n;
const ceilTo = (value: number, multiple: number) => Math.ceil(value / multiple) * multiple;

/** Small deterministic RNG so "random" colours are stable between renders. */
const mulberry32 = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/* -------------------------------------------------------------------------- */
/*  Colour rules                                                               */
/* -------------------------------------------------------------------------- */
export type RuleType =
    | 'none'
    | 'oddEven' // item 1,3,5… vs 2,4,6… (row-major order)
    | 'rowOddEven' // odd rows vs even rows
    | 'colOddEven' // odd columns vs even columns
    | 'checkerboard'
    | 'diagonal' // palette cycles along diagonals
    | 'everyNth' // every Nth item (with offset)
    | 'palette' // palette cycles item by item
    | 'random' // seeded random pick from palette
    | 'custom'; // programmatic only: provide `custom`

export type PaintTarget = 'fill' | 'stroke' | 'both';

export interface CellContext {
    /** 1-based, row-major */
    index: number;
    /** 0-based */
    row: number;
    /** 0-based */
    col: number;
    rows: number;
    cols: number;
    total: number;
}

export interface ColorRule {
    type: RuleType;
    colors: string[];
    applyTo: PaintTarget;
    /** everyNth */
    n?: number;
    /** everyNth */
    offset?: number;
    /** random */
    seed?: number;
    /** type === 'custom': return a colour, or null/undefined to keep the original */
    custom?: (ctx: CellContext) => string | null | undefined;
}

export const DEFAULT_RULE: ColorRule = {
    type: 'none',
    colors: ['#ef4444', '#3b82f6'],
    applyTo: 'fill',
    n: 2,
    offset: 0,
    seed: 1,
};

/** Returns the colour for a cell, or null when the cell should keep its own colour. */
export const resolveRuleColor = (rule: ColorRule | undefined, ctx: CellContext): string | null => {
    if (!rule || rule.type === 'none') return null;
    const { colors } = rule;
    const [a, b] = colors;
    const pick = (cond: boolean) => (cond ? a : b) ?? null;

    switch (rule.type) {
        case 'oddEven':
            return pick(ctx.index % 2 === 1);
        case 'rowOddEven':
            return pick((ctx.row + 1) % 2 === 1);
        case 'colOddEven':
            return pick((ctx.col + 1) % 2 === 1);
        case 'checkerboard':
            return pick((ctx.row + ctx.col) % 2 === 0);
        case 'diagonal':
            return colors.length ? colors[(ctx.row + ctx.col) % colors.length] : null;
        case 'everyNth': {
            const n = Math.max(1, Math.floor(rule.n ?? 2));
            return pick(mod(ctx.index - (rule.offset ?? 0), n) === 0);
        }
        case 'palette':
            return colors.length ? colors[(ctx.index - 1) % colors.length] : null;
        case 'random': {
            if (!colors.length) return null;
            const r = mulberry32((rule.seed ?? 1) * 7919 + ctx.index)();
            return colors[Math.floor(r * colors.length)];
        }
        case 'custom':
            return rule.custom?.(ctx) ?? null;
        default:
            return null;
    }
};

/**
 * A tile only repeats seamlessly when its colour rule "closes" at the tile edge
 * (e.g. a checkerboard needs an even number of rows and columns).
 * This rounds rows/cols up to the nearest size that works.
 */
export const seamlessGrid = (
    rule: ColorRule | undefined,
    rows: number,
    cols: number,
    opts: { stagger?: boolean; enforceRule?: boolean } = {},
) => {
    let r = rows;
    let c = cols;
    if (rule && opts.enforceRule !== false) {
        switch (rule.type) {
            case 'oddEven':
            case 'colOddEven':
                c = ceilTo(c, 2);
                break;
            case 'rowOddEven':
                r = ceilTo(r, 2);
                break;
            case 'checkerboard':
                r = ceilTo(r, 2);
                c = ceilTo(c, 2);
                break;
            case 'diagonal': {
                const m = Math.max(1, rule.colors.length);
                r = ceilTo(r, m);
                c = ceilTo(c, m);
                break;
            }
            case 'palette':
                c = ceilTo(c, Math.max(1, rule.colors.length));
                break;
            case 'everyNth':
                c = ceilTo(c, Math.max(1, Math.floor(rule.n ?? 2)));
                break;
            default:
                break;
        }
    }
    if (opts.stagger) r = ceilTo(r, 2); // brick offset needs an even row count
    return { rows: r, cols: c };
};

/** Paints an object (recursing into groups). Images are skipped. */
export const paintObject = (obj: fabric.Object, color: string, applyTo: PaintTarget) => {
    const visit = (o: fabric.Object) => {
        if (o instanceof fabric.Group) {
            o.getObjects().forEach(visit);
            o.dirty = true;
            return;
        }
        if ((o.type || '').toLowerCase() === 'image') return;
        if (applyTo !== 'stroke') o.set('fill', color);
        if (applyTo !== 'fill') {
            o.set('stroke', color);
            if (!o.strokeWidth) o.set('strokeWidth', 2); // otherwise the stroke is invisible
        }
        o.dirty = true;
    };
    visit(obj);
};

/* -------------------------------------------------------------------------- */
/*  Pattern types                                                              */
/* -------------------------------------------------------------------------- */
export type PresetShape = 'circle' | 'square' | 'triangle' | 'diamond' | 'stripe' | 'plus';

export type PatternSource =
    | { kind: 'object'; object: fabric.Object }
    | { kind: 'preset'; shape: PresetShape; size: number; color: string };

export interface GridOptions {
    rule?: ColorRule;
    /** shift every second row by half a cell (brick layout) */
    stagger?: boolean;
    /** also recolour the original object (cell 1) so the rule is complete */
    colorOriginal?: boolean;
}

export interface CreatePatternOptions {
    name?: string;
    source: PatternSource;
    rows: number;
    cols: number;
    gapX: number;
    gapY: number;
    rule?: ColorRule;
    stagger?: boolean;
    /** round rows/cols so the colour rule repeats cleanly (default true) */
    seamless?: boolean;
    /** tile background colour; omit for transparent */
    background?: string;
    /** bitmap sharpness multiplier 1-4 (default 2) */
    quality?: number;
}

export interface PatternTile {
    dataUrl: string;
    /** logical tile size in canvas units */
    width: number;
    height: number;
    /** bitmap pixels per canvas unit */
    multiplier: number;
    /** rows/cols actually used (may differ from the request when seamless) */
    rows: number;
    cols: number;
    adjusted: boolean;
}

export interface SavedPattern {
    id: string;
    name: string;
    dataUrl: string;
    width: number;
    height: number;
    multiplier: number;
    createdAt: number;
    meta: {
        rows: number;
        cols: number;
        gapX: number;
        gapY: number;
        stagger: boolean;
        background?: string;
        rule?: Omit<ColorRule, 'custom'>;
    };
}

export type PatternTargetKind = 'canvas' | 'selection';

export interface ApplyPatternOptions {
    /** where to paint (default 'selection') */
    target?: PatternTargetKind;
    /** fill or stroke of the selected shapes (canvas always uses background) */
    paint?: 'fill' | 'stroke';
    /** 1 = natural size */
    scale?: number;
    /** degrees */
    angle?: number;
    offsetX?: number;
    offsetY?: number;
    repeat?: 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat';
    /** explicit objects to paint instead of the current selection */
    objects?: fabric.Object[];
}

export interface ClearPatternOptions {
    target?: PatternTargetKind;
    paint?: 'fill' | 'stroke';
    /** colour to restore, default grey fill / no stroke / transparent canvas */
    fallback?: string | null;
    objects?: fabric.Object[];
}

/* -------------------------------------------------------------------------- */
/*  Preset shapes (used when you create a pattern without selecting anything)  */
/* -------------------------------------------------------------------------- */
export const buildPresetShape = (
    shape: PresetShape,
    size: number,
    color: string,
): fabric.Object => {
    const s = Math.max(1, size);
    const common = {
        fill: color,
        originX: 'center' as const,
        originY: 'center' as const,
        left: 0,
        top: 0,
        strokeWidth: 0,
    };
    switch (shape) {
        case 'circle':
            return new fabric.Circle({ ...common, radius: s / 2 });
        case 'square':
            return new fabric.Rect({ ...common, width: s, height: s });
        case 'triangle':
            return new fabric.Triangle({ ...common, width: s, height: s });
        case 'diamond':
            return new fabric.Rect({ ...common, width: s * 0.72, height: s * 0.72, angle: 45 });
        case 'stripe':
            return new fabric.Rect({ ...common, width: s, height: Math.max(1, s / 4) });
        case 'plus': {
            const t = Math.max(1, s / 3);
            return new fabric.Group(
                [
                    new fabric.Rect({ ...common, width: s, height: t }),
                    new fabric.Rect({ ...common, width: t, height: s }),
                ],
                { originX: 'center', originY: 'center' },
            );
        }
        default:
            return new fabric.Circle({ ...common, radius: s / 2 });
    }
};
