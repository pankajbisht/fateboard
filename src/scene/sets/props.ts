import { darken, lighten } from '@/character/render/styles';
import type { V3 } from '../schema/types';
import type { WorldLook } from '../world/look';
import type { Rand } from '../world/random';
import { box, card, line } from './build';
import type { QuadPiece, SetLayer, SetPiece } from './types';

/**
 * Props shared by environments (a desk is a desk in a classroom and an office). All sizes in cm, standing on the
 * ground at (x, z); `rotY` turns them (0 = facing +z, toward the default camera).
 */

/** Rectangles on a vertical face: `axis` 'z' = a face looking along ±z at depth `at`, 'x' = along ±x. */
export function windowGrid(o: {
    axis: 'x' | 'z';
    at: number;
    /** +1: the face looks toward + (z or x) */
    side: 1 | -1;
    from: number;
    to: number;
    y0: number;
    y1: number;
    cols: number;
    rows: number;
    color: string | ((i: number) => string);
    fill?: number;
    layer?: SetLayer;
}): QuadPiece[] {
    const out: QuadPiece[] = [];
    const fill = o.fill ?? 0.55;
    const cw = (o.to - o.from) / o.cols;
    const rh = (o.y1 - o.y0) / o.rows;
    const off = o.at + o.side * 1.5;
    let i = 0;
    for (let r = 0; r < o.rows; r++)
        for (let c = 0; c < o.cols; c++) {
            const a0 = o.from + c * cw + (cw * (1 - fill)) / 2;
            const a1 = a0 + cw * fill;
            const y0 = o.y0 + r * rh + rh * 0.25;
            const y1 = y0 + rh * 0.55;
            const p = (a: number, y: number): V3 => (o.axis === 'z' ? [a, y, off] : [off, y, a]);
            out.push({
                kind: 'quad',
                layer: o.layer ?? 'mid',
                color: typeof o.color === 'string' ? o.color : o.color(i),
                points: [p(a0, y0), p(a1, y0), p(a1, y1), p(a0, y1)],
            });
            i++;
        }
    return out;
}

/** A building with windows on the faces the street sees (`faces`: which sides). */
export function building(
    x: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
    look: WorldLook,
    rand: Rand,
    faces: ('front' | 'back' | 'left' | 'right')[] = ['front'],
    y = 0,
): SetPiece[] {
    const floors = Math.max(1, Math.round(h / 320));
    const glass = (i: number) =>
        look.night ? (rand.chance(0.55) ? '#ffd27a' : '#1d2433') : i % 3 ? '#9fc3e0' : '#b9d4ea';
    const out: SetPiece[] = [box(x, z, w, h, d, color, { y, top: darken(color, 0.15) })];
    const cols = Math.max(1, Math.round(w / 180));
    const deep = Math.max(1, Math.round(d / 180));
    const grid = (axis: 'x' | 'z', at: number, side: 1 | -1, from: number, to: number, n: number) =>
        windowGrid({
            axis,
            at,
            side,
            from,
            to,
            y0: y,
            y1: y + h,
            cols: n,
            rows: floors,
            color: glass,
        });
    if (faces.includes('front')) out.push(...grid('z', z + d / 2, 1, x - w / 2, x + w / 2, cols));
    if (faces.includes('back')) out.push(...grid('z', z - d / 2, -1, x - w / 2, x + w / 2, cols));
    if (faces.includes('right')) out.push(...grid('x', x + w / 2, 1, z - d / 2, z + d / 2, deep));
    if (faces.includes('left')) out.push(...grid('x', x - w / 2, -1, z - d / 2, z + d / 2, deep));
    return out;
}

/** A school desk with its chair behind it. */
export const desk = (x: number, z: number, color = '#9b6b43'): SetPiece[] => [
    box(x, z, 110, 72, 55, color, { top: lighten(color, 0.12) }),
    box(x, z - 55, 42, 44, 40, darken(color, 0.15)),
    box(x, z - 75, 42, 46, 6, darken(color, 0.15), { y: 44 }),
];

export const bench = (x: number, z: number, rotY = 0, color = '#8a5a34'): SetPiece[] => [
    box(x, z, 160, 8, 42, color, { y: 40, rotY }),
    box(x, z, 160, 40, 6, darken(color, 0.1), { y: 48, rotY }),
    box(x, z, 150, 40, 30, darken(color, 0.35), { rotY }),
];

/** A car seen as two boxes (body + cabin); `rotY` 90 = parked along the x axis. */
export function car(x: number, z: number, rotY: number, color: string): SetPiece[] {
    return [
        box(x, z, 175, 70, 420, color, { y: 25, rotY }),
        box(x, z, 160, 55, 220, lighten('#3a4a5c', 0.1), { y: 95, rotY }),
        box(x, z, 170, 25, 380, '#202226', { rotY }),
    ];
}

/** A market stall: a table, a striped awning on poles. */
export function stall(x: number, z: number, color: string, look: WorldLook): SetPiece[] {
    const top = 230;
    return [
        box(x, z, 220, 85, 90, '#8a5a34', { top: '#b98a5a' }),
        box(x - 30, z + 5, 50, 22, 40, '#d9534f', { y: 85 }),
        box(x + 40, z, 60, 18, 45, '#f0ad4e', { y: 85 }),
        line(
            [
                [x - 105, 0, z - 40],
                [x - 105, top, z - 40],
            ],
            '#5b4636',
            5,
        ),
        line(
            [
                [x + 105, 0, z - 40],
                [x + 105, top, z - 40],
            ],
            '#5b4636',
            5,
        ),
        {
            kind: 'quad',
            color: look.night ? lighten(color, 0.1) : color,
            shade: true,
            line: darken(color, 0.4),
            points: [
                [x - 125, top, z - 60],
                [x + 125, top, z - 60],
                [x + 125, top - 45, z + 75],
                [x - 125, top - 45, z + 75],
            ],
        },
    ];
}

/** `n` steps rising toward -z from the front edge at z (width w, each `rise` high and `run` deep). */
export function steps(
    x: number,
    z: number,
    w: number,
    n: number,
    rise: number,
    run: number,
    color: string,
): SetPiece[] {
    return Array.from({ length: n }, (_, i) =>
        box(
            x,
            z - run * (i + 0.5) - (run * (n - i - 1)) / 2,
            w,
            rise * (i + 1),
            run * (n - i),
            color,
            {
                top: lighten(color, 0.08),
                layer: 'back',
            },
        ),
    ).reverse();
}

const TREES = ['tree-round', 'tree-round', 'tree-pine', 'bush'] as const;

/** A tree of a random kind and size (palms in hot places). */
export function tree(rand: Rand, x: number, z: number, kinds: readonly string[] = TREES): SetPiece {
    const kind = rand.pick(kinds);
    const h =
        kind === 'bush'
            ? rand.range(70, 130)
            : kind === 'fern'
              ? rand.range(60, 120)
              : rand.range(380, 700);
    const w =
        kind === 'tree-pine' ? h * 0.5 : kind === 'bush' || kind === 'fern' ? h * 1.4 : h * 0.75;
    return card(kind, x, z, w, h, undefined, { flip: rand.chance(0.5) });
}

/** A lamp post (it glows at night). */
export const lamp = (x: number, z: number) => card('lamp', x, z, 60, 420);
