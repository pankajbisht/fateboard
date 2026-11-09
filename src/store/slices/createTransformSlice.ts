import type { SliceCreator } from '../types';
import * as fabric from 'fabric';
import type { Transform } from '../../lib/types/transform.type';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type OriginX = 'left' | 'center' | 'right';
type OriginY = 'top' | 'center' | 'bottom';

const r2 = (v: number) => Math.round((v ?? 0) * 100) / 100;

const FACTOR_X: Record<string, number> = { left: -0.5, center: 0, right: 0.5 };
const FACTOR_Y: Record<string, number> = { top: -0.5, center: 0, bottom: 0.5 };

/** Offset (in canvas space) from an object's center to its chosen reference point. */
function getRefOffset(
    width: number,
    height: number,
    angleDeg: number,
    originX: string,
    originY: string,
) {
    const dx = (FACTOR_X[originX] ?? 0) * width;
    const dy = (FACTOR_Y[originY] ?? 0) * height;
    const a = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    return new fabric.Point(dx * cos - dy * sin, dx * sin + dy * cos);
}

const MIRROR_X: Record<string, OriginX> = { left: 'right', center: 'center', right: 'left' };
const MIRROR_Y: Record<string, OriginY> = { top: 'bottom', center: 'center', bottom: 'top' };
const ANCHOR_ID: Record<string, string> = {
    'left|top': 'tl',
    'center|top': 't',
    'right|top': 'tr',
    'left|center': 'l',
    'center|center': 'c',
    'right|center': 'r',
    'left|bottom': 'bl',
    'center|bottom': 'b',
    'right|bottom': 'br',
};

function getScaledSize(obj: fabric.Object) {
    return {
        width: (obj.width ?? 0) * Math.abs(obj.scaleX ?? 1),
        height: (obj.height ?? 0) * Math.abs(obj.scaleY ?? 1),
    };
}

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

export interface TransformSlice {
    transform: Transform;
    hasSelection: boolean;
    _isSyncing: boolean;

    updateFromFabric: (obj?: fabric.Object) => void;
    updateFabricFromStore: () => void;
    /** Reflect across the anchor; the anchor selection follows to the mirrored point. */
    flipX: () => void;
    flipY: () => void;
    _reflect: (axis: 'x' | 'y') => void;
    setTransform: (key: keyof Transform, value: number | string | boolean) => void;
    setOrigin: (origin: { originX: OriginX; originY: OriginY; id: string }) => void;
    setRadius: (rx?: number, ry?: number) => void;
    /** Moves the selection by a few px (arrow keys). False when there is nothing movable. */
    nudgeSelection: (dx: number, dy: number) => boolean;
    syncTransformFromSelection: () => void;
}

export const createTransformSlice: SliceCreator<TransformSlice> = (set, get) => ({
    transform: {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        flipX: false,
        flipY: false,
        originX: 'center',
        originY: 'center',
        id: 'c',
        rx: 0,
        ry: 0,
    } as Transform,
    hasSelection: false,
    _isSyncing: false, // avoids circular updates

    // -----------------------------------------------------------------------
    // Fabric -> Store
    // -----------------------------------------------------------------------
    updateFromFabric: (obj) => {
        if (!obj) {
            set({ hasSelection: false });
            return;
        }
        if (get()._isSyncing) return;

        const prev = get().transform;
        const { width, height } = getScaledSize(obj);
        const angle = obj.angle ?? 0;

        // X/Y = the chosen reference point (center by default)
        const center = obj.getCenterPoint();
        const off = getRefOffset(width, height, angle, prev.originX, prev.originY);

        const next: Partial<Transform> = {
            x: r2(center.x + off.x),
            y: r2(center.y + off.y),
            width: r2(width),
            height: r2(height),
            rotation: r2(angle),
            flipX: !!obj.flipX,
            flipY: !!obj.flipY,
        };

        if (obj instanceof fabric.Rect) {
            next.rx = obj.rx ?? 0;
            next.ry = obj.ry ?? 0;
        }

        const changed = (Object.keys(next) as (keyof Transform)[]).some((k) => prev[k] !== next[k]);

        if (changed || !get().hasSelection) {
            set((s) => ({
                transform: { ...s.transform, ...next },
                hasSelection: true,
            }));
        }
    },

    // -----------------------------------------------------------------------
    // Store -> Fabric
    // -----------------------------------------------------------------------
    updateFabricFromStore: () => {
        const { transform: t, canvas } = get();
        const obj = canvas?.getActiveObject();
        if (!canvas || !obj || get()._isSyncing) return;

        set({ _isSyncing: true });
        try {
            const width = Math.max(1, Number(t.width) || 1);
            const height = Math.max(1, Number(t.height) || 1);
            const rotation = Number(t.rotation) || 0;

            // Size is always applied through scale (no double scaling).
            obj.set({
                scaleX: width / (obj.width || 1),
                scaleY: height / (obj.height || 1),
                angle: rotation,
                flipX: !!t.flipX,
                flipY: !!t.flipY,
            });

            // Convert the reference point back to the object's center.
            const off = getRefOffset(width, height, rotation, t.originX, t.originY);
            const center = new fabric.Point((Number(t.x) || 0) - off.x, (Number(t.y) || 0) - off.y);
            obj.setXY(center, 'center', 'center');

            obj.setCoords();
            canvas.requestRenderAll();
            // Fired synchronously while the guard is on, so history can record it
            // without bouncing back into the store.
            canvas.fire('object:modified', { target: obj });
        } finally {
            set({ _isSyncing: false });
        }
    },

    // -----------------------------------------------------------------------
    // Actions
    // -----------------------------------------------------------------------
    setTransform: (key, value) => {
        if (key === 'flipX' || key === 'flipY') {
            if (Boolean(value) !== Boolean(get().transform[key]))
                get()._reflect(key === 'flipX' ? 'x' : 'y');
            return;
        }
        const parsed = Number(value);
        set((s) => ({ transform: { ...s.transform, [key]: parsed } }));
        get().updateFabricFromStore();
    },

    // Flip = reflect across the anchor (vertical line through it for X, horizontal for Y).
    // The anchor keeps its canvas spot but is now the mirrored point of the object
    // (top-left -> top-right), so X/Y don't change and flipping again restores the object.
    flipX: () => get()._reflect('x'),
    flipY: () => get()._reflect('y'),

    _reflect: (axis) => {
        const { canvas } = get();
        const obj = canvas?.getActiveObject();
        if (!canvas || !obj || get()._isSyncing) return;
        const t = get().transform;

        set({ _isSyncing: true });
        try {
            const { width, height } = getScaledSize(obj);
            const factor = axis === 'x' ? (FACTOR_X[t.originX] ?? 0) : (FACTOR_Y[t.originY] ?? 0);
            // center moves 2 × (anchor offset) along the object's own axis
            const a = ((obj.angle ?? 0) * Math.PI) / 180;
            const dir =
                axis === 'x'
                    ? new fabric.Point(Math.cos(a), Math.sin(a))
                    : new fabric.Point(-Math.sin(a), Math.cos(a));
            const dist = 2 * factor * (axis === 'x' ? width : height);
            const center = obj.getCenterPoint().add(dir.scalarMultiply(dist));

            if (axis === 'x') obj.set('flipX', !obj.flipX);
            else obj.set('flipY', !obj.flipY);
            obj.setXY(center, 'center', 'center');
            obj.setCoords();

            const originX =
                axis === 'x' ? (MIRROR_X[t.originX] ?? 'center') : (t.originX as OriginX);
            const originY =
                axis === 'y' ? (MIRROR_Y[t.originY] ?? 'center') : (t.originY as OriginY);
            set((s) => ({
                transform: {
                    ...s.transform,
                    originX,
                    originY,
                    id: ANCHOR_ID[`${originX}|${originY}`] ?? 'c',
                    flipX: !!obj.flipX,
                    flipY: !!obj.flipY,
                },
            }));

            canvas.requestRenderAll();
            canvas.fire('object:modified', { target: obj });
        } finally {
            set({ _isSyncing: false });
        }
        get().updateFromFabric(obj);
    },

    // Origin is a UI reference point only: the object doesn't change,
    // the X/Y shown in the panel do.
    setOrigin: (origin) => {
        set((s) => ({
            transform: {
                ...s.transform,
                originX: origin.originX,
                originY: origin.originY,
                id: origin.id,
            },
        }));
        const obj = get().canvas?.getActiveObject();
        if (obj) get().updateFromFabric(obj);
    },

    nudgeSelection: (dx, dy) => {
        const canvas = get().canvas;
        const active = canvas?.getActiveObject();
        if (!canvas || !active || active.excludeFromExport) return false;
        if (active.lockMovementX || active.lockMovementY) return false;

        active.set({ left: active.left + dx, top: active.top + dy });
        active.setCoords();
        canvas.requestRenderAll();
        // only `modified`: `moving` listeners (snap) expect a live pointer drag
        canvas.fire('object:modified', { target: active });
        return true;
    },

    setRadius: (rx, ry) => {
        const canvas = get().canvas;
        const active = canvas?.getActiveObject();
        if (!canvas || !active) return;

        const safeRx = Math.max(0, rx ?? 0);
        const safeRy = Math.max(0, ry ?? safeRx);

        const apply = (o: fabric.Object) => {
            if (o instanceof fabric.Rect) {
                o.set({ rx: safeRx, ry: safeRy });
                o.setCoords();
            }
        };

        if (active instanceof fabric.ActiveSelection) {
            active.getObjects().forEach(apply);
        } else {
            apply(active);
        }

        canvas.requestRenderAll();
        canvas.fire('object:modified', { target: active });

        set((s) => ({
            transform: { ...s.transform, rx: safeRx, ry: safeRy },
        }));
    },

    syncTransformFromSelection: () => {
        const canvas = get().canvas;
        const active = canvas?.getActiveObject();
        if (!canvas || !active) return;

        let rect: fabric.Rect | undefined;
        if (active instanceof fabric.Rect) {
            rect = active;
        } else if (active instanceof fabric.ActiveSelection) {
            rect = active.getObjects().find((o) => o instanceof fabric.Rect) as
                fabric.Rect | undefined;
        }

        set((s) => ({
            transform: {
                ...s.transform,
                rx: rect?.rx ?? 0,
                ry: rect?.ry ?? 0,
            },
        }));
    },
});
