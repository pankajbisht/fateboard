/**
 * Pen tool geometry (Figma / Illustrator pen): anchors placed by clicks, with optional bezier handles
 * from a drag. Points are scene coordinates.
 */
export type PenPoint = { x: number; y: number };
export type PenNode = PenPoint & {
    /** handle towards the previous anchor */
    in?: PenPoint;
    /** handle towards the next anchor */
    out?: PenPoint;
};

const n = (v: number) => String(Math.round(v * 100) / 100);
const pt = (p: PenPoint) => `${n(p.x)} ${n(p.y)}`;

/** The handle on the other side of `anchor`, for a smooth point (drag = symmetric handles). */
export const mirrorHandle = (anchor: PenPoint, handle: PenPoint): PenPoint => ({
    x: 2 * anchor.x - handle.x,
    y: 2 * anchor.y - handle.y,
});

/** A segment: a straight line between corners, a cubic curve when either end has a handle. */
const segment = (a: PenNode, b: PenNode) =>
    a.out || b.in ? `C ${pt(a.out ?? a)} ${pt(b.in ?? b)} ${pt(b)}` : `L ${pt(b)}`;

/** SVG path data for the anchors; '' for fewer than two (nothing to draw yet). */
export function penPathData(nodes: readonly PenNode[], closed = false): string {
    if (nodes.length < 2) return '';
    const parts = [`M ${pt(nodes[0])}`];
    for (let i = 1; i < nodes.length; i++) parts.push(segment(nodes[i - 1], nodes[i]));
    if (closed) parts.push(segment(nodes[nodes.length - 1], nodes[0]), 'Z');
    return parts.join(' ');
}

/** Shift: `to` moved onto the nearest `stepDeg` direction from `from`, same distance. */
export function constrainAngle(from: PenPoint, to: PenPoint, stepDeg = 45): PenPoint {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (!len) return { x: to.x, y: to.y };
    const step = (stepDeg * Math.PI) / 180;
    const angle = Math.round(Math.atan2(dy, dx) / step) * step;
    return { x: from.x + Math.cos(angle) * len, y: from.y + Math.sin(angle) * len };
}

type PathCommand = readonly (string | number)[];

/**
 * An open path made of one `M` and `L` / `C` segments (what the Pen draws and the Node tool keeps)
 * back into Pen anchors, each point passed through `map` (object -> scene). Null for anything the
 * Pen cannot continue: closed, several sub-paths, other commands, fewer than two points.
 */
export function pathToPenNodes(
    commands: readonly PathCommand[],
    map: (p: PenPoint) => PenPoint,
): PenNode[] | null {
    const [first, ...rest] = commands;
    if (!first || first[0] !== 'M' || !rest.length) return null;
    const at = (c: PathCommand, i: number) => map({ x: Number(c[i]), y: Number(c[i + 1]) });
    const nodes: PenNode[] = [at(first, 1)];
    for (const c of rest) {
        if (c[0] === 'L') nodes.push(at(c, 1));
        else if (c[0] === 'C') {
            nodes[nodes.length - 1].out = at(c, 1);
            nodes.push({ ...at(c, 5), in: at(c, 3) });
        } else return null;
    }
    return nodes;
}

/** The same path walked the other way (to continue it from its first point). */
export const reversePenNodes = (nodes: readonly PenNode[]): PenNode[] =>
    [...nodes].reverse().map(({ in: inH, out, ...p }) => ({
        ...p,
        ...(out && { in: out }),
        ...(inH && { out: inH }),
    }));

/** A Curvature-mode point: the curve bends smoothly through it unless it is a `corner`. */
export type CurvePoint = PenPoint & { corner?: boolean };

/** Catmull-Rom tangent -> cubic handle length (uniform spline). */
const CR = 1 / 6;

/**
 * Curvature mode (Illustrator's Curvature tool): anchors whose handles are set automatically so
 * the curve passes smoothly through every point. Corners get no handles; an open path has no
 * handle off its two ends.
 */
export function smoothNodes(points: readonly CurvePoint[], closed = false): PenNode[] {
    const n = points.length;
    return points.map((p, i) => {
        const node: PenNode = { x: p.x, y: p.y };
        if (p.corner || n < 2) return node;
        const prev = closed ? points[(i - 1 + n) % n] : points[Math.max(0, i - 1)];
        const next = closed ? points[(i + 1) % n] : points[Math.min(n - 1, i + 1)];
        const t = { x: (next.x - prev.x) * CR, y: (next.y - prev.y) * CR };
        if (closed || i > 0) node.in = { x: p.x - t.x, y: p.y - t.y };
        if (closed || i < n - 1) node.out = { x: p.x + t.x, y: p.y + t.y };
        return node;
    });
}

const offLine = (p: PenPoint, a: PenPoint, b: PenPoint) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (!len) return Math.hypot(p.x - a.x, p.y - a.y);
    return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
};

/**
 * Freeform mode: the few points that keep a hand-drawn stroke's shape within `tolerance`
 * (Ramer–Douglas–Peucker). The ends are always kept.
 */
export function simplifyPoints(points: readonly PenPoint[], tolerance: number): PenPoint[] {
    if (points.length < 3) return [...points];
    const keep = new Array<boolean>(points.length).fill(false);
    keep[0] = keep[points.length - 1] = true;
    const stack: [number, number][] = [[0, points.length - 1]];
    while (stack.length) {
        const [from, to] = stack.pop()!;
        let worst = -1;
        let max = tolerance;
        for (let i = from + 1; i < to; i++) {
            const d = offLine(points[i], points[from], points[to]);
            if (d > max) {
                max = d;
                worst = i;
            }
        }
        if (worst > 0) {
            keep[worst] = true;
            stack.push([from, worst], [worst, to]);
        }
    }
    return points.filter((_, i) => keep[i]);
}
