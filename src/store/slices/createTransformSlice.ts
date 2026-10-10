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
    flipX: () => void;
    flipY: () => void;
    setTransform: (key: keyof Transform, value: number | string | boolean) => void;
    setOrigin: (origin: { originX: OriginX; originY: OriginY; id: string }) => void;
    setRadius: (rx?: number, ry?: number) => void;
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
        originY: 'center', // NOTE: was `centerY` (typo). Update the Transform type too.
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
        const isBool = key === 'flipX' || key === 'flipY';
        const parsed = isBool ? Boolean(value) : Number(value);
        set((s) => ({ transform: { ...s.transform, [key]: parsed } }));
        get().updateFabricFromStore();
    },

    flipX: () => {
        set((s) => ({ transform: { ...s.transform, flipX: !s.transform.flipX } }));
        get().updateFabricFromStore();
    },

    flipY: () => {
        set((s) => ({ transform: { ...s.transform, flipY: !s.transform.flipY } }));
        get().updateFabricFromStore();
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
                | fabric.Rect
                | undefined;
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
