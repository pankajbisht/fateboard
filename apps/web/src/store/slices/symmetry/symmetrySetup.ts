/**
 * Symmetry setup: the types, defaults and sanitisers of the Symmetry slice, and `symmetryPlanOf`, which reads
 * the store state + canvas into the copies' matrices (used by drawing, the ghost preview, the guide and
 * Reflect selection). No store import (BUG-048).
 */
import type * as fabric from 'fabric';
import { symmetryPlan, isSymmetryMode, type SymmetryMode } from '@/lib/canvas/symmetry';
import {
    CHAIN_STEP_KINDS,
    isWallpaperGroup,
    type ChainStep,
    type WallpaperGroup,
} from '@/lib/canvas/symmetryGroups';
import {
    frameOfBox,
    frameOfPin,
    type FrameBox,
    type SymmetryEdge,
    type SymmetryFrame,
    type SymmetryPin,
    type SymmetrySourceKind,
} from '@/lib/canvas/symmetryFrame';
import type { Matrix, Pt } from '@/lib/canvas/symmetryMath';

export type SymmetryTextMode = 'readable' | 'mirror';

export type SymmetryModeOptions = {
    glideShift: number;
    spiralTurn: number;
    spiralScale: number;
    wallpaper: WallpaperGroup;
    tileSize: number;
    tileReach: number;
    chainDepth: number;
    textMode: SymmetryTextMode;
    /** Ghost copies while drawing. */
    preview: boolean;
    /** New copies stay linked to their source (editing one updates all). */
    linked: boolean;
    /** Dragged objects snap onto the axes and the centre. */
    snap: boolean;
};

/** Per-copy variation: copy k of n gets k/n of each effect (wobble is seeded random). */
export type SymmetryVariation = {
    hue: number;
    fade: number;
    shrink: number;
    wobble: number;
    seed: number;
};

export const DEFAULT_SYMMETRY_OPTIONS: SymmetryModeOptions = {
    glideShift: 80,
    spiralTurn: 30,
    spiralScale: 0.9,
    wallpaper: 'p4m',
    tileSize: 200,
    tileReach: 2,
    chainDepth: 1,
    textMode: 'readable',
    preview: true,
    linked: true,
    snap: true,
};

export const DEFAULT_SYMMETRY_VARIATION: SymmetryVariation = {
    hue: 0,
    fade: 0,
    shrink: 0,
    wobble: 0,
    seed: 1,
};

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function sanitizeSymmetryOptions(
    prev: SymmetryModeOptions,
    p: Partial<SymmetryModeOptions>,
): SymmetryModeOptions {
    const o = { ...prev };
    if (p.glideShift !== undefined) o.glideShift = clamp(num(p.glideShift, 80), -2000, 2000);
    if (p.spiralTurn !== undefined) o.spiralTurn = clamp(num(p.spiralTurn, 30), -180, 180);
    if (p.spiralScale !== undefined) o.spiralScale = clamp(num(p.spiralScale, 0.9), 0.5, 1.5);
    if (isWallpaperGroup(p.wallpaper)) o.wallpaper = p.wallpaper;
    if (p.tileSize !== undefined) o.tileSize = clamp(num(p.tileSize, 200), 8, 4000);
    if (p.tileReach !== undefined) o.tileReach = Math.round(clamp(num(p.tileReach, 2), 1, 8));
    if (p.chainDepth !== undefined) o.chainDepth = Math.round(clamp(num(p.chainDepth, 1), 1, 6));
    if (p.textMode === 'readable' || p.textMode === 'mirror') o.textMode = p.textMode;
    if (p.preview !== undefined) o.preview = !!p.preview;
    if (p.linked !== undefined) o.linked = !!p.linked;
    if (p.snap !== undefined) o.snap = !!p.snap;
    return o;
}

export function sanitizeSymmetryVariation(
    prev: SymmetryVariation,
    p: Partial<SymmetryVariation>,
): SymmetryVariation {
    const o = { ...prev };
    if (p.hue !== undefined) o.hue = clamp(num(p.hue, 0), -180, 180);
    if (p.fade !== undefined) o.fade = clamp(num(p.fade, 0), 0, 0.95);
    if (p.shrink !== undefined) o.shrink = clamp(num(p.shrink, 0), 0, 0.95);
    if (p.wobble !== undefined) o.wobble = clamp(num(p.wobble, 0), 0, 100);
    if (p.seed !== undefined) o.seed = Math.round(clamp(num(p.seed, 1), 1, 1e9));
    return o;
}

export function sanitizeChainStep(prev: ChainStep, p: Partial<ChainStep>): ChainStep {
    const o = { ...prev };
    if (p.kind && CHAIN_STEP_KINDS.includes(p.kind)) o.kind = p.kind;
    if (p.angle !== undefined) o.angle = clamp(num(p.angle, 0), -360, 360);
    if (p.count !== undefined) o.count = Math.round(clamp(num(p.count, 2), 2, 64));
    if (p.scale !== undefined) o.scale = clamp(num(p.scale, 1), 0.05, 2);
    if (p.shift !== undefined) o.shift = clamp(num(p.shift, 0), -4000, 4000);
    if (p.enabled !== undefined) o.enabled = !!p.enabled;
    if (p.pinId !== undefined) o.pinId = p.pinId || null;
    return o;
}

/** What `symmetryPlanOf` reads from the store. */
export type SymmetryStateView = {
    canvas?: fabric.Canvas | null;
    symmetry?: SymmetryMode;
    symmetryCenter?: Pt | null;
    symmetryAngle?: number;
    symmetryCount?: number;
    symmetrySource: SymmetrySourceKind;
    symmetryEdge: SymmetryEdge;
    symmetryBox: FrameBox | null;
    symmetryObjectId: string | null;
    symmetryPins: SymmetryPin[];
    symmetryPinId: string | null;
    symmetryOptions: SymmetryModeOptions;
    symmetryChain: ChainStep[];
    symmetryCurveId?: string | null;
    boardMode?: 'design' | 'whiteboard' | null;
    pageWidth?: number;
    pageHeight?: number;
};

/** Centre of the current view in scene coordinates. */
export function viewCenter(canvas: fabric.Canvas): Pt {
    const v = canvas.viewportTransform;
    const x = canvas.getWidth() / 2;
    const y = canvas.getHeight() / 2;
    const det = v[0] * v[3] - v[1] * v[2] || 1;
    const dx = x - v[4];
    const dy = y - v[5];
    return { x: (v[3] * dx - v[2] * dy) / det, y: (-v[1] * dx + v[0] * dy) / det };
}

/** The page as a box: the design page, or (whiteboard) the current view. */
export function pageBox(s: SymmetryStateView, canvas: fabric.Canvas): FrameBox {
    if (s.boardMode === 'design' && s.pageWidth && s.pageHeight)
        return {
            cx: s.pageWidth / 2,
            cy: s.pageHeight / 2,
            width: s.pageWidth,
            height: s.pageHeight,
            angle: 0,
        };
    const c = viewCenter(canvas);
    const z = canvas.getZoom() || 1;
    return {
        cx: c.x,
        cy: c.y,
        width: canvas.getWidth() / z,
        height: canvas.getHeight() / z,
        angle: 0,
    };
}

/** An object's box: centre, scaled size, angle and anchor (origin point). */
export function objectBox(obj: fabric.FabricObject): FrameBox {
    const c = obj.getCenterPoint();
    const anchor = obj.translateToOriginPoint(c, obj.originX, obj.originY);
    return {
        cx: c.x,
        cy: c.y,
        width: obj.getScaledWidth(),
        height: obj.getScaledHeight(),
        angle: obj.angle ?? 0,
        anchor: { x: anchor.x, y: anchor.y },
    };
}

export const findObjectById = (canvas: fabric.Canvas, id: string | null) =>
    id
        ? (canvas.getObjects().find((o) => (o as unknown as { id?: unknown }).id === id) ?? null)
        : null;

/** The frame of the current source; falls back to the free centre / view centre. */
export function symmetryFrameOf(s: SymmetryStateView): SymmetryFrame | null {
    const canvas = s.canvas;
    if (!canvas) return null;
    const free = { center: s.symmetryCenter ?? viewCenter(canvas), rotation: 0 };
    switch (s.symmetrySource) {
        case 'page':
            return frameOfBox(pageBox(s, canvas), s.symmetryEdge);
        case 'selection':
            return s.symmetryBox ? frameOfBox(s.symmetryBox, s.symmetryEdge) : free;
        case 'object': {
            const obj = findObjectById(canvas, s.symmetryObjectId);
            const box = obj ? objectBox(obj) : s.symmetryBox;
            return box ? frameOfBox(box, s.symmetryEdge) : free;
        }
        case 'pin': {
            const pin = (s.symmetryPins ?? []).find((p) => p.id === s.symmetryPinId);
            return pin ? frameOfPin(pin) : free;
        }
        default:
            return free;
    }
}

export type SymmetryPlan = { frame: SymmetryFrame; matrices: Matrix[]; wanted: number };

/** The copies the current setup makes (`mode` overrides the drawing mode, e.g. for Reflect selection). */
export function symmetryPlanOf(
    s: SymmetryStateView,
    mode = s.symmetry ?? 'none',
): SymmetryPlan | null {
    const frame = symmetryFrameOf(s);
    if (!frame || !isSymmetryMode(mode) || mode === 'none') return null;
    // a store without the Symmetry slice (tests of other slices) gets the defaults
    const o = s.symmetryOptions ?? DEFAULT_SYMMETRY_OPTIONS;
    const pins = s.symmetryPins ?? [];
    const plan = symmetryPlan(mode, frame.center, s.symmetryAngle ?? 90, s.symmetryCount ?? 6, {
        ...o,
        rotation: frame.rotation,
        chain: s.symmetryChain ?? [],
        depth: o.chainDepth,
        pinCenter: (id) => {
            const pin = pins.find((p) => p.id === id);
            return pin ? { x: pin.x, y: pin.y } : null;
        },
    });
    return { frame, ...plan };
}
