/**
 * Lasso selection geometry (pure): which objects a freehand loop picks. "contain" = every outline point of the
 * object is inside the loop; "touch" = the loop and the object overlap at all (an outline point inside the
 * loop, a loop point inside the object's box, or crossing edges).
 */
export type Pt = { x: number; y: number };
export type LassoMode = 'contain' | 'touch';

export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i];
        const b = poly[j];
        if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
            inside = !inside;
    }
    return inside;
}

function cross(o: Pt, a: Pt, b: Pt) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

export function segmentsCross(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
    const d1 = cross(c, d, a);
    const d2 = cross(c, d, b);
    const d3 = cross(a, b, c);
    const d4 = cross(a, b, d);
    return d1 * d2 < 0 && d3 * d4 < 0;
}

/** Drops points closer than `minDist` to the previous kept one (pointer noise). */
export function thinLasso(points: Pt[], minDist = 2): Pt[] {
    const out: Pt[] = [];
    for (const p of points) {
        const last = out[out.length - 1];
        if (!last || Math.hypot(p.x - last.x, p.y - last.y) >= minDist) out.push(p);
    }
    return out;
}

/**
 * Does the loop pick an object? `outline` = points on the object (its path points, or its box corners),
 * `box` = the object's 4 box corners, all in the same (scene) space.
 */
export function lassoPicks(loop: Pt[], outline: Pt[], box: Pt[], mode: LassoMode): boolean {
    if (loop.length < 3 || !outline.length) return false;
    if (mode === 'contain') return outline.every((p) => pointInPolygon(p, loop));
    if (outline.some((p) => pointInPolygon(p, loop))) return true;
    if (loop.some((p) => pointInPolygon(p, box))) return true;
    for (let i = 0; i < loop.length; i++) {
        const a = loop[i];
        const b = loop[(i + 1) % loop.length];
        for (let j = 0; j < box.length; j++)
            if (segmentsCross(a, b, box[j], box[(j + 1) % box.length])) return true;
    }
    return false;
}
