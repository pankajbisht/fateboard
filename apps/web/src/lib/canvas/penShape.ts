/**
 * Pen "Shape" (Inkscape Pen / Pencil "Shape": Triangle in / Triangle out / Ellipse). An open Pen path becomes
 * one closed, filled outline whose thickness follows a profile along its length.
 */
import type { PenNode, PenPoint } from './penPath';

export const PEN_SHAPES = ['none', 'triangle-in', 'triangle-out', 'ellipse'] as const;
export type PenShape = (typeof PEN_SHAPES)[number];

/** Thickness at `t` (0 = start, 1 = end) as a share of the full width. */
export function shapeProfile(shape: PenShape, t: number): number {
    const u = Math.min(1, Math.max(0, t));
    if (shape === 'triangle-in') return u;
    if (shape === 'triangle-out') return 1 - u;
    if (shape === 'ellipse') return Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2));
    return 1;
}

const cubic = (a: number, b: number, c: number, d: number, t: number) => {
    const s = 1 - t;
    return s * s * s * a + 3 * s * s * t * b + 3 * s * t * t * c + t * t * t * d;
};

/** The anchors as a polyline: corners stay, curves are sampled (`steps` per segment). */
export function flattenPenNodes(nodes: readonly PenNode[], steps = 16): PenPoint[] {
    if (!nodes.length) return [];
    const out: PenPoint[] = [{ x: nodes[0].x, y: nodes[0].y }];
    for (let i = 1; i < nodes.length; i++) {
        const a = nodes[i - 1];
        const b = nodes[i];
        if (!a.out && !b.in) {
            out.push({ x: b.x, y: b.y });
            continue;
        }
        const c1 = a.out ?? a;
        const c2 = b.in ?? b;
        for (let k = 1; k <= steps; k++) {
            const t = k / steps;
            out.push({ x: cubic(a.x, c1.x, c2.x, b.x, t), y: cubic(a.y, c1.y, c2.y, b.y, t) });
        }
    }
    return out;
}

/** `count` points evenly spaced by length along the polyline (ends included). */
function resample(pts: PenPoint[], count: number): PenPoint[] {
    const lens = [0];
    for (let i = 1; i < pts.length; i++)
        lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    const total = lens[lens.length - 1];
    const out: PenPoint[] = [];
    let j = 1;
    for (let k = 0; k < count; k++) {
        const at = (total * k) / (count - 1);
        while (j < pts.length - 1 && lens[j] < at) j++;
        const span = lens[j] - lens[j - 1] || 1;
        const f = Math.min(1, Math.max(0, (at - lens[j - 1]) / span));
        out.push({
            x: pts[j - 1].x + (pts[j].x - pts[j - 1].x) * f,
            y: pts[j - 1].y + (pts[j].y - pts[j - 1].y) * f,
        });
    }
    return out;
}

const n = (v: number) => String(Math.round(v * 100) / 100);

/** Closed outline path data for `nodes` drawn with `shape` at full `width`; '' if the path has no length. */
export function shapedOutline(nodes: readonly PenNode[], shape: PenShape, width: number): string {
    const flat = flattenPenNodes(nodes);
    const length = flat.reduce(
        (sum, p, i) => (i ? sum + Math.hypot(p.x - flat[i - 1].x, p.y - flat[i - 1].y) : 0),
        0,
    );
    if (flat.length < 2 || length < 1e-6) return '';
    const pts = resample(flat, Math.min(400, Math.max(48, Math.ceil(length / 4))));
    const left: string[] = [];
    const right: string[] = [];
    pts.forEach((p, i) => {
        const a = pts[Math.max(0, i - 1)];
        const b = pts[Math.min(pts.length - 1, i + 1)];
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const nx = -(b.y - a.y) / len;
        const ny = (b.x - a.x) / len;
        const h = (width / 2) * shapeProfile(shape, i / (pts.length - 1));
        left.push(`${n(p.x + nx * h)} ${n(p.y + ny * h)}`);
        right.push(`${n(p.x - nx * h)} ${n(p.y - ny * h)}`);
    });
    const ring = [...left, ...right.reverse()];
    return `M ${ring[0]} ${ring
        .slice(1)
        .map((p) => `L ${p}`)
        .join(' ')} Z`;
}
