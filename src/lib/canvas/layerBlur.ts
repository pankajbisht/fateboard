/**
 * Layer blur: a Gaussian blur of the object itself (Figma "Layer blur", Illustrator "Gaussian Blur"), not of
 * its drop shadow. Stored on any Fabric object as `layerBlur` (scene px at the object's own scale, 0 = off;
 * serialized through CUSTOM_PROPS). The store action is `setLayerBlur` (Filter slice).
 *
 * How it draws (installed once by `installLayerBlur`, from RootLayout next to the selection chrome):
 * - every object's `render(ctx)` runs inside `ctx.filter = 'blur(Npx)'`, N = radius × the device scale of the
 *   context (zoom, retina, export multiplier, parent groups) × the object's scale, so the blur looks the same
 *   at every zoom and in every PNG / JPG / video export (they all render through `render`);
 * - browsers without `ctx.filter` (docs/LIMITATIONS.md) get the same look from a JS blur (`boxBlur.ts`) of an
 *   offscreen copy;
 * - SVG export wraps the object's markup in an `feGaussianBlur` filter (`_createBaseSVGMarkup`, which every
 *   class's `toSVG` calls).
 */
import { FabricObject } from 'fabric';
import { boxBlurRGBA } from './boxBlur';

export const LAYER_BLUR_MAX = 100;
/** The JS fallback never allocates an offscreen side larger than this (the blur hides the down-scale). */
const FALLBACK_MAX_SIDE = 2048;
const INSTALLED = '__fbLayerBlur';

type Matrix2D = { a: number; b: number; c: number; d: number; e: number; f: number };
type BlurCtx = CanvasRenderingContext2D & { getTransform?: () => Matrix2D };
type BlurObject = FabricObject & { layerBlur?: number };

/** A safe radius: a number in 0 … LAYER_BLUR_MAX, one decimal. Anything else is 0 (off). */
export function clampLayerBlur(value: unknown): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(LAYER_BLUR_MAX, Math.round(n * 10) / 10);
}

/** Uniform scale of a 2D matrix (the square root of its area factor). */
export const matrixScale = (m: Pick<Matrix2D, 'a' | 'b' | 'c' | 'd'>) =>
    Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));

/** Blur radius in device pixels for a radius in object units, the context matrix and the object's scale. */
export function deviceBlurPx(
    radius: number,
    ctxMatrix: Pick<Matrix2D, 'a' | 'b' | 'c' | 'd'> | null,
    scaleX = 1,
    scaleY = 1,
): number {
    const k = ctxMatrix ? matrixScale(ctxMatrix) : 1;
    return radius * k * Math.sqrt(Math.abs(scaleX * scaleY));
}

/** SVG markup of a blurred object: the object's own markup inside a `<g>` with an feGaussianBlur filter. */
export function wrapSvgWithBlur(markup: string, stdDeviation: number, id: string): string {
    const sd = Math.round(stdDeviation * 1000) / 1000;
    return (
        `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">` +
        `<feGaussianBlur in="SourceGraphic" stdDeviation="${sd}" /></filter>\n` +
        `<g filter="url(#${id})">\n${markup}</g>\n`
    );
}

let filterSupport: boolean | null = null;
/** Does this browser's 2D canvas support `ctx.filter`? Asked of a fresh context (an expando would lie). */
export function canvasFilterSupported(): boolean {
    if (filterSupport !== null) return filterSupport;
    try {
        const ctx = document.createElement('canvas').getContext('2d') as BlurCtx | null;
        filterSupport = !!ctx && typeof ctx.filter === 'string';
    } catch {
        filterSupport = false;
    }
    return filterSupport;
}

/** Test hook: forget the detected support (or force it). */
export function setCanvasFilterSupportForTests(value: boolean | null): void {
    filterSupport = value;
}

/** Device-space box of the object as drawn by `render` on a context with matrix `t`. */
export function deviceBox(
    obj: Pick<FabricObject, 'calcOwnMatrix' | 'strokeWidth' | 'width' | 'height'>,
    t: Matrix2D,
    pad: number,
) {
    const own = obj.calcOwnMatrix();
    const sw = obj.strokeWidth || 0;
    const hw = (obj.width + sw) / 2;
    const hh = (obj.height + sw) / 2;
    const xs: number[] = [];
    const ys: number[] = [];
    for (const [lx, ly] of [
        [-hw, -hh],
        [hw, -hh],
        [hw, hh],
        [-hw, hh],
    ]) {
        const px = own[0] * lx + own[2] * ly + own[4];
        const py = own[1] * lx + own[3] * ly + own[5];
        xs.push(t.a * px + t.c * py + t.e);
        ys.push(t.b * px + t.d * py + t.f);
    }
    const x = Math.floor(Math.min(...xs) - pad);
    const y = Math.floor(Math.min(...ys) - pad);
    return {
        x,
        y,
        w: Math.ceil(Math.max(...xs) + pad) - x,
        h: Math.ceil(Math.max(...ys) + pad) - y,
    };
}

/** No `ctx.filter`: draw the object offscreen, blur the pixels in JS, paint the result in device space. */
function renderWithJsBlur(
    obj: BlurObject,
    ctx: BlurCtx,
    px: number,
    render: (ctx: CanvasRenderingContext2D) => void,
) {
    const t = ctx.getTransform?.();
    if (!t) return render.call(obj, ctx);
    const box = deviceBox(obj, t, Math.ceil(px * 3));
    if (box.w < 1 || box.h < 1) return;
    const k = Math.min(1, FALLBACK_MAX_SIDE / Math.max(box.w, box.h));
    const off = document.createElement('canvas');
    off.width = Math.max(1, Math.round(box.w * k));
    off.height = Math.max(1, Math.round(box.h * k));
    const octx = off.getContext('2d');
    if (!octx) return render.call(obj, ctx);
    octx.setTransform(k, 0, 0, k, -box.x * k, -box.y * k);
    octx.transform(t.a, t.b, t.c, t.d, t.e, t.f);
    render.call(obj, octx);
    const img = octx.getImageData(0, 0, off.width, off.height);
    boxBlurRGBA(img.data, off.width, off.height, px * k);
    octx.putImageData(img, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(off, box.x, box.y, box.w, box.h);
    ctx.restore();
}

let svgIds = 0;

/** Patch Fabric once so `layerBlur` renders (screen, raster export) and exports (SVG). Idempotent. */
export function installLayerBlur(): void {
    const proto = FabricObject.prototype as unknown as Record<string, unknown> & {
        render: (ctx: CanvasRenderingContext2D) => void;
        _createBaseSVGMarkup: (markup: string[], options?: object) => string;
    };
    if (proto[INSTALLED]) return;
    proto[INSTALLED] = true;

    const render = proto.render;
    proto.render = function (this: BlurObject, ctx: CanvasRenderingContext2D) {
        const radius = this.layerBlur ?? 0;
        if (!(radius > 0)) return render.call(this, ctx);
        const c = ctx as BlurCtx;
        const px = deviceBlurPx(radius, c.getTransform?.() ?? null, this.scaleX, this.scaleY);
        if (px < 0.25) return render.call(this, ctx);
        if (!canvasFilterSupported()) return renderWithJsBlur(this, c, px, render);
        ctx.save();
        const prev = ctx.filter && ctx.filter !== 'none' ? `${ctx.filter} ` : '';
        ctx.filter = `${prev}blur(${px}px)`;
        render.call(this, ctx);
        ctx.restore();
    };

    const base = proto._createBaseSVGMarkup;
    proto._createBaseSVGMarkup = function (this: BlurObject, markup: string[], options?: object) {
        const svg = base.call(this, markup, options);
        const radius = this.layerBlur ?? 0;
        if (!(radius > 0)) return svg;
        // the wrapper sits in the parent's user space: scale the radius by the object's own scale
        const sd = radius * Math.sqrt(Math.abs(this.scaleX * this.scaleY));
        return wrapSvgWithBlur(svg, sd, `LAYERBLUR_${++svgIds}`);
    };
}
