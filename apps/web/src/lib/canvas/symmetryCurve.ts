/**
 * Curve axis: mirror across a bendy line (a polyline sampled from a path). A point is reflected through the
 * nearest point of the curve along the curve's normal there, so copies flow along the curve. Not affine:
 * strokes are re-built point by point; other objects get the local mirror at their centre. Pure.
 */
import type { Pt } from './symmetryMath';

export type CurveHit = { q: Pt; /** tangent angle (degrees) */ angle: number; dist: number };

/** Nearest point on a polyline, with the tangent angle there. */
export function nearestOnPolyline(p: Pt, poly: Pt[]): CurveHit | null {
    if (poly.length < 2) return null;
    let best: CurveHit | null = null;
    for (let i = 0; i < poly.length - 1; i++) {
        const a = poly[i];
        const b = poly[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len2 = dx * dx + dy * dy;
        if (!len2) continue;
        const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
        const q = { x: a.x + dx * t, y: a.y + dy * t };
        const dist = Math.hypot(p.x - q.x, p.y - q.y);
        if (!best || dist < best.dist)
            best = { q, angle: (Math.atan2(dy, dx) * 180) / Math.PI, dist };
    }
    return best;
}

/** `p` mirrored across the curve (through its nearest point, along the normal). */
export function reflectAcrossCurve(p: Pt, poly: Pt[]): Pt {
    const hit = nearestOnPolyline(p, poly);
    if (!hit) return p;
    const a = (hit.angle * Math.PI) / 180;
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    const d = (p.x - hit.q.x) * nx + (p.y - hit.q.y) * ny;
    return { x: p.x - 2 * d * nx, y: p.y - 2 * d * ny };
}

/** Points closer than `minStep` to the previous one are dropped (keeps re-built strokes light). */
export function thin(points: Pt[], minStep: number): Pt[] {
    const out: Pt[] = [];
    for (const p of points) {
        const last = out[out.length - 1];
        if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= minStep) out.push(p);
    }
    const end = points[points.length - 1];
    if (end && out[out.length - 1] !== end) out.push(end);
    return out;
}

/** SVG path data of a polyline. */
export const polylineData = (points: Pt[]): string =>
    points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
