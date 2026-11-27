/**
 * The outline that cuts a picture or scene to its comic panel (2026-11-27), in the object's own plane (the plane a
 * Fabric `clipPath` is drawn in: the object's centre at 0, 0, before its scale and angle). The Art layer only cut
 * content to all panels together, so a filled scene showed in the neighbouring panels; this cuts it to one.
 * Pure geometry: the store's comicClip.ts reads and sets the Fabric objects.
 */
export interface Pt {
    x: number;
    y: number;
}
/** a 2D affine matrix, Fabric's order [a, b, c, d, e, f] */
export type Mat = [number, number, number, number, number, number];

const apply = (m: Mat, p: Pt): Pt => ({
    x: m[0] * p.x + m[2] * p.y + m[4],
    y: m[1] * p.x + m[3] * p.y + m[5],
});

/** Cut a polygon to the half-plane `inside` (Sutherland–Hodgman, one edge). */
function cut(poly: Pt[], inside: (p: Pt) => number): Pt[] {
    const out: Pt[] = [];
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        const da = inside(a);
        const db = inside(b);
        if (da >= 0) out.push(a);
        if (da >= 0 !== db >= 0) {
            const t = da / (da - db);
            out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        }
    }
    return out;
}

/**
 * The panel's corners (page coordinates) in the object's plane (`toLocal`: page → object plane), cut to the object's
 * own frame when it has one (a scene or character is a frame-sized group whose frame already cuts it: the cut must be
 * both). Null when nothing is left (the object lies outside its panel).
 */
export function panelClipPolygon(
    panel: Pt[],
    toLocal: Mat,
    frame?: { width: number; height: number } | null,
): Pt[] | null {
    let poly = panel.map((p) => apply(toLocal, p));
    if (frame) {
        const w = frame.width / 2;
        const h = frame.height / 2;
        poly = cut(poly, (p) => w - p.x);
        poly = cut(poly, (p) => p.x + w);
        poly = cut(poly, (p) => h - p.y);
        poly = cut(poly, (p) => p.y + h);
    }
    if (poly.length < 3) return null;
    // a sliver (no area) cuts nothing useful
    let area = 0;
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        area += a.x * b.y - b.x * a.y;
    }
    return Math.abs(area) > 1e-6 ? poly : null;
}
