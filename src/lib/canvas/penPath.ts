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
