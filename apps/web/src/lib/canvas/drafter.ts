/**
 * Drafter tool geometry (pure): a drafting machine's protractor head. Lines snap to the head's angle steps,
 * parallel / perpendicular lines lock to a reference angle, lengths read in the document unit, and dimension
 * lines get extension lines, arrowheads and an upright label.
 */
import { toUnit, unitPrecision, type Unit } from '@/lib/units';

type Pt = { x: number; y: number };

/** Technical pen widths (ISO 128), mm. */
export const ISO_PEN_WIDTHS_MM = [0.13, 0.18, 0.25, 0.35, 0.5, 0.7, 1] as const;
export const ANGLE_STEPS = [1, 5, 15, 30, 45, 90] as const;
export type DrafterMode = 'line' | 'parallel' | 'perpendicular' | 'dimension' | 'construction';
export const DRAFTER_MODES: DrafterMode[] = [
    'line',
    'parallel',
    'perpendicular',
    'dimension',
    'construction',
];

/** 0 … 360. */
export const normalizeAngle = (deg: number) => ((deg % 360) + 360) % 360;

/** Angle of a → b in degrees (screen: 0 = right, 90 = down). */
export const angleOf = (a: Pt, b: Pt) =>
    normalizeAngle((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI);

/** The nearest angle `base + k × step`. */
export function snapAngle(deg: number, step: number, base = 0): number {
    if (!(step > 0)) return normalizeAngle(deg);
    return normalizeAngle(base + Math.round((deg - base) / step) * step);
}

/**
 * Where the line ends for a pointer at `raw`: free (no snap), locked to `lockAngle` (parallel /
 * perpendicular: the length is the pointer's projection on that direction), or snapped to the head's steps.
 */
export function drafterEnd(
    start: Pt,
    raw: Pt,
    opts: { step: number; base: number; free?: boolean; lockAngle?: number | null },
): { end: Pt; angle: number; length: number } {
    const dx = raw.x - start.x;
    const dy = raw.y - start.y;
    const dist = Math.hypot(dx, dy);
    if (opts.free) return { end: raw, angle: angleOf(start, raw), length: dist };
    if (opts.lockAngle !== null && opts.lockAngle !== undefined) {
        const t = (opts.lockAngle * Math.PI) / 180;
        const len = dx * Math.cos(t) + dy * Math.sin(t);
        const end = { x: start.x + Math.cos(t) * len, y: start.y + Math.sin(t) * len };
        return {
            end,
            angle: len >= 0 ? normalizeAngle(opts.lockAngle) : normalizeAngle(opts.lockAngle + 180),
            length: Math.abs(len),
        };
    }
    const angle = snapAngle(angleOf(start, raw), opts.step, opts.base);
    const t = (angle * Math.PI) / 180;
    return {
        end: { x: start.x + Math.cos(t) * dist, y: start.y + Math.sin(t) * dist },
        angle,
        length: dist,
    };
}

/** "12.5 mm", "48 px". */
export function formatLength(px: number, unit: Unit): string {
    const d = unitPrecision(unit);
    return `${toUnit(px, unit).toFixed(d)} ${unit}`;
}

/** The angle as a drafter reads it: counter-clockwise from the right, like a protractor (0 … 360). */
export const protractorAngle = (screenDeg: number) => normalizeAngle(360 - screenDeg);

/** Text angle that keeps a label upright along a line. */
export const uprightAngle = (deg: number) => {
    const a = normalizeAngle(deg);
    return a > 90 && a <= 270 ? a - 180 : a;
};

/** Pen width in px (96 px per inch) for a width in mm. */
export const mmToPx = (mm: number) => (mm * 96) / 25.4;

/**
 * Dimension line between a and b, offset to the left of a → b by `offset`: two extension lines, the dimension
 * line, two arrowheads (`arrow` long) and where its label goes (middle, upright).
 */
export function dimensionGeometry(a: Pt, b: Pt, offset: number, arrow: number) {
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    const nx = uy;
    const ny = -ux;
    const p = (q: Pt, k: number) => ({ x: q.x + nx * k, y: q.y + ny * k });
    const a2 = p(a, offset);
    const b2 = p(b, offset);
    const head = (tip: Pt, dir: 1 | -1) => {
        const bx = tip.x - ux * arrow * dir;
        const by = tip.y - uy * arrow * dir;
        return [
            { x: bx + nx * arrow * 0.35, y: by + ny * arrow * 0.35 },
            tip,
            { x: bx - nx * arrow * 0.35, y: by - ny * arrow * 0.35 },
        ];
    };
    const ext = Math.sign(offset) * arrow * 0.6;
    return {
        extensions: [
            [a, p(a, offset + ext)],
            [b, p(b, offset + ext)],
        ] as [Pt, Pt][],
        line: [a2, b2] as [Pt, Pt],
        heads: [head(a2, -1), head(b2, 1)],
        label: { x: (a2.x + b2.x) / 2 + nx * arrow, y: (a2.y + b2.y) / 2 + ny * arrow },
        labelAngle: uprightAngle(angleOf(a, b)),
    };
}
