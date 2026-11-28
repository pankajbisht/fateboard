/**
 * 2D affine matrices for symmetry (Fabric order [a, b, c, d, e, f]) in scene coordinates. Pure. Shared by
 * the symmetry modes (symmetry.ts), the groups (symmetryGroups.ts) and the sources (symmetryFrame.ts).
 */
export type Matrix = [number, number, number, number, number, number];
export type Pt = { x: number; y: number };

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

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

export const clean = (m: Matrix): Matrix => m.map((v) => (Math.abs(v) < 1e-12 ? 0 : v)) as Matrix;

/** `m` applied about `c` instead of the origin. */
export const about = (c: Pt, m: Matrix): Matrix =>
    multiply(multiply([1, 0, 0, 1, c.x, c.y], m), [1, 0, 0, 1, -c.x, -c.y]);

export const translation = (dx: number, dy: number): Matrix => [1, 0, 0, 1, dx, dy];

/** Turn by `deg` degrees (clockwise on screen) about `c`, scaled by `s` about `c` (a spiral step). */
export function similarity(c: Pt, deg: number, s = 1): Matrix {
    const a = (deg * Math.PI) / 180;
    const cos = Math.cos(a) * s;
    const sin = Math.sin(a) * s;
    return clean(about(c, [cos, sin, -sin, cos, 0, 0]));
}

/** Turn by `deg` degrees (clockwise on screen) about `c`. */
export const rotation = (c: Pt, deg: number): Matrix => similarity(c, deg, 1);

/** Mirror across the line through `c` at `deg` degrees from the x axis (0 = horizontal axis). */
export function reflection(c: Pt, deg: number): Matrix {
    const a = (2 * deg * Math.PI) / 180;
    return clean(about(c, [Math.cos(a), Math.sin(a), Math.sin(a), -Math.cos(a), 0, 0]));
}

/** Unit vector at `deg` degrees from the x axis. */
export const direction = (deg: number): Pt => ({
    x: Math.cos((deg * Math.PI) / 180),
    y: Math.sin((deg * Math.PI) / 180),
});

/** `m` seen in a frame turned by `deg` about `c` (R · m · R⁻¹): turns a whole mode with its source. */
export function inFrame(m: Matrix, c: Pt, deg: number): Matrix {
    if (!deg) return m;
    return clean(multiply(multiply(rotation(c, deg), m), rotation(c, -deg)));
}

/** Rounded key: two matrices with the same key place a copy in the same spot. */
export const matrixKey = (m: Matrix): string =>
    m.map((v, i) => (i < 4 ? Math.round(v * 1e5) : Math.round(v * 100))).join(',');

export const isIdentity = (m: Matrix): boolean => matrixKey(m) === matrixKey(IDENTITY);

/** Determinant sign < 0 = the copy is mirrored (text reads backwards). */
export const isMirror = (m: Matrix): boolean => m[0] * m[3] - m[1] * m[2] < 0;

/** Uniform scale of a similarity matrix. */
export const scaleOf = (m: Matrix): number => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
