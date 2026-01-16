// store/slices/filterSlice.ts
// import { StateCreator } from 'zustand';
import * as fabric from 'fabric';

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

export function applyFabricFilters(
    obj: fabric.Object,
    filters: FilterState,
    canvas: fabric.Canvas,
) {
    const f: fabric.IBaseFilter[] = [];

    if (filters.brightness !== 0)
        f.push(new fabric.Image.filters.Brightness({ brightness: filters.brightness }));

    if (filters.contrast !== 0)
        f.push(new fabric.Image.filters.Contrast({ contrast: filters.contrast }));

    // if (filters.saturation !== 0)
    //     f.push(new fabric.Image.filters.Saturation({ saturation: filters.saturation }));

    // if (filters.blur > 0)
    //     f.push(new fabric.Image.filters.Blur({ blur: filters.blur }));

    // if (filters.noise > 0)
    //     f.push(new fabric.Image.filters.Noise({ noise: filters.noise }));

    // if (filters.pixelate > 1)
    //     f.push(new fabric.Image.filters.Pixelate({ blocksize: filters.pixelate }));

    // if (filters.hue !== 0)
    //     f.push(new fabric.Image.filters.HueRotation({ rotation: filters.hue }));

    // if (filters.gamma.some(v => v !== 1))
    //     f.push(new fabric.Image.filters.Gamma({ gamma: filters.gamma }));

    // if (filters.grayscale)
    //     f.push(new fabric.Image.filters.Grayscale());

    // if (filters.sepia)
    //     f.push(new fabric.Image.filters.Sepia());

    // if (filters.invert)
    //     f.push(new fabric.Image.filters.Invert());

    // if (filters.opacity < 1)
    //     f.push(new fabric.Image.filters.Opacity({ opacity: filters.opacity }));

    obj.filters = f;
    obj.applyFilters();
    canvas.requestRenderAll();
}

export const createFilterSlice: StateCreator<FilterSlice, [], [], FilterSlice> = (set) => ({
    ...defaultFilters,

    setFilter: (key, value) => set(() => ({ [key]: value })),

    resetFilters: () => set(() => ({ ...defaultFilters })),
});
