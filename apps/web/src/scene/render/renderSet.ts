import { smoothClosed } from '@/character/render/shapes';
import { darken, lighten, mixColor } from '@/character/render/styles';
import { apply, rotY } from '@/character/rig/math';
import {
    distanceOf,
    project,
    projectPolygon,
    projectSegment,
    scaleAt,
    type P2,
    type View,
} from '../camera/projection';
import type { V3 } from '../schema/types';
import { CARD_SHAPES } from '../sets/cards';
import type { BoxPiece, CardPiece, LinePiece, QuadPiece, SetPiece } from '../sets/types';
import type { WorldLook } from '../world/look';
import { clipRect, clipSegment, polyPath } from './geometry';
import { LAYER, type SceneDrawable, type SortItem } from './types';

/**
 * Set pieces → sortable drawables. True perspective per vertex (straight lines stay straight), one light: faces
 * turned from the sun darken by the look's contrast, far things fade toward the sky (aerial perspective, strong
 * in fog). Everything is clipped to the frame plus a margin so coordinates stay small.
 */
const SHADOW = '#1c1838';
const MARGIN = 60;

interface Ctx {
    v: View;
    look: WorldLook;
    out: SortItem[];
}

const layerOf = (p: SetPiece) => LAYER[p.layer ?? 'mid'];

function haze(ctx: Ctx, color: string, distance: number): string {
    return hazeColor(ctx.look, color, distance);
}

/** Far things fade toward the sky (aerial perspective, strong in fog); props use it too. */
export function hazeColor(look: WorldLook, color: string, distance: number): string {
    const fog = look.weather === 'fog';
    const t = fog
        ? Math.min(0.85, Math.max(0, (distance - 300) / 2500))
        : Math.min(0.55, Math.max(0, (distance - 2500) / 30000));
    return t > 0 ? mixColor(color, look.sky.bottom, t) : color;
}

function lit(ctx: Ctx, color: string, normal: V3, center: V3): string {
    const { v, look } = ctx;
    const c = v.cam.position;
    const toViewer: V3 = v.perspective
        ? [c[0] - center[0], c[1] - center[1], c[2] - center[2]]
        : apply(v.Rt, [0, 0, 1]);
    const facing = normal[0] * toViewer[0] + normal[1] * toViewer[1] + normal[2] * toViewer[2];
    const n: V3 = facing >= 0 ? normal : [-normal[0], -normal[1], -normal[2]];
    const lambert = Math.max(0, n[0] * look.sun[0] + n[1] * look.sun[1] + n[2] * look.sun[2]);
    return mixColor(color, SHADOW, look.contrast * (1 - lambert));
}

function clip(ctx: Ctx, poly: P2[] | null): P2[] | null {
    if (!poly) return null;
    const out = clipRect(poly, -MARGIN, -MARGIN, ctx.v.width + MARGIN, ctx.v.height + MARGIN);
    return out.length >= 3 ? out : null;
}

/** Set lines in frame units at a scale (frame units per cm); props match it. */
export const lineWidth = (s: number) => Math.min(1.4, Math.max(0.3, s));

function normalOf(p: V3[]): V3 {
    const a = p[0];
    const b = p[1];
    const c = p[2];
    const u: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const w: V3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n: V3 = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    const l = Math.hypot(n[0], n[1], n[2]) || 1;
    return [n[0] / l, n[1] / l, n[2] / l];
}

const centerOf = (p: V3[]): V3 => {
    const s = p.reduce<V3>((a, q) => [a[0] + q[0], a[1] + q[1], a[2] + q[2]], [0, 0, 0]);
    return [s[0] / p.length, s[1] / p.length, s[2] / p.length];
};

function facesViewer(v: View, normal: V3, at: V3): boolean {
    const c = v.cam.position;
    const toViewer: V3 = v.perspective
        ? [c[0] - at[0], c[1] - at[1], c[2] - at[2]]
        : apply(v.Rt, [0, 0, 1]);
    return normal[0] * toViewer[0] + normal[1] * toViewer[1] + normal[2] * toViewer[2] > 0;
}

function quad(ctx: Ctx, p: QuadPiece, key: string) {
    const center = centerOf(p.points);
    if (p.cull && !facesViewer(ctx.v, normalOf(p.points), center)) return;
    const poly = clip(ctx, projectPolygon(ctx.v, p.points));
    if (!poly) return;
    const distance = distanceOf(ctx.v, center);
    let color = ctx.look.grade(p.color);
    if (p.shade) color = lit(ctx, color, normalOf(p.points), center);
    color = haze(ctx, color, distance);
    ctx.out.push({
        layer: layerOf(p),
        distance,
        items: [
            {
                key,
                d: polyPath(poly),
                fill: color,
                stroke: p.line ? haze(ctx, ctx.look.grade(p.line), distance) : null,
                strokeWidth: p.line ? lineWidth(scaleAt(ctx.v, center)) : 0,
            },
        ],
    });
}

/** Box faces as [corner indices, outward normal (local)]. */
const FACES: [number[], V3][] = [
    [
        [4, 5, 6, 7],
        [0, 1, 0],
    ],
    [
        [0, 1, 5, 4],
        [0, 0, -1],
    ],
    [
        [2, 3, 7, 6],
        [0, 0, 1],
    ],
    [
        [1, 2, 6, 5],
        [1, 0, 0],
    ],
    [
        [3, 0, 4, 7],
        [-1, 0, 0],
    ],
    [
        [3, 2, 1, 0],
        [0, -1, 0],
    ],
];

function box(ctx: Ctx, p: BoxPiece, key: string) {
    const [w, h, d] = p.size;
    const R = rotY(p.rotY ?? 0);
    const local: V3[] = [
        [-w / 2, 0, -d / 2],
        [w / 2, 0, -d / 2],
        [w / 2, 0, d / 2],
        [-w / 2, 0, d / 2],
    ];
    const corners: V3[] = [];
    for (const y of [0, h])
        for (const q of local) {
            const r = apply(R, [q[0], y, q[2]]);
            corners.push([p.at[0] + r[0], p.at[1] + r[1], p.at[2] + r[2]]);
        }
    const center: V3 = [p.at[0], p.at[1] + h / 2, p.at[2]];
    const distance = distanceOf(ctx.v, center);
    const s = scaleAt(ctx.v, center);
    const base = ctx.look.grade(p.color);
    const top = ctx.look.grade(p.top ?? lighten(p.color, 0.06));
    const c = ctx.v.cam.position;
    const items: SceneDrawable[] = [];
    FACES.forEach(([idx, n], i) => {
        const normal = apply(R, n);
        const pts = idx.map((k) => corners[k]);
        const fc = centerOf(pts);
        const toViewer: V3 = ctx.v.perspective
            ? [c[0] - fc[0], c[1] - fc[1], c[2] - fc[2]]
            : apply(ctx.v.Rt, [0, 0, 1]);
        if (normal[0] * toViewer[0] + normal[1] * toViewer[1] + normal[2] * toViewer[2] <= 0)
            return;
        const poly = clip(ctx, projectPolygon(ctx.v, pts));
        if (!poly) return;
        const color = haze(ctx, lit(ctx, i === 0 ? top : base, normal, fc), distance);
        items.push({
            key: `${key}f${i}`,
            d: polyPath(poly),
            fill: color,
            stroke: p.line === null ? null : haze(ctx, p.line ?? darken(base, 0.45), distance),
            strokeWidth: p.line === null ? 0 : lineWidth(s),
        });
    });
    if (items.length) ctx.out.push({ layer: layerOf(p), distance, items });
}

function card(ctx: Ctx, p: CardPiece, key: string) {
    const shape = CARD_SHAPES[p.shape];
    const foot = project(ctx.v, p.at);
    if (!shape || !foot) return;
    const s = scaleAt(ctx.v, p.at);
    const top = project(ctx.v, [p.at[0], p.at[1] + p.height, p.at[2]]);
    let up: P2 = [0, -1];
    let upScale = s;
    if (top) {
        const ux = top[0] - foot[0];
        const uy = top[1] - foot[1];
        const l = Math.hypot(ux, uy);
        if (l > 1e-6) {
            up = [ux / l, uy / l];
            // seen from above a card flattens, but never to a line
            upScale = Math.max(l / p.height, s * 0.3);
        }
    }
    const right: P2 = [-up[1], up[0]];
    const flip = p.flip ? -1 : 1;
    const toFrame = ([x, y]: [number, number]): P2 => {
        const ax = x * p.width * s * flip;
        const ay = y * p.height * upScale;
        return [foot[0] + right[0] * ax + up[0] * ay, foot[1] + right[1] * ax + up[1] * ay];
    };
    const distance = distanceOf(ctx.v, p.at);
    const color = (i: number, d: string) => p.colors?.[i] ?? d;
    const paths = shape(color, ctx.look);
    const lw = lineWidth(s);
    const items: SceneDrawable[] = paths.map((path, i) => {
        const pts = path.pts.map(toFrame);
        const fill = haze(ctx, ctx.look.grade(path.fill), distance);
        return {
            key: `${key}p${i}`,
            d: path.smooth ? smoothClosed(pts) : polyPath(pts),
            fill,
            stroke: path.bare ? null : haze(ctx, darken(fill, 0.45), distance),
            strokeWidth: path.bare ? 0 : lw,
            ...(path.opacity !== undefined ? { opacity: path.opacity } : {}),
        };
    });
    ctx.out.push({ layer: layerOf(p), distance, items });
}

function line(ctx: Ctx, p: LinePiece, key: string) {
    let d = '';
    for (let i = 0; i + 1 < p.points.length; i++) {
        const seg = projectSegment(ctx.v, p.points[i], p.points[i + 1]);
        const cut =
            seg &&
            clipSegment(
                seg[0],
                seg[1],
                -MARGIN,
                -MARGIN,
                ctx.v.width + MARGIN,
                ctx.v.height + MARGIN,
            );
        if (cut) d += polyPath(cut, false);
    }
    if (!d) return;
    const mid = centerOf(p.points);
    const distance = distanceOf(ctx.v, mid);
    ctx.out.push({
        layer: layerOf(p),
        distance,
        items: [
            {
                key,
                d,
                fill: 'none',
                stroke: haze(ctx, ctx.look.grade(p.color), distance),
                strokeWidth: Math.max(0.3, p.width * scaleAt(ctx.v, mid)),
            },
        ],
    });
}

export function renderSet(v: View, look: WorldLook, pieces: SetPiece[]): SortItem[] {
    const ctx: Ctx = { v, look, out: [] };
    pieces.forEach((p, i) => {
        const key = `set${i}`;
        if (p.kind === 'quad') quad(ctx, p, key);
        else if (p.kind === 'box') box(ctx, p, key);
        else if (p.kind === 'card') card(ctx, p, key);
        else line(ctx, p, key);
    });
    return ctx.out;
}
