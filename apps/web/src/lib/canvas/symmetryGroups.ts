/**
 * Symmetry groups beyond a single mirror: glide (footprints), spiral (turn + shrink), wallpaper tilings and the
 * Mirror Chain (steps applied in order, each one copying everything made so far). Pure; every function returns
 * the copies' matrices without the identity (the original), nearest first when it has to cut.
 */
import {
    IDENTITY,
    applyToPoint,
    direction,
    isIdentity,
    matrixKey,
    multiply,
    reflection,
    rotation,
    similarity,
    translation,
    type Matrix,
    type Pt,
} from './symmetryMath';

/** Hard cap on copies per action (each copy is a real object): keeps drawing smooth. */
export const MAX_COPIES = 256;
/** From here on the panel warns that drawing may lag. */
export const HEAVY_COPIES = 96;

export type WallpaperGroup = 'p1' | 'p2' | 'pm' | 'p4' | 'p4m' | 'p3' | 'p6' | 'p6m';
export const WALLPAPER_GROUPS: WallpaperGroup[] = [
    'p1',
    'p2',
    'pm',
    'p4',
    'p4m',
    'p3',
    'p6',
    'p6m',
];
export const isWallpaperGroup = (v: unknown): v is WallpaperGroup =>
    WALLPAPER_GROUPS.includes(v as WallpaperGroup);

export type ChainStepKind = 'mirror' | 'rotate' | 'kaleido' | 'spiral' | 'glide' | 'translate';
export const CHAIN_STEP_KINDS: ChainStepKind[] = [
    'mirror',
    'rotate',
    'kaleido',
    'spiral',
    'glide',
    'translate',
];

/**
 * One step of a Mirror Chain. `angle`: mirror axis (mirror / kaleido / glide), turn per copy (spiral) or
 * direction (translate); `count`: copies; `scale`: size factor per copy (spiral, translate); `shift`: distance
 * per copy (glide, translate); `pinId`: centre on a reference pin instead of the main centre.
 */
export type ChainStep = {
    id: string;
    kind: ChainStepKind;
    angle: number;
    count: number;
    scale: number;
    shift: number;
    enabled: boolean;
    pinId?: string | null;
};

const clampInt = (v: number, lo: number, hi: number, d: number) =>
    Math.round(Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : d)));
const clampNum = (v: number, lo: number, hi: number, d: number) =>
    Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : d));

const range = (n: number) => Array.from({ length: n }, (_, k) => k + 1);

/** n-fold turns about c (without the identity). */
export const turns = (c: Pt, n: number): Matrix[] =>
    range(n - 1).map((k) => rotation(c, (k * 360) / n));

/** n-fold turns and n mirrors (a kaleidoscope / dihedral group, without the identity). */
export const dihedral = (c: Pt, n: number, angle: number): Matrix[] => [
    ...turns(c, n),
    ...Array.from({ length: n }, (_, k) => reflection(c, angle + (k * 180) / n)),
];

/** Glide reflection: mirror across the axis, then slide `shift` along it; copy k = glide^k (footprints). */
export function glide(c: Pt, angle: number, shift: number, count: number): Matrix[] {
    const d = direction(angle);
    const g = multiply(translation(d.x * shift, d.y * shift), reflection(c, angle));
    const out: Matrix[] = [];
    let m = IDENTITY;
    for (let k = 1; k < count; k++) {
        m = multiply(g, m);
        out.push(m);
    }
    return out;
}

/** Spiral: copy k turns k · `turn` degrees and scales by scale^k about c (galaxy / seashell). */
export const spiral = (c: Pt, turn: number, scale: number, count: number): Matrix[] =>
    range(count - 1).map((k) => similarity(c, k * turn, scale ** k));

/** Repeat: copy k slides k · shift along `angle` and scales by scale^k (a hall of mirrors when < 1). */
export function repeat(
    c: Pt,
    angle: number,
    shift: number,
    scale: number,
    count: number,
): Matrix[] {
    const d = direction(angle);
    return range(count - 1).map((k) => {
        const s = similarity(c, 0, scale ** k);
        return multiply(translation(d.x * shift * k, d.y * shift * k), s);
    });
}

/** Point group (about c) and lattice of a wallpaper group. Hexagonal lattices for p3 / p6 / p6m. */
function wallpaperParts(group: WallpaperGroup, c: Pt, size: number) {
    const hex = group === 'p3' || group === 'p6' || group === 'p6m';
    const a = { x: size, y: 0 };
    const b = hex ? { x: size / 2, y: (size * Math.sqrt(3)) / 2 } : { x: 0, y: size };
    const point: Record<WallpaperGroup, Matrix[]> = {
        p1: [],
        p2: turns(c, 2),
        pm: [reflection(c, 90)],
        p4: turns(c, 4),
        p4m: dihedral(c, 4, 90),
        p3: turns(c, 3),
        p6: turns(c, 6),
        p6m: dihedral(c, 6, 90),
    };
    return { a, b, point: [IDENTITY, ...point[group]] };
}

/** Wallpaper tiling: the group's point symmetries repeated on its lattice, `reach` cells each way. */
export function wallpaper(group: WallpaperGroup, c: Pt, size: number, reach: number): Matrix[] {
    const s = clampNum(size, 8, 100000, 200);
    const r = clampInt(reach, 1, 8, 2);
    const { a, b, point } = wallpaperParts(group, c, s);
    const out: Matrix[] = [];
    for (let i = -r; i <= r; i++)
        for (let j = -r; j <= r; j++) {
            const t = translation(i * a.x + j * b.x, i * a.y + j * b.y);
            for (const g of point) out.push(multiply(t, g));
        }
    return out.filter((m) => !isIdentity(m));
}

/** Lattice cell vectors of a wallpaper group (for its guide grid). */
export const wallpaperLattice = (group: WallpaperGroup, size: number) => {
    const { a, b } = wallpaperParts(group, { x: 0, y: 0 }, size);
    return { a, b };
};

/** The copies one chain step makes on its own (about its centre). */
export function stepMatrices(step: ChainStep, c: Pt): Matrix[] {
    const n = clampInt(step.count, 2, 64, 2);
    const scale = clampNum(step.scale, 0.05, 2, 1);
    switch (step.kind) {
        case 'mirror':
            return [reflection(c, step.angle)];
        case 'rotate':
            return turns(c, n);
        case 'kaleido':
            return dihedral(c, n, step.angle);
        case 'spiral':
            return spiral(c, step.angle, scale, n);
        case 'glide':
            return glide(c, step.angle, step.shift, n);
        case 'translate':
            return repeat(c, step.angle, step.shift, scale, n);
        default:
            return [];
    }
}

/**
 * Mirror Chain: start from the original; each enabled step copies everything made so far (so a horizontal
 * mirror then a 6-fold turn gives 12 pieces). `depth` repeats the whole chain (infinite mirror). Duplicates are
 * dropped and growth stops at `max` copies.
 */
export function expandChain(
    steps: ChainStep[],
    centerOf: (step: ChainStep) => Pt,
    depth = 1,
    max = MAX_COPIES,
): Matrix[] {
    const seen = new Map<string, Matrix>([[matrixKey(IDENTITY), IDENTITY]]);
    const active = steps.filter((s) => s.enabled);
    const passes = clampInt(depth, 1, 8, 1);
    for (let p = 0; p < passes; p++)
        for (const step of active) {
            const gens = stepMatrices(step, centerOf(step));
            for (const s of [...seen.values()])
                for (const g of gens) {
                    if (seen.size > max) break;
                    const m = multiply(g, s);
                    const key = matrixKey(m);
                    if (!seen.has(key)) seen.set(key, m);
                }
        }
    return [...seen.values()].filter((m) => !isIdentity(m));
}

/** Drops duplicates and the identity; over `max`, keeps the copies nearest to `c`. */
export function finalize(matrices: Matrix[], c: Pt, max = MAX_COPIES): Matrix[] {
    const unique = new Map<string, Matrix>();
    for (const m of matrices) if (!isIdentity(m)) unique.set(matrixKey(m), m);
    const list = [...unique.values()];
    if (list.length <= max) return list;
    const dist = (m: Matrix) => {
        const p = applyToPoint(m, c);
        return Math.hypot(p.x - c.x, p.y - c.y);
    };
    return list
        .map((m, i) => ({ m, i, d: dist(m) }))
        .sort((u, v) => u.d - v.d || u.i - v.i)
        .slice(0, max)
        .map((x) => x.m);
}

/** A new chain step with sensible defaults for its kind. */
export function newChainStep(
    kind: ChainStepKind,
    id = `step-${Math.random().toString(36).slice(2, 10)}`,
): ChainStep {
    const defaults: Record<ChainStepKind, Partial<ChainStep>> = {
        mirror: { angle: 90, count: 2 },
        rotate: { angle: 0, count: 6 },
        kaleido: { angle: 90, count: 6 },
        spiral: { angle: 30, count: 12, scale: 0.9 },
        glide: { angle: 0, count: 6, shift: 80 },
        translate: { angle: 0, count: 5, shift: 120, scale: 0.85 },
    };
    return { id, kind, angle: 0, count: 2, scale: 1, shift: 0, enabled: true, ...defaults[kind] };
}
