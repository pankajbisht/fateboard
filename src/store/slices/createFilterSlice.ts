// store/slices/filterSlice.ts
// import { StateCreator } from 'zustand';
import * as fabric from 'fabric';
import type { SliceCreator } from '../types';
import { clampLayerBlur } from '@/lib/canvas/layerBlur';

export type FilterState = {
    brightness: number; // -1 → 1
    contrast: number; // -1 → 1
    saturation: number; // -1 → 1
    blur: number; // 0 → 1
    noise: number; // 0 → 1000
    pixelate: number; // 1 → 20
    hue: number; // 0 → 2π
    gamma: [number, number, number];
    grayscale: boolean;
    sepia: boolean;
    invert: boolean;
    /** BUG-002: was `opacity` (shared with the selection and the brush) */
    filterOpacity: number; // 0 → 1
};

export type FilterActions = {
    setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
    resetFilters: () => void;
    /**
     * Layer blur of the selection (any object, not only images): a Gaussian blur of the object itself,
     * radius in scene px (0 = off, max `LAYER_BLUR_MAX`). Drawn by `lib/canvas/layerBlur`. One undo step
     * unless `history: false` (slider drag preview; commit on release).
     */
    setLayerBlur: (radius: number, opts?: { history?: boolean }) => void;
};

export type FilterSlice = FilterState & FilterActions;

export const defaultFilters: FilterState = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    blur: 0,
    noise: 0,
    pixelate: 1,
    hue: 0,
    gamma: [1, 1, 1],
    grayscale: false,
    sepia: false,
    invert: false,
    filterOpacity: 1,
};

/**
 * Applies the brightness/contrast part of `filters` to an image (Fabric 7 API).
 * Not used by the mounted Filter tab (it uses useImageFilters); kept for the dead-code-free API.
 */
export function applyFabricFilters(
    obj: fabric.FabricObject,
    filters: FilterState,
    canvas: fabric.Canvas,
) {
    if (!(obj instanceof fabric.FabricImage)) return;

    const f: InstanceType<typeof fabric.filters.BaseFilter>[] = [];

    if (filters.brightness !== 0)
        f.push(new fabric.filters.Brightness({ brightness: filters.brightness }));
    if (filters.contrast !== 0) f.push(new fabric.filters.Contrast({ contrast: filters.contrast }));

    obj.filters = f;
    obj.applyFilters();
    canvas.requestRenderAll();
}

type BlurTarget = fabric.FabricObject & { layerBlur?: number };

export const createFilterSlice: SliceCreator<FilterSlice> = (set, get) => ({
    ...defaultFilters,

    setFilter: (key, value) => set(() => ({ [key]: value })),

    resetFilters: () => set(() => ({ ...defaultFilters })),

    setLayerBlur: (radius, opts = {}) => {
        const canvas = get().canvas as fabric.Canvas | null;
        if (!canvas) return;
        const objects = canvas.getActiveObjects() as BlurTarget[];
        if (!objects.length) return;
        const value = clampLayerBlur(radius);
        objects.forEach((o) => {
            o.set({ layerBlur: value, dirty: true } as Partial<BlurTarget>);
            o.group?.set('dirty', true); // a cached parent group redraws its children
        });
        canvas.requestRenderAll();
        if (opts.history !== false) get().saveState?.();
    },
});
