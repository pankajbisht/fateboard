/**
 * Symmetry modes as 2D affine matrices (Fabric order [a, b, c, d, e, f]) in scene coordinates. Used for the
 * live drawing symmetry (brush slice: each finished stroke gets one copy per matrix), its ghost preview and
 * guide, and "Reflect selection" (Paint tools slice). Pure. Math: symmetryMath.ts; groups: symmetryGroups.ts.
 *
 * Modes: x = mirror left <-> right (vertical axis), y = top <-> bottom (horizontal axis), both = 4-way,
 * angle = mirror across an axis at `angle` degrees, radial = `count`-fold rotation, point = a half turn,
 * kaleido = `count` rotations and `count` mirror axes (mandala), glide = mirror + slide (footprints),
 * spiral = turn + shrink per copy, wallpaper = a repeating tiling, chain = the Mirror Chain (steps in order),
 * curve = across a bendy path (not affine: no matrices here; store/slices/symmetry/symmetryObjects.ts).
 * Every mode is turned by `options.rotation` (the source's frame: a rotated object, a pin's axis line).
 */
import {
    MAX_COPIES,
    dihedral,
    expandChain,
    finalize,
    glide,
    spiral,
    turns,
    wallpaper,
    wallpaperLattice,
    type ChainStep,
    type WallpaperGroup,
} from './symmetryGroups';
import { direction, inFrame, reflection, rotation, type Matrix, type Pt } from './symmetryMath';

export { multiply, applyToPoint, rotation, reflection } from './symmetryMath';
export type { Matrix } from './symmetryMath';

export type SymmetryMode =
    | 'none'
    | 'x'
    | 'y'
    | 'both'
    | 'angle'
    | 'radial'
    | 'point'
    | 'kaleido'
    | 'glide'
    | 'spiral'
    | 'wallpaper'
    | 'chain'
    | 'curve';

export const SYMMETRY_MODES: SymmetryMode[] = [
    'none',
    'x',
    'y',
    'both',
    'angle',
    'radial',
    'point',
    'kaleido',
    'glide',
    'spiral',
    'wallpaper',
    'chain',
    'curve',
];
export const SYMMETRY_COUNT = { min: 2, max: 64 } as const;

export const isSymmetryMode = (v: unknown): v is SymmetryMode =>
    SYMMETRY_MODES.includes(v as SymmetryMode);

/** Settings of the newer modes and the source frame. All optional; defaults match the panel's. */
export type SymmetryOptions = {
    /** Turns the whole mode about the centre (degrees): the source's angle. */
    rotation?: number;
    /** Glide: distance per footprint (scene px). */
    glideShift?: number;
    /** Spiral: turn per copy (degrees) and size per copy (0.5 – 1.5). */
    spiralTurn?: number;
    spiralScale?: number;
    /** Wallpaper: group, cell size (scene px) and how many cells each way. */
    wallpaper?: WallpaperGroup;
    tileSize?: number;
    tileReach?: number;
    /** Mirror Chain steps, how many times to repeat them, and where pins are. */
    chain?: ChainStep[];
    depth?: number;
    pinCenter?: (pinId: string) => Pt | null;
    /** Copy cap (MAX_COPIES). */
    max?: number;
};

const countOf = (n: number) =>
    Math.round(Math.min(SYMMETRY_COUNT.max, Math.max(SYMMETRY_COUNT.min, Number(n) || 6)));

const stepCenter = (c: Pt, o: SymmetryOptions) => (step: ChainStep) =>
    (step.pinId && o.pinCenter?.(step.pinId)) || c;

/** Every copy's matrix for a mode before the frame turn and the cap. */
function rawMatrices(mode: SymmetryMode, c: Pt, angle: number, n: number, o: SymmetryOptions) {
    switch (mode) {
        case 'x':
            return [reflection(c, 90)];
        case 'y':
            return [reflection(c, 0)];
        case 'both':
            return [reflection(c, 90), reflection(c, 0), rotation(c, 180)];
        case 'angle':
            return [reflection(c, angle)];
        case 'point':
            return [rotation(c, 180)];
        case 'radial':
            return turns(c, n);
        case 'kaleido':
            return dihedral(c, n, angle);
        case 'glide':
            return glide(c, angle, o.glideShift ?? 80, n);
        case 'spiral':
            return spiral(c, o.spiralTurn ?? 30, o.spiralScale ?? 0.9, n);
        case 'wallpaper':
            return wallpaper(o.wallpaper ?? 'p4m', c, o.tileSize ?? 200, o.tileReach ?? 2);
        case 'chain':
            return expandChain(o.chain ?? [], stepCenter(c, o), o.depth ?? 1, o.max ?? MAX_COPIES);
        default:
            return [];
    }
}

/** The copies a mode makes, and how many it wanted before the cap (`wanted > matrices.length` = cut). */
export function symmetryPlan(
    mode: SymmetryMode,
    c: Pt,
    angle = 90,
    count = 6,
    options: SymmetryOptions = {},
): { matrices: Matrix[]; wanted: number } {
    const raw = rawMatrices(mode, c, angle, countOf(count), options);
    const rot = options.rotation ?? 0;
    const turned = rot ? raw.map((m) => inFrame(m, c, rot)) : raw;
    const matrices = finalize(turned, c, options.max ?? MAX_COPIES);
    return { matrices, wanted: Math.max(raw.length, matrices.length) };
}

/** Every copy's matrix for a mode (the original itself is not included). */
export function symmetryMatrices(
    mode: SymmetryMode,
    c: Pt,
    angle = 90,
    count = 6,
    options: SymmetryOptions = {},
): Matrix[] {
    return symmetryPlan(mode, c, angle, count, options).matrices;
}

type Line = { a: Pt; b: Pt };

const ray = (c: Pt, r: number, deg: number, from = -r): Line => {
    const d = direction(deg);
    return {
        a: { x: c.x + d.x * from, y: c.y + d.y * from },
        b: { x: c.x + d.x * r, y: c.y + d.y * r },
    };
};

/** A log spiral through the copies' directions (the spiral mode's guide). */
function spiralGuide(c: Pt, r: number, turn: number, scale: number, n: number): Line[] {
    const out: Line[] = [];
    const r0 = r * 0.12;
    const at = (t: number) => {
        const d = direction(-90 + t * turn);
        const len = r0 * scale ** t;
        return { x: c.x + d.x * len, y: c.y + d.y * len };
    };
    for (let t = 0; t < n - 1; t += 0.125) out.push({ a: at(t), b: at(t + 0.125) });
    return out;
}

/** Lattice lines of a wallpaper group, `reach` cells each way, plus its mirror axes at the centre. */
function wallpaperGuide(group: WallpaperGroup, c: Pt, size: number, reach: number): Line[] {
    const { a, b } = wallpaperLattice(group, Math.max(8, size));
    const r = Math.round(Math.min(8, Math.max(1, reach))) + 0.5;
    const out: Line[] = [];
    const at = (i: number, j: number) => ({
        x: c.x + i * a.x + j * b.x,
        y: c.y + i * a.y + j * b.y,
    });
    for (let k = -r; k <= r; k += 1) {
        out.push({ a: at(k, -r), b: at(k, r) });
        out.push({ a: at(-r, k), b: at(r, k) });
    }
    const half = Math.hypot(a.x, a.y) * 0.5;
    if (group === 'pm') out.push(ray(c, half, 90));
    if (group === 'p4m') [0, 45, 90, 135].forEach((d) => out.push(ray(c, half, d)));
    if (group === 'p6m') [0, 30, 60, 90, 120, 150].forEach((d) => out.push(ray(c, half, d)));
    return out;
}

/** Turns guide lines by `deg` about `c`. */
const turnLines = (lines: Line[], c: Pt, deg: number): Line[] => {
    if (!deg) return lines;
    const m = rotation(c, deg);
    const at = (p: Pt) => ({
        x: m[0] * p.x + m[2] * p.y + m[4],
        y: m[1] * p.x + m[3] * p.y + m[5],
    });
    return lines.map((l) => ({ a: at(l.a), b: at(l.b) }));
};

/** Guide lines for a mode: mirror axes (full lines), rotation spokes, spiral arms, tile grids. */
export function symmetryGuides(
    mode: SymmetryMode,
    c: Pt,
    angle = 90,
    count = 6,
    r = 1000,
    options: SymmetryOptions = {},
): Line[] {
    const n = countOf(count);
    const lines = ((): Line[] => {
        switch (mode) {
            case 'x':
                return [ray(c, r, 90)];
            case 'y':
                return [ray(c, r, 0)];
            case 'both':
                return [ray(c, r, 0), ray(c, r, 90)];
            case 'angle':
            case 'glide':
                return [ray(c, r, angle)];
            case 'point':
                return [ray(c, r, 45, -r * 0.03), ray(c, r, 135, -r * 0.03)];
            case 'radial':
                return Array.from({ length: n }, (_, k) => ray(c, r, -90 + (k * 360) / n, 0));
            case 'kaleido':
                return Array.from({ length: n }, (_, k) => ray(c, r, angle + (k * 180) / n));
            case 'spiral':
                return spiralGuide(c, r, options.spiralTurn ?? 30, options.spiralScale ?? 0.9, n);
            case 'wallpaper':
                return wallpaperGuide(
                    options.wallpaper ?? 'p4m',
                    c,
                    options.tileSize ?? 200,
                    options.tileReach ?? 2,
                );
            case 'chain':
                return (options.chain ?? [])
                    .filter((s) => s.enabled)
                    .flatMap((s) => {
                        const sc = stepCenter(c, options)(s);
                        if (s.kind === 'rotate' || s.kind === 'spiral')
                            return symmetryGuides('radial', sc, 0, s.count, r * 0.25);
                        if (s.kind === 'kaleido')
                            return symmetryGuides('kaleido', sc, s.angle, s.count, r);
                        return [ray(sc, r, s.angle)];
                    });
            default:
                return [];
        }
    })();
    return turnLines(lines, c, options.rotation ?? 0);
}
