/**
 * Where the symmetry comes from: a source (page, selection, another object, a reference pin, or a free centre)
 * resolved to a frame = centre + rotation (degrees). The mode's matrices are built about the centre and turned
 * by the rotation, so "mirror left-right" across a 30° rotated object's left edge mirrors across that edge.
 * Pure; the canvas reading lives in store/slices/symmetry/symmetryFrameOf.ts.
 */
import { applyToPoint, rotation, type Pt } from './symmetryMath';

export type SymmetrySourceKind = 'free' | 'page' | 'selection' | 'object' | 'pin';
export const SYMMETRY_SOURCES: SymmetrySourceKind[] = [
    'free',
    'page',
    'selection',
    'object',
    'pin',
];
export const isSymmetrySource = (v: unknown): v is SymmetrySourceKind =>
    SYMMETRY_SOURCES.includes(v as SymmetrySourceKind);

/** Which part of a box the axis goes through. `anchor` = the object's own anchor (its origin point). */
export type SymmetryEdge = 'center' | 'left' | 'right' | 'top' | 'bottom' | 'diagonal' | 'anchor';
export const SYMMETRY_EDGES: SymmetryEdge[] = [
    'center',
    'left',
    'right',
    'top',
    'bottom',
    'diagonal',
    'anchor',
];
export const isSymmetryEdge = (v: unknown): v is SymmetryEdge =>
    SYMMETRY_EDGES.includes(v as SymmetryEdge);

/** A box in its own frame: centre, size and turn (degrees). `anchor` is a scene point. */
export type FrameBox = {
    cx: number;
    cy: number;
    width: number;
    height: number;
    angle: number;
    anchor?: Pt | null;
};

export type SymmetryFrame = { center: Pt; rotation: number };

/** A reference pin: a named point with an axis angle (an axis line when the mode is a mirror). */
export type SymmetryPin = { id: string; name: string; x: number; y: number; angle: number };

const finite = (v: number, d = 0) => (Number.isFinite(v) ? v : d);

/** The frame of a box at an edge: the edge's midpoint, turned with the box. */
export function frameOfBox(box: FrameBox, edge: SymmetryEdge): SymmetryFrame {
    const angle = finite(box.angle);
    const center = { x: finite(box.cx), y: finite(box.cy) };
    if (edge === 'anchor' && box.anchor) return { center: { ...box.anchor }, rotation: angle };
    const w = Math.abs(finite(box.width)) / 2;
    const h = Math.abs(finite(box.height)) / 2;
    if (edge === 'diagonal') {
        // the axis runs corner to corner: mirror modes have their axis at 90°, so turn it onto the diagonal
        const diag = (Math.atan2(h, w || 1e-9) * 180) / Math.PI;
        return { center, rotation: angle + diag - 90 };
    }
    const offset: Record<string, Pt> = {
        center: { x: 0, y: 0 },
        left: { x: -w, y: 0 },
        right: { x: w, y: 0 },
        top: { x: 0, y: -h },
        bottom: { x: 0, y: h },
    };
    const o = offset[edge] ?? offset.center;
    return {
        center: applyToPoint(rotation(center, angle), { x: center.x + o.x, y: center.y + o.y }),
        rotation: angle,
    };
}

/** The frame of a pin: its point, turned so a left-right mirror runs along the pin's axis line. */
export const frameOfPin = (pin: SymmetryPin): SymmetryFrame => ({
    center: { x: finite(pin.x), y: finite(pin.y) },
    rotation: finite(pin.angle, 90) - 90,
});

/** Angle snapped to 15° steps (Shift-free default for the axis line handle). */
export const snapAngle = (deg: number, step = 15): number => {
    const a = (((Math.round(deg / step) * step) % 360) + 360) % 360;
    return a > 180 ? a - 360 : a;
};

/** Snaps `p` to the nearest target within `radius` (scene units); returns the point and what it hit. */
export function snapPoint(p: Pt, targets: Pt[], radius: number): { point: Pt; snapped: boolean } {
    let best: Pt | null = null;
    let bestD = radius;
    for (const t of targets) {
        const d = Math.hypot(t.x - p.x, t.y - p.y);
        if (d <= bestD) {
            best = t;
            bestD = d;
        }
    }
    return best ? { point: { ...best }, snapped: true } : { point: p, snapped: false };
}

/** Snap targets of a box: centre, edge midpoints and corners (in scene coordinates). */
export function boxTargets(box: FrameBox): Pt[] {
    const m = rotation({ x: box.cx, y: box.cy }, box.angle);
    const w = Math.abs(box.width) / 2;
    const h = Math.abs(box.height) / 2;
    const local = [
        [0, 0],
        [-w, 0],
        [w, 0],
        [0, -h],
        [0, h],
        [-w, -h],
        [w, -h],
        [-w, h],
        [w, h],
    ];
    return local.map(([dx, dy]) => applyToPoint(m, { x: box.cx + dx, y: box.cy + dy }));
}
