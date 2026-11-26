/**
 * 2D shape primitives for the 2.5D renderer, all returning SVG path data in screen units:
 *  - a tapered capsule between two projected joints (limbs: foreshortening comes for free);
 *  - the convex hull of projected 3D sample points, drawn as a smooth blob (torso, head, hair, skirt);
 *  - small ellipses and strokes for face features.
 */
export type P2 = [number, number];

export const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
const pt = (p: P2) => `${fmt(p[0])} ${fmt(p[1])}`;

export function circle(c: P2, r: number): string {
    return `M${fmt(c[0] - r)} ${fmt(c[1])}a${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(2 * r)} 0a${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(-2 * r)} 0Z`;
}

/** Ellipse rotated by `deg` (two half arcs). */
export function ellipse(c: P2, rx: number, ry: number, deg = 0): string {
    const a = (deg * Math.PI) / 180;
    const dx = Math.cos(a) * rx;
    const dy = Math.sin(a) * rx;
    const p1: P2 = [c[0] - dx, c[1] - dy];
    const p2: P2 = [c[0] + dx, c[1] + dy];
    const r = `${fmt(rx)} ${fmt(ry)} ${fmt(deg)}`;
    return `M${pt(p1)}A${r} 1 0 ${pt(p2)}A${r} 1 0 ${pt(p1)}Z`;
}

/**
 * A capsule from `a` (radius ra) to `b` (radius rb). Seen end-on (shorter than the radii), it is a circle,
 * which is what a limb pointing at the camera looks like.
 */
export function capsule(a: P2, ra: number, b: P2, rb: number): string {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy);
    if (l <= Math.abs(ra - rb) + 0.01)
        return circle(l < 1e-6 ? a : ra >= rb ? a : b, Math.max(ra, rb));
    const ux = dx / l;
    const uy = dy / l;
    // tangent angle for unequal radii
    const s = (ra - rb) / l;
    const c = Math.sqrt(Math.max(0, 1 - s * s));
    const nx = -uy * c + ux * s;
    const ny = ux * c + uy * s;
    const mx = uy * c + ux * s;
    const my = -ux * c + uy * s;
    const a1: P2 = [a[0] + nx * ra, a[1] + ny * ra];
    const b1: P2 = [b[0] + nx * rb, b[1] + ny * rb];
    const b2: P2 = [b[0] + mx * rb, b[1] + my * rb];
    const a2: P2 = [a[0] + mx * ra, a[1] + my * ra];
    // the end with the smaller radius turns less than half a circle, the bigger one more
    const bigB = s < 0 ? 1 : 0;
    const bigA = s > 0 ? 1 : 0;
    return `M${pt(a1)}L${pt(b1)}A${fmt(rb)} ${fmt(rb)} 0 ${bigB} 0 ${pt(b2)}L${pt(a2)}A${fmt(ra)} ${fmt(ra)} 0 ${bigA} 0 ${pt(a1)}Z`;
}

/** Convex hull, counter-clockwise (monotone chain). */
export function hull(points: P2[]): P2[] {
    const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3) return p;
    const cross = (o: P2, a: P2, b: P2) =>
        (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower: P2[] = [];
    for (const q of p) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0)
            lower.pop();
        lower.push(q);
    }
    const upper: P2[] = [];
    for (let i = p.length - 1; i >= 0; i--) {
        const q = p[i];
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0)
            upper.pop();
        upper.push(q);
    }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** A smooth closed outline through any polygon (convex or not): corners rounded via mid-edge quadratics. */
export function smoothClosed(h: P2[]): string {
    if (h.length < 3) return h.length ? circle(h[0], 1) : '';
    const mid = (a: P2, b: P2): P2 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let d = `M${pt(mid(h[h.length - 1], h[0]))}`;
    for (let i = 0; i < h.length; i++) d += `Q${pt(h[i])} ${pt(mid(h[i], h[(i + 1) % h.length]))}`;
    return `${d}Z`;
}

/**
 * The outline `smoothClosed(h)` draws, as a polygon (each corner curve sampled `steps` times). For a convex `h`
 * every sample lies on the drawn curve and the chords inside it, so shading cut from this stays inside.
 */
export function smoothPoly(h: P2[], steps = 4): P2[] {
    if (h.length < 3) return [...h];
    const out: P2[] = [];
    const mid = (a: P2, b: P2): P2 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    for (let i = 0; i < h.length; i++) {
        const p0 = mid(h[(i - 1 + h.length) % h.length], h[i]);
        const c = h[i];
        const p1 = mid(h[i], h[(i + 1) % h.length]);
        for (let k = 0; k < steps; k++) {
            const t = k / steps;
            const u = 1 - t;
            out.push([
                u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0],
                u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1],
            ]);
        }
    }
    return out;
}

/** A smooth closed shape around the points: the hull, its corners rounded (quadratic curves via mid-edges). */
export const blob = (points: P2[]): string => smoothClosed(hull(points));

/** A tapered capsule as a convex polygon (the hull of its two end circles), for shading. */
export function capsulePoly(a: P2, ra: number, b: P2, rb: number, n = 16): P2[] {
    const pts: P2[] = [];
    for (let i = 0; i < n; i++) {
        const t = (i / n) * Math.PI * 2;
        pts.push([a[0] + Math.cos(t) * ra, a[1] + Math.sin(t) * ra]);
        pts.push([b[0] + Math.cos(t) * rb, b[1] + Math.sin(t) * rb]);
    }
    return hull(pts);
}

const cross2 = (o: P2, a: P2, b: P2) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

/** Inside (or on the edge of) a convex polygon, whichever way round it goes. */
export function insideConvex(poly: P2[], p: P2, eps = 1e-9): boolean {
    let pos = false;
    let neg = false;
    for (let i = 0; i < poly.length; i++) {
        const c = cross2(poly[i], poly[(i + 1) % poly.length], p);
        if (c > eps) pos = true;
        else if (c < -eps) neg = true;
        if (pos && neg) return false;
    }
    return true;
}

/** Where segment a → b crosses the polygon's outline (the first crossing from a). */
function crossing(a: P2, b: P2, poly: P2[]): P2 {
    let best: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let bestT = Infinity;
    for (let i = 0; i < poly.length; i++) {
        const c = poly[i];
        const d = poly[(i + 1) % poly.length];
        const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
        if (Math.abs(den) < 1e-12) continue;
        const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den;
        const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den;
        if (t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9 && t < bestT) {
            bestT = t;
            best = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
        }
    }
    return best;
}

/** Every point where segment a → b crosses the polygon's outline, from a to b (touches counted once). */
function crossings(a: P2, b: P2, poly: P2[]): P2[] {
    const hits: { t: number; p: P2 }[] = [];
    for (let i = 0; i < poly.length; i++) {
        const c = poly[i];
        const d = poly[(i + 1) % poly.length];
        const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
        if (Math.abs(den) < 1e-12) continue;
        const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den;
        const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den;
        if (t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9)
            hits.push({ t, p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] });
    }
    hits.sort((x, y) => x.t - y.t);
    return hits.filter((h, i) => i === 0 || h.t - hits[i - 1].t > 1e-9).map((h) => h.p);
}

/** The longest run of indices where `flag` is true, in polygon order (it may wrap past the end). */
function run<T>(list: T[], flag: boolean[]): T[] {
    const n = list.length;
    const start = flag.findIndex((f, i) => f && !flag[(i - 1 + n) % n]);
    if (start < 0) return flag[0] ? [...list] : [];
    const out: T[] = [];
    for (let k = 0; k < n && flag[(start + k) % n]; k++) out.push(list[(start + k) % n]);
    return out;
}

/**
 * The part of a convex polygon `S` that its copy shifted by `t` does not cover: a crescent on the side away
 * from `t`, always inside `S`. With `t` pointing toward the light it is the shadow side; null when nothing
 * is left, `S` itself when the copy misses it.
 */
export function crescent(S: P2[], t: P2): P2[] | null {
    const n = S.length;
    if (n < 3 || Math.hypot(t[0], t[1]) < 1e-9) return null;
    const T = S.map(([x, y]) => [x + t[0], y + t[1]] as P2);
    const dark = S.map((p) => !insideConvex(T, p));
    if (!dark.some(Boolean)) return null;
    const inner = run(
        T,
        T.map((p) => insideConvex(S, p, 1e-6)),
    ).reverse();
    if (dark.every(Boolean)) {
        // no corner of S is lit: the copy misses S, or it pokes in through one edge (a coarse shape)
        for (let i = 0; i < n; i++) {
            const hits = crossings(S[i], S[(i + 1) % n], T);
            if (hits.length < 2) continue;
            const loop = Array.from({ length: n }, (_, k) => S[(i + 1 + k) % n]);
            return dedupe([hits[hits.length - 1], ...loop, hits[0], ...inner]);
        }
        return [...S];
    }
    const first = dark.findIndex((f, i) => f && !dark[(i - 1 + n) % n]);
    const darkRun = run(S, dark);
    const last = (first + darkRun.length - 1) % n;
    const entry = crossing(S[(first - 1 + n) % n], S[first], T);
    const exit = crossing(S[last], S[(last + 1) % n], T);
    return dedupe([entry, ...darkRun, exit, ...inner]);
}

function dedupe(points: P2[]): P2[] | null {
    const out: P2[] = [];
    for (const p of points) {
        const prev = out[out.length - 1];
        if (!prev || Math.hypot(p[0] - prev[0], p[1] - prev[1]) > 1e-9) out.push(p);
    }
    if (
        out.length > 1 &&
        Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= 1e-9
    )
        out.pop();
    return out.length >= 3 ? out : null;
}

/** An open stroke through points (brows, closed mouths). */
export const polyline = (points: P2[]) => points.map((p, i) => `${i ? 'L' : 'M'}${pt(p)}`).join('');

/** A closed lens between corners `a` and `b`, through `top` and `bottom` (an open mouth). */
export function lens(a: P2, top: P2, bottom: P2, b: P2): string {
    const ct: P2 = [2 * top[0] - (a[0] + b[0]) / 2, 2 * top[1] - (a[1] + b[1]) / 2];
    const cb: P2 = [2 * bottom[0] - (a[0] + b[0]) / 2, 2 * bottom[1] - (a[1] + b[1]) / 2];
    return `M${pt(a)}Q${pt(ct)} ${pt(b)}Q${pt(cb)} ${pt(a)}Z`;
}

/** A curve through three points (smile / frown): quadratic with the middle as its peak. */
export function curve3(a: P2, m: P2, b: P2): string {
    const c: P2 = [2 * m[0] - (a[0] + b[0]) / 2, 2 * m[1] - (a[1] + b[1]) / 2];
    return `M${pt(a)}Q${pt(c)} ${pt(b)}`;
}

/**
 * Corner cutting (two passes): a polyline smoothed toward the same quadratic curve `smoothClosed` / `smoothOpen` draw
 * through it, so ink drawn along the points follows the smoothed fill instead of reaching each corner.
 */
export function chaikin(p: P2[], passes = 2): P2[] {
    let q = p;
    for (let k = 0; k < passes && q.length > 2; k++) {
        const r: P2[] = [q[0]];
        for (let i = 0; i < q.length - 1; i++) {
            const [a, b] = [q[i], q[i + 1]];
            r.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
            r.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
        }
        r.push(q[q.length - 1]);
        q = r;
    }
    return q;
}
