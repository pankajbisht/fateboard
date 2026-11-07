// filterEngine.ts  (v2)
// Pure logic for image filters (Fabric.js v6). No React in here.
import * as fabric from 'fabric';
import { filters as F } from 'fabric';

/* ======================================================
   TYPES
====================================================== */

export type AnyFilter = F.BaseFilter<string, any>;

export type NumericKey =
    | 'exposure' // -1 → 1
    | 'brightness' // -1 → 1
    | 'contrast' // -1 → 1
    | 'gamma' // 0.2 → 2.2 (1 = neutral)
    | 'fade' // 0 → 1 (lifts blacks, matte look)
    | 'opacity' // 0 → 1 (object opacity)
    | 'saturation' // -1 → 1
    | 'vibrance' // -1 → 1
    | 'hue' // -1 → 1 (Fabric v6 range, 1 = 180deg)
    | 'temperature' // -1 → 1 (cool → warm)
    | 'tint' // -1 → 1 (green → magenta)
    | 'sharpen' // 0 → 1
    | 'blur' // 0 → 1
    | 'noise' // 0 → 1
    | 'pixelate' // 1 → 20 (1 = neutral)
    | 'threshold' // 0 → 1 (0 = off, black/white cut-off)
    | 'tintAmount' // 0 → 1 (color overlay strength)
    | 'removeColorDistance'; // 0 → 1

export type ToggleKey =
    'grayscale' | 'sepia' | 'invert' | 'edge' | 'emboss' | 'duotone' | 'removeColor';

export type ColorKey = 'duotoneShadow' | 'duotoneHighlight' | 'tintColor' | 'removeColorValue';

export type MatrixName = 'vintage' | 'polaroid' | 'kodachrome' | 'technicolor' | 'brownie';

export type PresetKey =
    | 'none'
    | 'vivid'
    | 'dramatic'
    | 'cinematic'
    | 'noir'
    | 'warm'
    | 'cool'
    | 'faded'
    | 'matte'
    | 'vintage'
    | 'polaroid'
    | 'kodachrome'
    | 'technicolor'
    | 'brownie'
    | 'sunset'
    | 'ocean'
    | 'sharpPro';

export type FilterState = Record<NumericKey, number> &
    Record<ToggleKey, boolean> &
    Record<ColorKey, string> & {
        matrix: MatrixName | null;
        matrixAmount: number; // 0 → 1
        preset: PresetKey | null;
        presetIntensity: number; // 0 → 1
    };

/* ======================================================
   DEFAULTS
====================================================== */

export const DEFAULT_FILTER_STATE: FilterState = {
    exposure: 0,
    brightness: 0,
    contrast: 0,
    gamma: 1,
    fade: 0,
    opacity: 1,
    saturation: 0,
    vibrance: 0,
    hue: 0,
    temperature: 0,
    tint: 0,
    sharpen: 0,
    blur: 0,
    noise: 0,
    pixelate: 1,
    threshold: 0,
    tintAmount: 0,
    removeColorDistance: 0.2,

    grayscale: false,
    sepia: false,
    invert: false,
    edge: false,
    emboss: false,
    duotone: false,
    removeColor: false,

    duotoneShadow: '#1b1464',
    duotoneHighlight: '#fbc2eb',
    tintColor: '#ff6a00',
    removeColorValue: '#ffffff',

    matrix: null,
    matrixAmount: 0,
    preset: null,
    presetIntensity: 1,
};

/* ======================================================
   COLOR MATRIX MATH  (4 rows x 5 cols, row-major, 20 numbers)
====================================================== */

type Mat = number[];

const IDENTITY: Mat = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0];
const LR = 0.2126;
const LG = 0.7152;
const LB = 0.0722;

const COLOR_MATRICES: Record<MatrixName, Mat> = {
    vintage: [
        0.6279, 0.3202, -0.0396, 0, 0, 0.0253, 0.6441, 0.0326, 0, 0, 0.0466, -0.0851, 0.5242, 0, 0,
        0, 0, 0, 1, 0,
    ],
    polaroid: [
        1.438, -0.062, -0.062, 0, 0, -0.122, 1.378, -0.122, 0, 0, -0.016, -0.016, 1.483, 0, 0, 0, 0,
        0, 1, 0,
    ],
    kodachrome: [
        1.1285582396593525, -0.3967382283601348, -0.03992559172921793, 0, 0.24991995145,
        -0.16404339962244616, 1.0835251566291304, -0.05498805115633132, 0, 0.09698983488,
        -0.16786010706155763, -0.5603416277695248, 1.6014850761964943, 0, 0.13972481, 0, 0, 0, 1, 0,
    ],
    technicolor: [
        1.9125277891456083, -0.8545344976951645, -0.09155508482755585, 0, 0.04624942,
        -0.3087833385928097, 1.7658908555458428, -0.10601743074722245, 0, -0.27589944,
        -0.231103377548616, -0.7501899197440212, 1.847597816108189, 0, 0.12137309, 0, 0, 0, 1, 0,
    ],
    brownie: [
        0.5997023498159715, 0.34553243048391263, -0.2708298674538042, 0, 0.18601,
        -0.037703249837783157, 0.8609577587992641, 0.15059552388459913, 0, -0.14497,
        0.24113635128153335, -0.07441037908422492, 0.44972182064877153, 0, -0.02965, 0, 0, 0, 1, 0,
    ],
};

/** Blend between identity (k=0) and matrix (k=1). */
const mixMatrix = (m: Mat, k: number): Mat => m.map((v, i) => IDENTITY[i] + (v - IDENTITY[i]) * k);

/** Apply `a` first, then `b`. */
const multiplyMatrix = (a: Mat, b: Mat): Mat => {
    const out = new Array(20).fill(0);
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 5; c++) {
            let sum = 0;
            for (let k = 0; k < 4; k++) sum += b[r * 5 + k] * a[k * 5 + c];
            if (c === 4) sum += b[r * 5 + 4];
            out[r * 5 + c] = sum;
        }
    }
    return out;
};

const hexToRgb01 = (hex: string): [number, number, number] => {
    const h = hex.replace('#', '');
    const full =
        h.length === 3
            ? h
                  .split('')
                  .map((c) => c + c)
                  .join('')
            : h;
    const n = parseInt(full, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const gainMatrix = (r: number, g: number, b: number, offset = 0): Mat => [
    r,
    0,
    0,
    0,
    offset,
    0,
    g,
    0,
    0,
    offset,
    0,
    0,
    b,
    0,
    offset,
    0,
    0,
    0,
    1,
    0,
];

const exposureMatrix = (e: number): Mat => {
    const gain = Math.pow(2, e);
    return gainMatrix(gain, gain, gain);
};

const temperatureTintMatrix = (temperature: number, tint: number): Mat =>
    gainMatrix(
        1 + 0.25 * temperature + 0.1 * tint,
        1 - 0.2 * tint,
        1 - 0.25 * temperature + 0.1 * tint,
    );

const fadeMatrix = (f: number): Mat => gainMatrix(1 - 0.3 * f, 1 - 0.3 * f, 1 - 0.3 * f, 0.15 * f);

/** Maps luminance onto a shadow → highlight gradient. */
const duotoneMatrix = (shadowHex: string, highlightHex: string): Mat => {
    const [sr, sg, sb] = hexToRgb01(shadowHex);
    const [hr, hg, hb] = hexToRgb01(highlightHex);
    const row = (s: number, h: number) => [LR * (h - s), LG * (h - s), LB * (h - s), 0, s];
    return [...row(sr, hr), ...row(sg, hg), ...row(sb, hb), 0, 0, 0, 1, 0];
};

/** Hard black/white cut at luminance `t`. */
const thresholdMatrix = (t: number): Mat => {
    const k = 40;
    const row = [k * LR, k * LG, k * LB, 0, -k * t];
    return [...row, ...row, ...row, 0, 0, 0, 1, 0];
};

/* ======================================================
   KERNELS
====================================================== */

const sharpenKernel = (a: number) => [0, -a, 0, -a, 1 + 4 * a, -a, 0, -a, 0];
const EDGE_KERNEL = [-1, -1, -1, -1, 8, -1, -1, -1, -1];
const EMBOSS_KERNEL = [-2, -1, 0, -1, 1, 1, 0, 1, 2];

/* ======================================================
   STATE -> FABRIC FILTERS (fixed order, compact array, no nulls)
====================================================== */

export function buildFilters(s: FilterState): AnyFilter[] {
    const out: AnyFilter[] = [];

    if (s.brightness !== 0) out.push(new F.Brightness({ brightness: s.brightness }));
    if (s.contrast !== 0) out.push(new F.Contrast({ contrast: s.contrast }));
    if (s.saturation !== 0) out.push(new F.Saturation({ saturation: s.saturation }));
    if (s.vibrance !== 0) out.push(new F.Vibrance({ vibrance: s.vibrance }));
    if (s.hue !== 0) out.push(new F.HueRotation({ rotation: s.hue }));
    if (s.gamma !== 1) out.push(new F.Gamma({ gamma: [s.gamma, s.gamma, s.gamma] }));

    // Everything matrix-based is folded into ONE ColorMatrix pass (faster on GPU)
    let m: Mat = IDENTITY;
    let hasMatrix = false;
    const add = (mat: Mat) => {
        m = multiplyMatrix(m, mat);
        hasMatrix = true;
    };

    if (s.exposure !== 0) add(exposureMatrix(s.exposure));
    if (s.temperature !== 0 || s.tint !== 0) add(temperatureTintMatrix(s.temperature, s.tint));
    if (s.matrix && s.matrixAmount > 0) add(mixMatrix(COLOR_MATRICES[s.matrix], s.matrixAmount));
    if (s.fade > 0) add(fadeMatrix(s.fade));
    if (s.duotone) add(duotoneMatrix(s.duotoneShadow, s.duotoneHighlight));
    if (s.threshold > 0) add(thresholdMatrix(s.threshold));
    if (hasMatrix) out.push(new F.ColorMatrix({ matrix: m }));

    if (s.grayscale) out.push(new F.Grayscale({ mode: 'luminosity' }));
    if (s.sepia) out.push(new F.Sepia());
    if (s.invert) out.push(new F.Invert());

    if (s.tintAmount > 0)
        out.push(new F.BlendColor({ color: s.tintColor, mode: 'tint', alpha: s.tintAmount }));
    if (s.removeColor)
        out.push(new F.RemoveColor({ color: s.removeColorValue, distance: s.removeColorDistance }));

    if (s.sharpen > 0) out.push(new F.Convolute({ matrix: sharpenKernel(s.sharpen) }));
    if (s.edge) out.push(new F.Convolute({ matrix: EDGE_KERNEL }));
    if (s.emboss) out.push(new F.Convolute({ matrix: EMBOSS_KERNEL }));

    if (s.blur > 0) out.push(new F.Blur({ blur: s.blur }));
    if (s.noise > 0) out.push(new F.Noise({ noise: s.noise * 400 }));
    if (s.pixelate > 1) out.push(new F.Pixelate({ blocksize: Math.round(s.pixelate) }));

    return out;
}

/* ======================================================
   PRESETS
====================================================== */

export const FILTER_PRESETS: Record<PresetKey, { label: string; values: Partial<FilterState> }> = {
    none: { label: 'Original', values: {} },
    vivid: {
        label: 'Vivid',
        values: { brightness: 0.05, contrast: 0.3, saturation: 0.45, vibrance: 0.3 },
    },
    dramatic: {
        label: 'Dramatic',
        values: { contrast: 0.5, saturation: -0.2, gamma: 1.15, sharpen: 0.3 },
    },
    cinematic: {
        label: 'Cinema',
        values: { contrast: 0.3, saturation: 0.15, gamma: 1.15, temperature: 0.15, tint: -0.1 },
    },
    noir: { label: 'Noir', values: { grayscale: true, contrast: 0.4 } },
    warm: { label: 'Warm', values: { temperature: 0.55, saturation: 0.1 } },
    cool: { label: 'Cool', values: { temperature: -0.55, saturation: 0.05 } },
    faded: { label: 'Faded', values: { brightness: 0.08, contrast: -0.2, saturation: -0.3 } },
    matte: { label: 'Matte', values: { fade: 0.7, contrast: -0.1, saturation: -0.1 } },
    vintage: { label: 'Vintage', values: { matrix: 'vintage', noise: 0.08 } },
    polaroid: { label: 'Polaroid', values: { matrix: 'polaroid' } },
    kodachrome: { label: 'Kodak', values: { matrix: 'kodachrome' } },
    technicolor: { label: 'Techni', values: { matrix: 'technicolor' } },
    brownie: { label: 'Brownie', values: { matrix: 'brownie' } },
    sunset: {
        label: 'Sunset',
        values: { duotone: true, duotoneShadow: '#2b1055', duotoneHighlight: '#ffb199' },
    },
    ocean: {
        label: 'Ocean',
        values: { duotone: true, duotoneShadow: '#001f3f', duotoneHighlight: '#7fdbff' },
    },
    sharpPro: { label: 'Sharp', values: { sharpen: 0.6, contrast: 0.2 } },
};

export const PRESET_KEYS = Object.keys(FILTER_PRESETS) as PresetKey[];

/** Full state for a preset at a given intensity (0 → 1). Numbers blend from neutral. */
export function stateFromPreset(key: PresetKey, intensity = 1): FilterState {
    const next: any = {
        ...DEFAULT_FILTER_STATE,
        preset: key === 'none' ? null : key,
        presetIntensity: intensity,
    };
    const values: any = FILTER_PRESETS[key].values;
    const defaults: any = DEFAULT_FILTER_STATE;

    for (const k of Object.keys(values)) {
        const v = values[k];
        if (k === 'matrix') {
            next.matrix = v;
            next.matrixAmount = intensity;
        } else if (typeof v === 'number') next[k] = defaults[k] + (v - defaults[k]) * intensity;
        else if (typeof v === 'boolean') next[k] = v && intensity >= 0.5;
        else if (typeof v === 'string') next[k] = v; // colors
    }
    return next as FilterState;
}

/* ======================================================
   PER-IMAGE STATE  (stored on the Fabric object itself)
====================================================== */

export const isFabricImage = (o: unknown): o is fabric.FabricImage =>
    o instanceof fabric.FabricImage;

export function getImageFilterState(img: fabric.FabricImage): FilterState {
    const saved = (img as any).filterState as Partial<FilterState> | undefined;
    // an image that was never filtered keeps whatever opacity it already had
    return { ...DEFAULT_FILTER_STATE, opacity: img.opacity ?? 1, ...(saved ?? {}) };
}

export function applyStateToImage(img: fabric.FabricImage, state: FilterState) {
    (img as any).filterState = state;
    img.filters = buildFilters(state) as any;
    img.applyFilters();
    img.set({ opacity: state.opacity, dirty: true });
}

/** Temporarily show the untouched image (for "hold to compare"). Does not change saved state. */
export function previewOriginal(img: fabric.FabricImage, showOriginal: boolean) {
    img.filters = (showOriginal ? [] : buildFilters(getImageFilterState(img))) as any;
    img.applyFilters();
    img.set('dirty', true);
}

/* ======================================================
   PRESET THUMBNAILS (from ORIGINAL pixels, never from filtered ones)
====================================================== */

const THUMB = 72;

export function makeThumbSource(img: fabric.FabricImage): HTMLCanvasElement | null {
    const el: any = (img as any).getOriginalElement?.() ?? (img as any)._originalElement;
    if (!el) return null;

    const w = el.naturalWidth ?? el.videoWidth ?? el.width;
    const h = el.naturalHeight ?? el.videoHeight ?? el.height;
    if (!w || !h) return null;

    const side = Math.min(w, h);
    const c = document.createElement('canvas');
    c.width = c.height = THUMB;
    c.getContext('2d')!.drawImage(
        el,
        (w - side) / 2,
        (h - side) / 2,
        side,
        side,
        0,
        0,
        THUMB,
        THUMB,
    );
    return c;
}

export async function renderPresetThumbs(
    source: HTMLCanvasElement,
    keys: PresetKey[],
    isCancelled: () => boolean,
): Promise<Record<string, string>> {
    const result: Record<string, string> = {};

    for (const key of keys) {
        if (isCancelled()) break;
        try {
            const t = new fabric.FabricImage(source);
            t.filters = buildFilters(stateFromPreset(key, 1)) as any;
            t.applyFilters();

            const out = document.createElement('canvas');
            out.width = out.height = THUMB;
            out.getContext('2d')!.drawImage(
                t.getElement() as CanvasImageSource,
                0,
                0,
                THUMB,
                THUMB,
            );
            result[key] = out.toDataURL('image/jpeg', 0.85);
        } catch (err) {
            console.warn(`Preset thumbnail failed for "${key}"`, err);
        }
        await new Promise((r) => setTimeout(r)); // let the UI breathe
    }
    return result;
}

/* ======================================================
   FLATTEN ANY OBJECT TO AN IMAGE (bakes filters / shapes)
====================================================== */

export function flattenToImage(canvas: fabric.Canvas, obj: fabric.FabricObject) {
    const longest = Math.max(obj.getScaledWidth(), obj.getScaledHeight());
    const multiplier = Math.min(2, 4096 / Math.max(longest, 1)); // stay under GPU texture limits

    const center = obj.getCenterPoint();
    const el = obj.toCanvasElement({ multiplier });
    const img = new fabric.FabricImage(el, {
        originX: 'center',
        originY: 'center',
        left: center.x,
        top: center.y,
        scaleX: 1 / multiplier,
        scaleY: 1 / multiplier,
    });

    canvas.remove(obj);
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.requestRenderAll();
    return img;
}
