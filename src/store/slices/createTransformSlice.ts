import type { SliceCreator } from '../types';
import * as fabric from 'fabric';
import type { Transform } from '../../lib/types/transform.type';

function getVisualAngle(rotation: number, flipX: boolean, flipY: boolean) {
    if (flipX && !flipY) return -rotation;
    if (!flipX && flipY) return 180 - rotation;
    return rotation;
}

function round(val: number) {
    return Math.round(val ?? 0);
}

export interface TransformSlice {
    transform: Transform;
    hasSelection: boolean;
    _isSyncing: boolean;

    updateFromFabric: (obj: fabric.Object) => void;
    updateFabricFromStore: () => void;
    updateFabricFromStore1: () => void;
    updateFabricFromStore111: () => void;
    flipX: () => void;
    flipY: () => void;
    setTransform: (key: string, value: string) => void;
    setOrigin: (origin: any) => void;
}

export const createTransformSlice: SliceCreator<TransformSlice> = (set, get, store) => ({
    transform: {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        flipX: false,
        flipY: false,
        originX: 'center',
        centerY: 'center',
        id: 'c',
        rx: 0,
        ry: 0,
    },
    hasSelection: false,
    _isSyncing: false, // avoid circular updates

    updateFromFabric: (obj?: fabric.Object) => {
        if (!obj) {
            set({ hasSelection: false });
            return;
        }

        if (get()._isSyncing) return;

        const scaleX = obj.scaleX ?? 1;
        const scaleY = obj.scaleY ?? 1;

        const next: any = {
            x: round(obj.left ?? 0),
            y: round(obj.top ?? 0),
            width: round(
                obj.getScaledWidth ? obj.getScaledWidth() : (obj.width ?? 0) * Math.abs(scaleX),
            ),
            height: round(
                obj.getScaledHeight ? obj.getScaledHeight() : (obj.height ?? 0) * Math.abs(scaleY),
            ),
            rotation: round(obj.angle ?? 0),
            flipX: scaleX < 0,
            flipY: scaleY < 0,
        };

        if (obj.type === 'rect') {
            const rect = obj as fabric.Rect;
            next.rx = rect.rx ?? 0;
            next.ry = rect.ry ?? 0;
        }

        const prev = get().transform;

        const changed =
            prev.x !== next.x ||
            prev.y !== next.y ||
            prev.width !== next.width ||
            prev.height !== next.height ||
            prev.rotation !== next.rotation ||
            prev.flipX !== next.flipX ||
            prev.flipY !== next.flipY ||
            prev.rx !== next.rx ||
            prev.ry !== next.ry;

        if (changed) {
            set({ transform: next, hasSelection: true });
        }
    },

    updateFabricFromStore111: () => {
        const { transform, canvas } = get();
        const obj = canvas?.getActiveObject();
        if (!obj) return;

        set({ _isSyncing: true });

        // --- 1. Normalize origin for stable math
        obj.set({
            originX: 'center',
            originY: 'center',
            objectCaching: false,
        });

        // --- 2. Base dimensions
        const baseWidth = obj._originalWidth || obj.width || 1;
        const baseHeight = obj._originalHeight || obj.height || 1;

        // Store original size once
        if (!obj._originalWidth) {
            obj._originalWidth = baseWidth;
            obj._originalHeight = baseHeight;
        }

        // --- 3. Safe scale calculation
        const scaleX = transform.width / baseWidth;
        const scaleY = transform.height / baseHeight;

        // --- 4. Apply transform
        obj.set({
            angle: transform.rotation || 0,
            scaleX: transform.flipX ? -Math.abs(scaleX) : Math.abs(scaleX),
            scaleY: transform.flipY ? -Math.abs(scaleY) : Math.abs(scaleY),
        });

        // --- 5. Position using absolute left/top
        obj.setPositionByOrigin(new fabric.Point(transform.x, transform.y), 'center', 'center');

        obj.setCoords();
        canvas.requestRenderAll();

        set({ _isSyncing: false });
    },

    updateFabricFromStore: () => {
        console.log('here...');

        const { transform, canvas } = get();
        const obj = canvas?.getActiveObject();

        if (!obj || get()._isSyncing) return;

        set({ _isSyncing: true });

        const cx = Number(transform.x) || 0;
        const cy = Number(transform.y) || 0;
        const width = Math.max(1, Number(transform.width) || 1);
        const height = Math.max(1, Number(transform.height) || 1);
        const rotation = Number(transform.rotation) || 0;
        const flipX = Boolean(transform.flipX);
        const flipY = Boolean(transform.flipY);

        // ✅ For images, apply scale instead of width/height
        if (obj.type === 'image') {
            const originalWidth = obj.width || 1;
            const originalHeight = obj.height || 1;

            obj.set({
                left: cx,
                top: cy,
                scaleX: width / originalWidth,
                scaleY: height / originalHeight,
                angle: rotation,
                flipX,
                flipY,
            });
        } else {
            // ✅ For other objects (textbox, rect, path)
            obj.set({
                left: cx,
                top: cy,
                width,
                height,
                angle: rotation,
                flipX,
                flipY,
            });
        }

        obj.setCoords();
        canvas.requestRenderAll();

        set({ _isSyncing: false });
    },

    updateFabricFromStore1: () => {
        console.log('.......');
        const { transform, canvas } = get();
        const obj = canvas?.getActiveObject();

        if (!obj || get()._isSyncing) return;

        set({ _isSyncing: true });

        const cx = Number(transform.x) || 0;
        const cy = Number(transform.y) || 0;
        const width = Math.max(1, Number(transform.width) || 1);
        const height = Math.max(1, Number(transform.height) || 1);

        const rotation = Number(transform.rotation) || 0;
        const flipX = Boolean(transform.flipX);
        const flipY = Boolean(transform.flipY);

        // ✅ Apply flip math ONLY here
        const visualAngle = getVisualAngle(rotation, flipX, flipY);

        obj.set({
            left: cx,
            top: cy,
            width,
            height,
            angle: visualAngle,
            flipX,
            flipY,
        });

        obj.setCoords();
        canvas.requestRenderAll();

        set({ _isSyncing: false });
    },

    updateFabricFromStore11: () => {
        const { transform, canvas } = get();
        const obj = canvas?.getActiveObject();
        if (!obj || get()._isSyncing) return;

        set({ _isSyncing: true });

        const x: number = Number(transform.x) || 0;
        const y: number = Number(transform.y) || 0;
        const width: number = Number(transform.width) || 1;
        const height: number = Number(transform.height) || 1;

        let angle: number = Number(transform.rotation) || 0;
        const flipX = Boolean(transform.flipX);
        const flipY = Boolean(transform.flipY);

        console.log(x, y);

        // --------------------------------
        // 🔑 FIX: Adjust angle due to flip
        // --------------------------------
        if (flipX && !flipY) {
            angle = -angle;
        } else if (!flipX && flipY) {
            angle = 180 - angle;
        }
        // flipX && flipY → angle unchanged

        // --------------------------------
        // Preserve visual center
        // --------------------------------
        const center = obj.getCenterPoint();

        obj.set({
            originX: 'center',
            originY: 'center',
            left: center.x,
            top: center.y,
            width,
            height,
            angle,
            flipX,
            flipY,
        });

        obj.setCoords();
        // canvas.requestRenderAll();
        canvas.renderAll();

        set({ _isSyncing: false });
    },

    setTransform: (key, value) => {
        console.log('here');
        set((state) => ({
            transform: { ...state.transform, [key]: value },
        }));
        requestAnimationFrame(() => get().updateFabricFromStore());
    },

    flipX: () => {
        set((state) => ({
            transform: { ...state.transform, flipX: !state.transform.flipX },
        }));
        requestAnimationFrame(() => get().updateFabricFromStore());
    },

    flipY: () => {
        set((state) => ({
            transform: { ...state.transform, flipY: !state.transform.flipY },
        }));
        requestAnimationFrame(() => get().updateFabricFromStore());
    },

    setOrigin: (origin) => {
        set((state) => ({
            transform: {
                ...state.transform,
                originX: origin.originX,
                originY: origin.originY,
                id: origin.id,
            },
        }));
        requestAnimationFrame(() => get().updateFabricFromStore());
    },

    setRadius: (rx?: number, ry?: number) => {
        const canvas = get().canvas;
        if (!canvas) return;

        const active = canvas.getActiveObject();
        if (!active) return;

        const safeRx = rx ?? 0;
        const safeRy = ry ?? 0;

        const updateRect = (obj: fabric.Object) => {
            if (obj.type === 'rect') {
                obj.set({
                    rx: safeRx,
                    ry: safeRy,
                });
                obj.setCoords();
            }
        };

        if (active.type === 'rect') {
            updateRect(active);
        } else if (active.type === 'activeselection') {
            active.getObjects().forEach(updateRect);
        }

        canvas.requestRenderAll();

        // ✅ Correct Zustand state update
        set((state) => ({
            ...state,
            transform: {
                ...state.transform,
                rx: safeRx,
                ry: safeRy,
            },
        }));
    },

    syncTransformFromSelection: () => {
        const canvas = get().canvas;
        if (!canvas) return;

        const active = canvas.getActiveObject();
        if (!active) return;

        if (active.type === 'rect') {
            set({ transform: { rx: active.rx || 0, ry: active.ry || 0 } });
        } else if (active.type === 'activeselection') {
            // For groups, you can pick the first rect or set to 0
            const firstRect = active.getObjects().find((o) => o.type === 'rect');
            if (firstRect) {
                set({ transform: { rx: firstRect.rx || 0, ry: firstRect.ry || 0 } });
            } else {
                set({ transform: { rx: 0, ry: 0 } });
            }
        }
    },
});
