/**
 * Symmetry as 2D affine matrices (Fabric order [a, b, c, d, e, f]) in scene coordinates. Used for the live
 * drawing symmetry (brush slice: each finished stroke gets one copy per matrix) and for "Reflect selection"
 * (Paint tools slice). Pure.
 *
 * Modes: x = mirror left <-> right (vertical axis), y = top <-> bottom (horizontal axis), both = 4-way,
 * angle = mirror across an axis at `angle` degrees, radial = `count`-fold rotation, point = a half turn
 * (point symmetry), kaleido = `count` rotations and `count` mirror axes (a kaleidoscope / mandala).
 */
export type SymmetryMode = 'none' | 'x' | 'y' | 'both' | 'angle' | 'radial' | 'point' | 'kaleido';
export type Matrix = [number, number, number, number, number, number];
type Pt = { x: number; y: number };

export const SYMMETRY_MODES: SymmetryMode[] = [
    'none',
    'x',
    'y',
    'both',
    'angle',
    'radial',
    'point',
    'kaleido',
];
export const SYMMETRY_COUNT = { min: 2, max: 24 } as const;

export const isSymmetryMode = (v: unknown): v is SymmetryMode =>
    SYMMETRY_MODES.includes(v as SymmetryMode);

/** m1 · m2 (apply m2 first). */
export function multiply(m1: Matrix, m2: Matrix): Matrix {
    return [
        m1[0] * m2[0] + m1[2] * m2[1],
        m1[1] * m2[0] + m1[3] * m2[1],
        m1[0] * m2[2] + m1[2] * m2[3],
        m1[1] * m2[2] + m1[3] * m2[3],
        m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
        m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
    ];
}

export const applyToPoint = (m: Matrix, p: Pt): Pt => ({
    x: m[0] * p.x + m[2] * p.y + m[4],
    y: m[1] * p.x + m[3] * p.y + m[5],
});

const about = (c: Pt, m: Matrix): Matrix =>
    multiply(multiply([1, 0, 0, 1, c.x, c.y], m), [1, 0, 0, 1, -c.x, -c.y]);

const clean = (m: Matrix): Matrix => m.map((v) => (Math.abs(v) < 1e-12 ? 0 : v)) as Matrix;

/** Turn by `deg` degrees (clockwise on screen) about `c`. */
export function rotation(c: Pt, deg: number): Matrix {
    const a = (deg * Math.PI) / 180;
    return clean(about(c, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]));
}

/** Mirror across the line through `c` at `deg` degrees from the x axis (0 = horizontal axis). */
export function reflection(c: Pt, deg: number): Matrix {
    const a = (2 * deg * Math.PI) / 180;
    return clean(about(c, [Math.cos(a), Math.sin(a), Math.sin(a), -Math.cos(a), 0, 0]));
}

const countOf = (n: number) =>
    Math.round(Math.min(SYMMETRY_COUNT.max, Math.max(SYMMETRY_COUNT.min, Number(n) || 6)));

/** Every copy's matrix for a mode (the original itself is not included). */
export function symmetryMatrices(mode: SymmetryMode, c: Pt, angle = 90, count = 6): Matrix[] {
    const n = countOf(count);
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
            return Array.from({ length: n - 1 }, (_, k) => rotation(c, ((k + 1) * 360) / n));
        case 'kaleido':
            return [
                ...Array.from({ length: n - 1 }, (_, k) => rotation(c, ((k + 1) * 360) / n)),
                ...Array.from({ length: n }, (_, k) => reflection(c, angle + (k * 180) / n)),
            ];
        default:
            return [];
    }
}

/** Guide lines for a mode: mirror axes (full lines) and rotation spokes, `r` long from the centre. */
export function symmetryGuides(
    mode: SymmetryMode,
    c: Pt,
    angle = 90,
    count = 6,
    r = 1000,
): { a: Pt; b: Pt }[] {
    const ray = (deg: number, from = -r) => {
        const t = (deg * Math.PI) / 180;
        return {
            a: { x: c.x + Math.cos(t) * from, y: c.y + Math.sin(t) * from },
            b: { x: c.x + Math.cos(t) * r, y: c.y + Math.sin(t) * r },
        };
    };
    const n = countOf(count);
    switch (mode) {
        case 'x':
            return [ray(90)];
        case 'y':
            return [ray(0)];
        case 'both':
            return [ray(0), ray(90)];
        case 'angle':
            return [ray(angle)];
        case 'point':
            return [ray(45, -r * 0.03), ray(135, -r * 0.03)].map((l) => ({ a: l.a, b: l.b }));
        case 'radial':
            return Array.from({ length: n }, (_, k) => ray(-90 + (k * 360) / n, 0));
        case 'kaleido':
            return Array.from({ length: n }, (_, k) => ray(angle + (k * 180) / n));
        default:
            return [];
    }
}
