/**
 * Pencil › Smart shape: recognises a rough freehand line, ellipse / circle, rectangle or triangle and
 * returns clean path commands in the same coordinates, or null to keep the freehand stroke. Pure: no
 * Fabric, no store.
 */
export type Pt = { x: number; y: number };
export type Cmd = (string | number)[];
export type ShapeKind = 'line' | 'circle' | 'ellipse' | 'rect' | 'triangle';

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Distance from p to the segment a-b. */
function segDist(p: Pt, a: Pt, b: Pt): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return dist(p, a);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/** Ramer-Douglas-Peucker on an open polyline. */
function simplify(pts: Pt[], eps: number): Pt[] {
    if (pts.length < 3) return pts;
    let max = 0;
    let at = 0;
    for (let i = 1; i < pts.length - 1; i++) {
        const d = segDist(pts[i], pts[0], pts[pts.length - 1]);
        if (d > max) {
            max = d;
            at = i;
        }
    }
    if (max <= eps) return [pts[0], pts[pts.length - 1]];
    return [...simplify(pts.slice(0, at + 1), eps).slice(0, -1), ...simplify(pts.slice(at), eps)];
}

/** Mean distance of the points to a closed polygon, relative to its size. */
function polygonError(pts: Pt[], poly: Pt[], size: number): number {
    let sum = 0;
    for (const p of pts) {
        let best = Infinity;
        for (let i = 0; i < poly.length; i++)
            best = Math.min(best, segDist(p, poly[i], poly[(i + 1) % poly.length]));
        sum += best;
    }
    return sum / pts.length / size;
}

/** The end point of every path command (M, L, Q, C), in drawing order. */
export function pathPoints(cmds: Cmd[]): Pt[] {
    const out: Pt[] = [];
    for (const c of cmds) {
        if (c.length < 3) continue;
        out.push({ x: Number(c[c.length - 2]), y: Number(c[c.length - 1]) });
    }
    return out;
}

const K = 0.5522847498; // cubic Bézier circle constant

function ellipseCmds(cx: number, cy: number, rx: number, ry: number): Cmd[] {
    const ox = rx * K;
    const oy = ry * K;
    return [
        ['M', cx + rx, cy],
        ['C', cx + rx, cy + oy, cx + ox, cy + ry, cx, cy + ry],
        ['C', cx - ox, cy + ry, cx - rx, cy + oy, cx - rx, cy],
        ['C', cx - rx, cy - oy, cx - ox, cy - ry, cx, cy - ry],
        ['C', cx + ox, cy - ry, cx + rx, cy - oy, cx + rx, cy],
        ['Z'],
    ];
}

const polyCmds = (poly: Pt[]): Cmd[] => [
    ['M', poly[0].x, poly[0].y],
    ...poly.slice(1).map((p): Cmd => ['L', p.x, p.y]),
    ['Z'],
];

/** Recognise the stroke; null = not a clean shape (keep the freehand line). */
export function recognizeShape(points: Pt[]): { kind: ShapeKind; path: Cmd[] } | null {
    if (points.length < 2) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    points.forEach((p) => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    });
    const w = maxX - minX;
    const h = maxY - minY;
    const size = Math.hypot(w, h);
    if (size < 8) return null; // a tap or a tiny scribble

    const first = points[0];
    const last = points[points.length - 1];
    const closed = dist(first, last) < 0.2 * size;

    if (!closed) {
        const chord = dist(first, last);
        const off = Math.max(...points.map((p) => segDist(p, first, last)));
        if (chord > 0.8 * size && off < 0.06 * chord)
            return {
                kind: 'line',
                path: [
                    ['M', first.x, first.y],
                    ['L', last.x, last.y],
                ],
            };
        return null;
    }
    if (Math.min(w, h) < 0.1 * size) return null; // a closed loop with no body

    // corners: simplify the loop, dropping the closing point that repeats the start
    const corners = simplify([...points, first], 0.1 * size).slice(0, -1);
    if (corners.length === 3 && polygonError(points, corners, size) < 0.04)
        return { kind: 'triangle', path: polyCmds(corners) };

    const rect = [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
    ];
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    let rx = w / 2;
    let ry = h / 2;
    // both errors = mean distance to the clean shape / size, so the better fit wins
    const rectErr = corners.length === 4 ? polygonError(points, rect, size) : Infinity;
    const ellErr =
        points.reduce(
            (sum, p) =>
                sum + Math.abs(Math.hypot((p.x - cx) / rx, (p.y - cy) / ry) - 1) * ((rx + ry) / 2),
            0,
        ) /
        points.length /
        size;
    if (rectErr < 0.04 && rectErr <= ellErr) return { kind: 'rect', path: polyCmds(rect) };
    if (ellErr > 0.05) return null;
    const round = Math.abs(rx - ry) / Math.max(rx, ry) < 0.15;
    if (round) rx = ry = (rx + ry) / 2;
    return { kind: round ? 'circle' : 'ellipse', path: ellipseCmds(cx, cy, rx, ry) };
}
