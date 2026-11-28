/**
 * Geometry tool (D) maths (pure): the instruments of a geometry box besides the Drafter (./drafter.ts). Scale =
 * a ruler whose length snaps to its ticks, Set square = lines along a 45° or 30° / 60° square's edges,
 * Protractor = an angle between two arms, Compass = a circle or an arc. Angles in screen degrees (0 = right,
 * 90 = down) unless a name says otherwise.
 */
import { angleOf, drafterEnd, mmToPx, normalizeAngle, snapAngle } from './drafter';

type Pt = { x: number; y: number };

export type GeometryInstrument = 'drafter' | 'scale' | 'setSquare' | 'protractor' | 'compass';
export const GEOMETRY_INSTRUMENTS: GeometryInstrument[] = [
    'drafter',
    'scale',
    'setSquare',
    'protractor',
    'compass',
];
/** Scale snapping, mm (0 = any length). */
export const SCALE_TICKS_MM = [0, 1, 5, 10] as const;
export type SetSquareKind = '45' | '30-60';
export const SET_SQUARE_KINDS: SetSquareKind[] = ['45', '30-60'];
export type CompassMode = 'circle' | 'arc';
export const COMPASS_MODES: CompassMode[] = ['circle', 'arc'];

/** Points one stroke places: a line 2, an angle 3 (vertex, arm, arm), an arc 3 (centre, radius, end). */
export const pointsNeeded = (instrument: GeometryInstrument, compass: CompassMode): 2 | 3 =>
    instrument === 'protractor' || (instrument === 'compass' && compass === 'arc') ? 3 : 2;

export const rayPoint = (c: Pt, deg: number, r: number): Pt => {
    const t = (deg * Math.PI) / 180;
    return { x: c.x + Math.cos(t) * r, y: c.y + Math.sin(t) * r };
};

/** Scale: any angle (Shift = snapped to `step`), the length rounded to `tickPx` (0 = free). */
export function scaleEnd(start: Pt, raw: Pt, tickPx: number, step = 0) {
    const dist = Math.hypot(raw.x - start.x, raw.y - start.y);
    const angle = step > 0 ? snapAngle(angleOf(start, raw), step) : angleOf(start, raw);
    const length = tickPx > 0 ? Math.round(dist / tickPx) * tickPx : dist;
    return { end: rayPoint(start, angle, length), angle, length };
}

/** The directions (0 … 360) a set square's edges give, turned by `base`: each edge both ways. */
export function setSquareAngles(kind: SetSquareKind, base: number): number[] {
    const edges = kind === '45' ? [0, 45, 90, 135] : [0, 30, 60, 90, 120, 150];
    return [...edges, ...edges.map((d) => d + 180)].map((d) => normalizeAngle(d + base));
}

/**
 * The set square's corners (scene) for a line from `a` at `lineDeg`, so the edge the line runs along starts at
 * `a`: along a leg, the right angle is at `a`; along the hypotenuse, `a` is an acute corner and the legs keep
 * to the square's axes (`base`, `base` + 90). `size` = the long leg / hypotenuse.
 */
export function setSquareCorners(
    a: Pt,
    lineDeg: number,
    kind: SetSquareKind,
    base: number,
    size: number,
): [Pt, Pt, Pt] {
    const p = rayPoint(a, lineDeg, size);
    const d = normalizeAngle(lineDeg - base) % 90;
    if (d < 1e-6 || 90 - d < 1e-6) {
        const short = kind === '45' ? size : size * Math.tan(Math.PI / 6);
        return [a, p, rayPoint(a, lineDeg - 90, short)];
    }
    const t = (base * Math.PI) / 180;
    const along = (p.x - a.x) * Math.cos(t) + (p.y - a.y) * Math.sin(t);
    return [a, p, { x: a.x + Math.cos(t) * along, y: a.y + Math.sin(t) * along }];
}

/** Circular distance between two angles, 0 … 180. */
const angleGap = (a: number, b: number) => {
    const d = Math.abs(normalizeAngle(a) - normalizeAngle(b));
    return Math.min(d, 360 - d);
};

/** Set square: the line runs along the edge nearest the pointer; its length is the pointer's projection. */
export function setSquareEnd(start: Pt, raw: Pt, kind: SetSquareKind, base: number) {
    const raw0 = angleOf(start, raw);
    const lock = setSquareAngles(kind, base).reduce((best, d) =>
        angleGap(d, raw0) < angleGap(best, raw0) ? d : best,
    );
    return drafterEnd(start, raw, { step: 0, base: 0, lockAngle: lock });
}

/**
 * The sweep (degrees, -360 … 360) from `from` to the pointer direction `toDeg`, kept continuous with `prev`
 * so an arc can pass 180° and keeps its direction, snapped to `step` (0 = free).
 */
export function sweepTo(fromDeg: number, toDeg: number, prev: number, step: number): number {
    let d = normalizeAngle(toDeg - fromDeg);
    while (d - prev > 180) d -= 360;
    while (prev - d > 180) d += 360;
    if (step > 0) d = Math.round(d / step) * step;
    return Math.max(-360, Math.min(360, d));
}

/** SVG path of an arc around c (radius r) from `startDeg`, sweeping `sweepDeg` (positive = clockwise on screen). */
export function arcPath(c: Pt, r: number, startDeg: number, sweepDeg: number): string {
    const s = Math.max(-360, Math.min(360, sweepDeg));
    if (Math.abs(s) >= 360) {
        // a full turn: two half arcs (one SVG arc cannot end where it starts)
        const a = rayPoint(c, startDeg, r);
        const b = rayPoint(c, startDeg + 180, r);
        return `M ${a.x} ${a.y} A ${r} ${r} 0 1 1 ${b.x} ${b.y} A ${r} ${r} 0 1 1 ${a.x} ${a.y}`;
    }
    const a = rayPoint(c, startDeg, r);
    const b = rayPoint(c, startDeg + s, r);
    const large = Math.abs(s) > 180 ? 1 : 0;
    const sweepFlag = s >= 0 ? 1 : 0;
    return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} ${sweepFlag} ${b.x} ${b.y}`;
}

/** Radius of the protractor's angle arc: a third of the shorter arm, 4 … 12 mm. */
export const angleArcRadius = (arm1: number, arm2: number) =>
    Math.max(mmToPx(4), Math.min(mmToPx(12), Math.min(arm1, arm2) / 3));
