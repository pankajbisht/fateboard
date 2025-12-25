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
    updateFabricFromStore11: () => void;
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
    },
    hasSelection: false,
    _isSyncing: false, // avoid circular updates

    updateFromFabric: (obj) => {
        if (!obj) {
            set({ hasSelection: false }); // disable inputs
            return;
        }

        if (get()._isSyncing) return;

        const next = {
            x: round(obj.left),
            y: round(obj.top),
            width: round(obj.getScaledWidth?.() ?? (obj.width || 0) * (obj.scaleX || 1)),
            height: round(obj.getScaledHeight?.() ?? (obj.height || 0) * (obj.scaleY || 1)),
            rotation: round(obj.angle || 0),
            flipX: obj.scaleX < 0,
            flipY: obj.scaleY < 0,
        };

        const prev = get().transform;

        const changed =
            prev.x !== next.x ||
            prev.y !== next.y ||
            prev.width !== next.width ||
            prev.height !== next.height ||
            prev.rotation !== next.rotation ||
            prev.flipX !== next.flipX ||
            prev.flipY !== next.flipY;

        if (changed) {
            set({ transform: next, hasSelection: true });
        }
    },

    updateFabricFromStore1: () => {
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
});
