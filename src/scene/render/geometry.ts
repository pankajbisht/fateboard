import type { P2 } from '../camera/projection';

/** 2D helpers for the scene renderer (frame units, y down). */
const f = (n: number) => (Math.round(n * 10) / 10).toString();

/** A straight closed (or open) path through points. */
export function polyPath(pts: P2[], closed = true): string {
    if (!pts.length) return '';
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 1; i < pts.length; i++) d += `L${f(pts[i][0])} ${f(pts[i][1])}`;
    return closed ? `${d}Z` : d;
}

/** Clips a polygon to a rectangle (Sutherland–Hodgman): keeps coordinates near the frame. */
export function clipRect(poly: P2[], x0: number, y0: number, x1: number, y1: number): P2[] {
    const edges: [(p: P2) => boolean, (a: P2, b: P2) => P2][] = [
        [(p) => p[0] >= x0, (a, b) => at(a, b, (x0 - a[0]) / (b[0] - a[0]))],
        [(p) => p[0] <= x1, (a, b) => at(a, b, (x1 - a[0]) / (b[0] - a[0]))],
        [(p) => p[1] >= y0, (a, b) => at(a, b, (y0 - a[1]) / (b[1] - a[1]))],
        [(p) => p[1] <= y1, (a, b) => at(a, b, (y1 - a[1]) / (b[1] - a[1]))],
    ];
    let out = poly;
    for (const [inside, cut] of edges) {
        const src = out;
        out = [];
        for (let i = 0; i < src.length; i++) {
            const a = src[i];
            const b = src[(i + 1) % src.length];
            if (inside(a)) out.push(a);
            if (inside(a) !== inside(b)) out.push(cut(a, b));
        }
        if (!out.length) return out;
    }
    return out;
}

/** Clips a segment to a rectangle (Liang–Barsky); null when it misses. */
export function clipSegment(
    a: P2,
    b: P2,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
): [P2, P2] | null {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    let t0 = 0;
    let t1 = 1;
    const sides: [number, number][] = [
        [-dx, a[0] - x0],
        [dx, x1 - a[0]],
        [-dy, a[1] - y0],
        [dy, y1 - a[1]],
    ];
    for (const [p, q] of sides) {
        if (p === 0) {
            if (q < 0) return null;
            continue;
        }
        const r = q / p;
        if (p < 0) t0 = Math.max(t0, r);
        else t1 = Math.min(t1, r);
        if (t0 > t1) return null;
    }
    return [at(a, b, t0), at(a, b, t1)];
}

const at = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** Bounding box of points: [x0, y0, x1, y1]. */
export function bounds(pts: P2[]): [number, number, number, number] {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [x, y] of pts) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
    }
    return [x0, y0, x1, y1];
}
