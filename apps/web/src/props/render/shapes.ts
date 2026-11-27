import { n } from './ink';

/**
 * Path builders shared by props: scalloped blobs (tree crowns, clouds, bushes), stars, tapered blades and
 * streaks. All return SVG path data; `rand` (seeded) adds the hand-drawn wobble.
 */

const ring = (cx: number, cy: number, rx: number, ry: number, a: number) =>
    [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as const;

/** Points around an ellipse from angle a0 to a1 (radians, clockwise on screen), with radius jitter. */
function arcPoints(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    count: number,
    a0: number,
    a1: number,
    wobble: number,
    rand: () => number,
    closed: boolean,
) {
    const pts: (readonly [number, number])[] = [];
    const steps = closed ? count : count - 1;
    for (let i = 0; i < count; i++) {
        const a = a0 + ((a1 - a0) * i) / steps + (closed ? (rand() - 0.5) * 0.25 : 0);
        const k = 1 + (rand() - 0.5) * wobble;
        pts.push(ring(cx, cy, rx * k, ry * k, a));
    }
    return pts;
}

/** Scallops between points: each one an arc bulging outward (clockwise travel, sweep 1). */
function scallops(pts: (readonly [number, number])[], depth: number, close: boolean) {
    let d = `M${n(pts[0][0])} ${n(pts[0][1])}`;
    const last = close ? pts.length : pts.length - 1;
    for (let i = 1; i <= last; i++) {
        const [x0, y0] = pts[i - 1];
        const [x, y] = pts[i % pts.length];
        const chord = Math.hypot(x - x0, y - y0);
        // depth 1.5: half circles (deep bumps); lower = flatter arcs
        const r = Math.max(chord / 2 + 0.1, (chord / 2) * (1 + Math.max(0, 1.5 - depth) * 1.2));
        d += ` A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y)}`;
    }
    return d;
}

/** A closed cloud-like blob (tree crown, round bush, puffy cloud). `depth` 0.3 (flat) … 1.5 (deep bumps). */
export function blob(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    bumps: number,
    rand: () => number,
    depth = 0.8,
) {
    const pts = arcPoints(cx, cy, rx, ry, bumps, -Math.PI / 2, (3 * Math.PI) / 2, 0.12, rand, true);
    return scallops(pts, depth, true) + ' Z';
}

/** A blob with a flat bottom at `baseY` (bush, flat-bottomed cloud, grass mound). */
export function mound(
    cx: number,
    baseY: number,
    rx: number,
    ry: number,
    bumps: number,
    rand: () => number,
    depth = 0.8,
) {
    const pts = arcPoints(cx, baseY, rx, ry, bumps + 1, Math.PI, 2 * Math.PI, 0.1, rand, false);
    pts[0] = [cx - rx, baseY];
    pts[pts.length - 1] = [cx + rx, baseY];
    return scallops(pts, depth, false) + ' Z';
}

/** A star with `points` tips (5 = classic star, 4 = sparkle). */
export function star(
    cx: number,
    cy: number,
    outer: number,
    inner: number,
    points: number,
    rot = 0,
) {
    const out: string[] = [];
    for (let i = 0; i < points * 2; i++) {
        const a = rot - Math.PI / 2 + (i * Math.PI) / points;
        const r = i % 2 ? inner : outer;
        out.push(`${n(cx + Math.cos(a) * r)} ${n(cy + Math.sin(a) * r)}`);
    }
    return `M${out.join(' L')} Z`;
}

/** A tapered blade from a base point toward a tip (grass, petals of spiky flowers). */
export function blade(x: number, y: number, tipX: number, tipY: number, width: number) {
    const dx = tipX - x;
    const dy = tipY - y;
    const len = Math.hypot(dx, dy) || 1;
    const px = (-dy / len) * width;
    const py = (dx / len) * width;
    const mx = x + dx * 0.55;
    const my = y + dy * 0.55;
    return (
        `M${n(x - px)} ${n(y - py)} Q${n(mx - px * 0.6)} ${n(my - py * 0.6)} ${n(tipX)} ${n(tipY)}` +
        ` Q${n(mx + px * 0.6)} ${n(my + py * 0.6)} ${n(x + px)} ${n(y + py)} Z`
    );
}

/** A horizontal streak, thick at the left end and sharp at the right (speed lines, wind, wisps). */
export function streak(x: number, y: number, length: number, thick: number) {
    const t = thick / 2;
    return `M${n(x)} ${n(y - t)} L${n(x + length)} ${n(y)} L${n(x)} ${n(y + t)} Q${n(x - t)} ${n(y)} ${n(x)} ${n(y - t)} Z`;
}

/** A closed polygon from points. */
export const poly = (pts: readonly (readonly [number, number])[]) =>
    `M${pts.map(([x, y]) => `${n(x)} ${n(y)}`).join(' L')} Z`;

/** A closed polygon from a compact "x y x y …" string (keeps long point lists on one line). */
export function pts(list: string) {
    const v = list
        .trim()
        .split(/[\s,]+/)
        .map(Number);
    const out: [number, number][] = [];
    for (let i = 0; i + 1 < v.length; i += 2) out.push([v[i], v[i + 1]]);
    return poly(out);
}

/** An ellipse as path data (for coloured rims and rings drawn with `stroke`). */
export const ellipsePath = (cx: number, cy: number, rx: number, ry: number) =>
    `M${n(cx - rx)} ${n(cy)} a${n(rx)} ${n(ry)} 0 1 0 ${n(rx * 2)} 0 a${n(rx)} ${n(ry)} 0 1 0 ${n(-rx * 2)} 0 Z`;
