/**
 * Copy spray (Shift + S, Illustrator's Symbol Sprayer): where the copies of the selection land along a drag.
 * A press places one copy; a drag places one every `spacing` × copy size, scattered around the pointer and
 * jittered in size / turn / opacity. Pure and seeded (the caller passes the random source), so tests are exact.
 * The canvas side (snapshot of the selection, live preview, the group it adds) is in
 * store/slices/paintTools/copySprayTool.ts.
 */
import type { Matrix } from './symmetry';

type Pt = { x: number; y: number };

export type CopySprayStyle = {
    /** Copy size, × the selection. */
    scale: number;
    /** Distance between copies along the drag, × the copy size. */
    spacing: number;
    /** Scatter radius around the pointer, × the copy size (0 = on the drag). */
    spread: number;
    /** 0 … 1: each copy's size varies by up to ± this fraction. */
    sizeJitter: number;
    /** 0 … 180: each copy turns by up to ± this many degrees. */
    rotateJitter: number;
    /** 0 … 1: each copy's opacity drops by up to this much. */
    opacityJitter: number;
    /** Turn the copies to follow the drag direction. */
    align: boolean;
};

export const DEFAULT_COPY_SPRAY_STYLE: CopySprayStyle = {
    scale: 1,
    spacing: 1.2,
    spread: 1,
    sizeJitter: 0.3,
    rotateJitter: 20,
    opacityJitter: 0,
    align: false,
};

type NumericKey = Exclude<keyof CopySprayStyle, 'align'>;

export const COPY_SPRAY_LIMITS: Record<NumericKey, { min: number; max: number }> = {
    scale: { min: 0.1, max: 4 },
    spacing: { min: 0.1, max: 5 },
    spread: { min: 0, max: 5 },
    sizeJitter: { min: 0, max: 1 },
    rotateJitter: { min: 0, max: 180 },
    opacityJitter: { min: 0, max: 1 },
};

/** Most objects one drag adds (copies × objects in the selection): keeps a long drag responsive. */
export const MAX_SPRAY_OBJECTS = 400;
/** Most photos one drag adds: every copy of a photo saves the photo again (no shared images in files, BUG-239). */
export const MAX_SPRAY_IMAGES = 30;

/** Copies one drag may place for a selection of `objects` objects, `images` of them photos (at least 1). */
export const sprayDabLimit = (objects: number, images: number): number =>
    Math.max(
        1,
        Math.min(
            Math.floor(MAX_SPRAY_OBJECTS / Math.max(objects, 1)),
            images > 0 ? Math.floor(MAX_SPRAY_IMAGES / images) : Infinity,
        ),
    );

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function sanitizeCopySprayStyle(
    base: CopySprayStyle,
    patch: Partial<Record<keyof CopySprayStyle, unknown>>,
): CopySprayStyle {
    const out = { ...base };
    for (const key of Object.keys(COPY_SPRAY_LIMITS) as NumericKey[]) {
        const v = patch[key];
        if (typeof v === 'number' && Number.isFinite(v))
            out[key] = clamp(v, COPY_SPRAY_LIMITS[key].min, COPY_SPRAY_LIMITS[key].max);
    }
    if (typeof patch.align === 'boolean') out.align = patch.align;
    return out;
}

/** One copy: where its centre lands, its size (× the selection), turn (degrees) and opacity (0 … 1). */
export type SprayDab = { x: number; y: number; scale: number; angle: number; opacity: number };

export type DabEmitter = {
    /** Press: forget the last drag, place one copy at `p`. Returns the new copies. */
    start: (p: Pt) => SprayDab[];
    /** Drag to `p`: the copies placed on the way. */
    move: (p: Pt) => SprayDab[];
    /** Every copy of this drag so far. */
    readonly dabs: SprayDab[];
};

/**
 * @param size the selection's larger side, scene units (copy size = size × scale)
 * @param rnd random numbers in [0, 1) (seeded)
 * @param maxDabs copies this drag may place at most
 */
export function createDabEmitter(
    style: CopySprayStyle,
    size: number,
    rnd: () => number,
    maxDabs: number,
): DabEmitter {
    const dabs: SprayDab[] = [];
    const unit = Math.max(size, 1e-6) * style.scale;
    const step = unit * style.spacing;
    let last: Pt | null = null;
    let carry = 0; // distance dragged since the last copy
    let heading = 0; // degrees, the drag direction

    const emit = (p: Pt, out: SprayDab[]) => {
        if (dabs.length >= maxDabs) return;
        const r = style.spread * unit * Math.sqrt(rnd()); // even over the disc
        const t = 2 * Math.PI * rnd();
        const scale = style.scale * (1 + style.sizeJitter * (2 * rnd() - 1));
        const angle = (style.align ? heading : 0) + style.rotateJitter * (2 * rnd() - 1);
        const dab = {
            x: p.x + r * Math.cos(t),
            y: p.y + r * Math.sin(t),
            scale: Math.max(scale, 0.01),
            angle,
            opacity: 1 - style.opacityJitter * rnd(),
        };
        dabs.push(dab);
        out.push(dab);
    };

    return {
        dabs,
        start: (p) => {
            dabs.length = 0;
            last = p;
            carry = 0;
            heading = 0;
            const out: SprayDab[] = [];
            emit(p, out);
            return out;
        },
        move: (p) => {
            const out: SprayDab[] = [];
            const from = last;
            if (!from) return out;
            const d = Math.hypot(p.x - from.x, p.y - from.y);
            if (d === 0 || dabs.length >= maxDabs) {
                last = p;
                return out;
            }
            heading = (Math.atan2(p.y - from.y, p.x - from.x) * 180) / Math.PI;
            let at = step - carry; // distance along this segment to the next copy
            while (at <= d && dabs.length < maxDabs) {
                const k = at / d;
                emit({ x: from.x + (p.x - from.x) * k, y: from.y + (p.y - from.y) * k }, out);
                at += step;
            }
            carry = d - (at - step);
            last = p;
            return out;
        },
    };
}

/** Moves a copy of the selection (centre `c`) onto the dab: scale and turn about `c`, then move it there. */
export function dabMatrix(d: SprayDab, c: Pt): Matrix {
    const rad = (d.angle * Math.PI) / 180;
    const a = d.scale * Math.cos(rad);
    const b = d.scale * Math.sin(rad);
    return [a, b, -b, a, d.x - (a * c.x - b * c.y), d.y - (b * c.x + a * c.y)];
}
