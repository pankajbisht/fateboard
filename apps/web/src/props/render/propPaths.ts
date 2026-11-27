import type { PropData, PropDef } from '../types';
import { makeInk, seedOf } from './ink';

/**
 * A prop as plain path records (the Scene Studio draws these in 3D, docs/PROPS.md §9): the same elements the
 * page's SVG has, each turned into a path `d` in the prop's own pixels (y down, 0,0 top left) plus the
 * transform it sits under. Pure and deterministic. Reads only what the pen (ink.ts) and the catalogue write:
 * path circle ellipse rect polygon polyline line and nested g, with translate / rotate / uniform scale / matrix.
 * Anything else is counted in `skipped` (the catalogue contract test keeps it at 0).
 */

/** SVG matrix(a b c d e f): x' = a·x + c·y + e, y' = b·x + d·y + f. */
export type Affine = [number, number, number, number, number, number];

export interface PropPath {
    d: string;
    /** a colour, or null (an open stroke) */
    fill: string | null;
    stroke: string | null;
    /** in the prop's pixels, before `matrix` */
    strokeWidth: number;
    opacity?: number;
    /** element → prop pixels (a similarity: uniform scale, rotation, translation) */
    matrix: Affine;
}

export interface PropPaths {
    paths: PropPath[];
    /** elements or transforms this reader does not handle */
    skipped: number;
}

export const IDENTITY: Affine = [1, 0, 0, 1, 0, 0];

/** a ∘ b (b first). */
export const compose = (a: Affine, b: Affine): Affine => [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
];

const TAG = /<(\/?)([a-z]+)((?:\s+[a-z-]+="[^"]*")*)\s*(\/?)>/gi;
const ATTR = /([a-z-]+)="([^"]*)"/gi;
const FN = /([a-z]+)\(([^)]*)\)/gi;

const nums = (s: string) => (s.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? []).map(Number);

/** A transform list as one matrix, or null when it is not a similarity this reader keeps exact. */
export function parseTransform(text: string): Affine | null {
    let m = IDENTITY;
    for (const [, name, args] of text.matchAll(FN)) {
        const a = nums(args);
        let t: Affine;
        if (name === 'translate') t = [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0];
        else if (name === 'scale') {
            const sx = a[0] ?? 1;
            if (a.length > 1 && Math.abs(a[1] - sx) > 1e-9) return null;
            if (sx <= 0) return null;
            t = [sx, 0, 0, sx, 0, 0];
        } else if (name === 'rotate') {
            const r = ((a[0] ?? 0) * Math.PI) / 180;
            const cx = a[1] ?? 0;
            const cy = a[2] ?? 0;
            const c = Math.cos(r);
            const s = Math.sin(r);
            t = [c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy];
        } else if (name === 'matrix' && a.length === 6) {
            const [p, q, r, s] = a;
            // a similarity without a mirror: [p q -q p]
            if (Math.abs(p - s) > 1e-6 || Math.abs(q + r) > 1e-6) return null;
            t = a as Affine;
        } else return null;
        m = compose(m, t);
    }
    return m;
}

const f = (v: number) => String(Math.round(v * 100) / 100);

/** An ellipse as two arcs (transformPath keeps arcs exact under a similarity). */
const ellipseD = (cx: number, cy: number, rx: number, ry: number) =>
    `M${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}Z`;

function rectD(x: number, y: number, w: number, h: number, rx: number): string {
    const r = Math.max(0, Math.min(rx, w / 2, h / 2));
    if (!r) return `M${f(x)} ${f(y)}H${f(x + w)}V${f(y + h)}H${f(x)}Z`;
    const a = `${f(r)} ${f(r)} 0 0 1`;
    return (
        `M${f(x + r)} ${f(y)}H${f(x + w - r)}A${a} ${f(x + w)} ${f(y + r)}V${f(y + h - r)}` +
        `A${a} ${f(x + w - r)} ${f(y + h)}H${f(x + r)}A${a} ${f(x)} ${f(y + h - r)}V${f(y + r)}` +
        `A${a} ${f(x + r)} ${f(y)}Z`
    );
}

function pointsD(text: string, close: boolean): string {
    const v = nums(text);
    if (v.length < 4) return '';
    let d = `M${f(v[0])} ${f(v[1])}`;
    for (let i = 2; i + 1 < v.length; i += 2) d += `L${f(v[i])} ${f(v[i + 1])}`;
    return close ? `${d}Z` : d;
}

/** One element's geometry as a path `d` ('' = nothing to draw, null = not a drawing element). */
function geometry(tag: string, a: Record<string, string>): string | null {
    const n = (k: string, d = 0) => {
        const v = Number(a[k]);
        return Number.isFinite(v) ? v : d;
    };
    switch (tag) {
        case 'path':
            return a.d ?? '';
        case 'circle':
            return n('r') > 0 ? ellipseD(n('cx'), n('cy'), n('r'), n('r')) : '';
        case 'ellipse':
            return n('rx') > 0 && n('ry') > 0 ? ellipseD(n('cx'), n('cy'), n('rx'), n('ry')) : '';
        case 'rect':
            return n('width') > 0 && n('height') > 0
                ? rectD(n('x'), n('y'), n('width'), n('height'), n('rx', n('ry')))
                : '';
        case 'polygon':
        case 'polyline':
            return pointsD(a.points ?? '', tag === 'polygon');
        case 'line':
            return `M${f(n('x1'))} ${f(n('y1'))}L${f(n('x2'))} ${f(n('y2'))}`;
        default:
            return null;
    }
}

const colorOf = (v: string | undefined) => (!v || v === 'none' ? null : v);

/** Reads an SVG body (what `def.draw` returns) into path records. */
export function svgBodyPaths(body: string): PropPaths {
    const paths: PropPath[] = [];
    let skipped = 0;
    const stack: { matrix: Affine; opacity: number }[] = [{ matrix: IDENTITY, opacity: 1 }];
    for (const [, close, rawTag, attrText, selfClose] of body.matchAll(TAG)) {
        const tag = rawTag.toLowerCase();
        const top = stack[stack.length - 1];
        if (close) {
            if (tag === 'g' && stack.length > 1) stack.pop();
            continue;
        }
        const a: Record<string, string> = {};
        for (const [, k, v] of attrText.matchAll(ATTR)) a[k.toLowerCase()] = v;
        let matrix = top.matrix;
        if (a.transform) {
            const t = parseTransform(a.transform);
            if (!t) {
                skipped++;
                if (tag === 'g' && !selfClose) stack.push({ matrix, opacity: 0 });
                continue;
            }
            matrix = compose(matrix, t);
        }
        const own = a.opacity !== undefined ? Number(a.opacity) : 1;
        const opacity = top.opacity * (Number.isFinite(own) ? own : 1);
        if (tag === 'g') {
            if (!selfClose) stack.push({ matrix, opacity });
            continue;
        }
        const d = geometry(tag, a);
        if (d === null) {
            skipped++;
            continue;
        }
        if (!d || opacity <= 0) continue;
        const sw = Number(a['stroke-width']);
        const stroke = colorOf(a.stroke);
        paths.push({
            d,
            // SVG paints a missing fill black; the pen always writes one
            fill:
                tag === 'line' || tag === 'polyline'
                    ? colorOf(a.fill)
                    : colorOf(a.fill ?? '#000000'),
            stroke,
            strokeWidth: stroke ? (Number.isFinite(sw) ? sw : 1) : 0,
            ...(opacity < 1 ? { opacity: Math.round(opacity * 1000) / 1000 } : {}),
            matrix,
        });
    }
    return { paths, skipped };
}

/** A catalogue prop drawn with `data` (colours, outline, variant) as path records. */
export function propPaths(def: PropDef, data: PropData): PropPaths {
    const k = makeInk({
        colors: { ...def.colors, ...data.colors },
        ink: data.outline,
        width: data.outlineWidth,
        variant: data.variant,
        seed: seedOf(`${def.id}:${data.variant}`),
    });
    return svgBodyPaths(def.draw(k));
}
