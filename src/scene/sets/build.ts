import type { V3 } from '../schema/types';
import type { Rand } from '../world/random';
import type { BoxPiece, CardPiece, LinePiece, QuadPiece, SetLayer, SetPiece } from './types';

/** Small builders so an environment file reads like a description of the place. All sizes in cm. */

/** The ground: a large flat square at y = 0. */
export const ground = (color: string, half = 8000, cx = 0, cz = 0): QuadPiece => ({
    kind: 'quad',
    layer: 'ground',
    color,
    points: [
        [cx - half, 0, cz - half],
        [cx + half, 0, cz - half],
        [cx + half, 0, cz + half],
        [cx - half, 0, cz + half],
    ],
});

/** A flat patch lying on the ground (road, path, rug, water, court lines); `y` lifts it above other patches. */
export const patch = (
    x0: number,
    z0: number,
    x1: number,
    z1: number,
    color: string,
    y = 0.5,
): QuadPiece => ({
    kind: 'quad',
    layer: 'ground',
    color,
    points: [
        [x0, y, z0],
        [x1, y, z0],
        [x1, y, z1],
        [x0, y, z1],
    ],
});

/** A vertical wall from a to b ([x, z]), `y0` to `y0 + h`. */
export const wall = (
    a: [number, number],
    b: [number, number],
    h: number,
    color: string,
    layer: SetLayer = 'back',
    y0 = 0,
): QuadPiece => ({
    kind: 'quad',
    layer,
    color,
    shade: true,
    points: [
        [a[0], y0, a[1]],
        [b[0], y0, b[1]],
        [b[0], y0 + h, b[1]],
        [a[0], y0 + h, a[1]],
    ],
});

/** A flat rectangle on a wall facing +z (blackboard, window, poster), centred at (x, y) at depth z. */
export const panel = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    color: string,
    line: string | null = null,
): QuadPiece => ({
    kind: 'quad',
    layer: 'back',
    color,
    line,
    points: [
        [x - w / 2, y - h / 2, z],
        [x + w / 2, y - h / 2, z],
        [x + w / 2, y + h / 2, z],
        [x - w / 2, y + h / 2, z],
    ],
});

/**
 * A room shell: floor, four walls and a ceiling, centred on x = 0, from z = back to z = front. Walls and
 * ceiling face inward and cull, so from outside the near ones open up (dollhouse view).
 */
export function room(o: {
    width: number;
    back: number;
    front: number;
    height: number;
    wall: string;
    floor: string;
    ceiling: string;
}): SetPiece[] {
    const x0 = -o.width / 2;
    const x1 = o.width / 2;
    return [
        {
            ...ground(o.floor, 0),
            points: [
                [x0, 0, o.back],
                [x1, 0, o.back],
                [x1, 0, o.front],
                [x0, 0, o.front],
            ],
        },
        { ...wall([x0, o.back], [x1, o.back], o.height, o.wall), cull: true },
        { ...wall([x0, o.front], [x0, o.back], o.height, o.wall), cull: true },
        { ...wall([x1, o.back], [x1, o.front], o.height, o.wall), cull: true },
        { ...wall([x1, o.front], [x0, o.front], o.height, o.wall), cull: true },
        {
            kind: 'quad',
            layer: 'back',
            color: o.ceiling,
            cull: true,
            points: [
                [x0, o.height, o.back],
                [x1, o.height, o.back],
                [x1, o.height, o.front],
                [x0, o.height, o.front],
            ],
        },
    ];
}

/** A box standing on the ground at (x, z), or at height `y` (a shelf, a stage), w × h × d cm. */
export const box = (
    x: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
    extra: { y?: number; rotY?: number; top?: string; line?: string | null; layer?: SetLayer } = {},
): BoxPiece => {
    const { y = 0, ...rest } = extra;
    return { kind: 'box', at: [x, y, z], size: [w, h, d], color, layer: 'mid', ...rest };
};

export const card = (
    shape: string,
    x: number,
    z: number,
    w: number,
    h: number,
    colors?: string[],
    extra: Partial<CardPiece> = {},
): CardPiece => ({
    kind: 'card',
    shape,
    at: [x, 0, z],
    width: w,
    height: h,
    layer: 'mid',
    ...(colors ? { colors } : {}),
    ...extra,
});

export const line = (
    points: V3[],
    color: string,
    width: number,
    layer: SetLayer = 'mid',
): LinePiece => ({
    kind: 'line',
    points,
    color,
    width,
    layer,
});

/** `n` things in a row: fn(i, position). */
export function row<T>(
    n: number,
    from: number,
    step: number,
    fn: (i: number, at: number) => T,
): T[] {
    return Array.from({ length: n }, (_, i) => fn(i, from + i * step));
}

/**
 * `n` random spots in a rectangle, at least `gap` apart, never inside `keepOut` (the stage); gives up quietly
 * when it cannot fit them all.
 */
export function scatter(
    rand: Rand,
    area: { x0: number; z0: number; x1: number; z1: number },
    n: number,
    gap: number,
    keepOut?: { x: number; z: number; r: number },
): [number, number][] {
    const out: [number, number][] = [];
    for (let tries = 0; out.length < n && tries < n * 30; tries++) {
        const x = rand.range(area.x0, area.x1);
        const z = rand.range(area.z0, area.z1);
        if (keepOut && Math.hypot(x - keepOut.x, z - keepOut.z) < keepOut.r) continue;
        if (out.some(([px, pz]) => Math.hypot(px - x, pz - z) < gap)) continue;
        out.push([x, z]);
    }
    return out;
}
