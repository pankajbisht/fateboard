// store/slices/filterSlice.ts
// import { StateCreator } from 'zustand';
import * as fabric from 'fabric';
import type { StateCreator } from 'zustand';

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
    opacity: number; // 0 → 1
};

export type FilterActions = {
    setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
    resetFilters: () => void;
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
    opacity: 1,
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

export const createFilterSlice: StateCreator<FilterSlice, [], [], FilterSlice> = (set) => ({
    ...defaultFilters,

    setFilter: (key, value) => set(() => ({ [key]: value })),

    resetFilters: () => set(() => ({ ...defaultFilters })),
});
