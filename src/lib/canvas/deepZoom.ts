/**
 * Design board deep zoom (BUG-221, decision Q2 amended 2026-11-16). The design canvas stays a page-sized
 * Fabric canvas with an identity viewport (export, thumbnails, templates, snapping and the rulers rely on
 * that). Only its pixel buffer changes: up to `MAX_BACKSTORE_PX` it covers the whole page (CanvasBoard,
 * `designRenderRatio`); past that, it covers just the visible part of the page (a "window") at full screen
 * density, drawn with a translated base transform, so zooming in to 6400 % stays sharp with a buffer no
 * bigger than the view. Pointer events get the window's offset back (`_getPointerImpl`).
 *
 * Anything that maps the canvas to the screen asks `canvasClientRect` (the page's rectangle on screen,
 * whatever the buffer covers) or `baseTransform` (the context's page → device transform).
 */
import { FabricObject, type Canvas, type Point } from 'fabric';
import type * as fabric from 'fabric';
import { MAX_BACKSTORE_PX } from './renderRatio';

/** The part of the page the buffer covers, in page px, and its densities. */
export type ZoomWindow = {
    ox: number;
    oy: number;
    ww: number;
    wh: number;
    /** CSS px per page px (fit × zoom). */
    scale: number;
    /** Device px per page px (devicePixelRatio × scale). */
    ratio: number;
};

type WindowedCanvas = fabric.Canvas & {
    __fbWindow?: ZoomWindow | null;
    __fbPointerPatched?: boolean;
    contextTop?: CanvasRenderingContext2D;
    contextContainer?: CanvasRenderingContext2D;
    _getPointerImpl?: (e: Event, fromViewport?: boolean) => fabric.Point;
};

/** Extra page area drawn around the view (CSS px), so a fast scroll never shows an empty edge. */
export const WINDOW_MARGIN_CSS = 96;

/** Does a page this big at this density need a window (a full-page buffer would be too large)? */
export const needsWindow = (pageW: number, pageH: number, ratio: number) =>
    Math.max(pageW, pageH) * ratio > MAX_BACKSTORE_PX;

/**
 * The visible part of the page: the scroller shows `view` (CSS px) from `scroll`, the artboard starts at
 * `art` (CSS px inside the stage) and is drawn at `scale` CSS px per page px.
 */
export function visibleWindow(o: {
    scroll: { x: number; y: number };
    view: { w: number; h: number };
    art: { x: number; y: number };
    page: { w: number; h: number };
    scale: number;
    dpr: number;
    margin?: number;
}): ZoomWindow | null {
    const s = o.scale;
    if (!(s > 0) || !(o.page.w > 0) || !(o.page.h > 0)) return null;
    const m = (o.margin ?? WINDOW_MARGIN_CSS) / s;
    const x0 = Math.max(0, Math.floor((o.scroll.x - o.art.x) / s - m));
    const y0 = Math.max(0, Math.floor((o.scroll.y - o.art.y) / s - m));
    const x1 = Math.min(o.page.w, Math.ceil((o.scroll.x + o.view.w - o.art.x) / s + m));
    const y1 = Math.min(o.page.h, Math.ceil((o.scroll.y + o.view.h - o.art.y) / s + m));
    if (x1 <= x0 || y1 <= y0) return null;
    return { ox: x0, oy: y0, ww: x1 - x0, wh: y1 - y0, scale: s, ratio: Math.max(1, o.dpr) * s };
}

export const windowOf = (canvas: fabric.Canvas | null | undefined): ZoomWindow | null =>
    (canvas as WindowedCanvas | null | undefined)?.__fbWindow ?? null;

/** The page → device transform of the canvas contexts (what Fabric draws under). */
export function baseTransform(
    canvas: fabric.Canvas,
): [number, number, number, number, number, number] {
    const w = windowOf(canvas);
    const r = canvas.getRetinaScaling();
    return w ? [r, 0, 0, r, -w.ox * r, -w.oy * r] : [r, 0, 0, r, 0, 0];
}

/** Where the whole page is on screen (client px), also while only a window of it is drawn. */
export function canvasClientRect(
    canvas: fabric.Canvas,
): { left: number; top: number; width: number; height: number } | null {
    const upper = (canvas as WindowedCanvas).upperCanvasEl;
    const r = upper?.getBoundingClientRect?.();
    if (!r) return null;
    const w = windowOf(canvas);
    if (!w) return { left: r.left, top: r.top, width: r.width, height: r.height };
    return {
        left: r.left - w.ox * w.scale,
        top: r.top - w.oy * w.scale,
        width: canvas.getWidth() * w.scale,
        height: canvas.getHeight() * w.scale,
    };
}

/** Page px per CSS px of the page on screen (1 / fit × zoom on the design board). */
export function canvasPxPerCss(canvas: fabric.Canvas): number {
    const rect = canvasClientRect(canvas);
    const k = rect?.width ? canvas.getWidth() / rect.width : 1;
    return Number.isFinite(k) && k > 0 ? k : 1;
}

function sizeElement(
    el: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D | undefined,
    w: ZoomWindow,
) {
    el.width = Math.max(1, Math.ceil(w.ww * w.ratio));
    el.height = Math.max(1, Math.ceil(w.wh * w.ratio));
    el.style.width = `${w.ww * w.scale}px`;
    el.style.height = `${w.wh * w.scale}px`;
    ctx?.setTransform(w.ratio, 0, 0, w.ratio, -w.ox * w.ratio, -w.oy * w.ratio);
}

/** Pointer events: Fabric maps them into the window; add the window's origin back (page coordinates). */
function patchPointer(canvas: WindowedCanvas) {
    if (canvas.__fbPointerPatched || !canvas._getPointerImpl) return;
    canvas.__fbPointerPatched = true;
    const impl = canvas._getPointerImpl.bind(canvas);
    canvas._getPointerImpl = (e, fromViewport) => {
        const p = impl(e, fromViewport);
        const w = canvas.__fbWindow;
        return w ? p.add({ x: w.ox, y: w.oy } as Point) : p;
    };
}

/**
 * Fabric draws the selection handles after `ctx.setTransform(retina, 0, 0, retina, 0, 0)`, which drops the window's
 * offset: while a window is drawn, that reset keeps the offset (one prototype patch, installed on first use).
 */
function patchControls() {
    const proto = FabricObject.prototype as unknown as Record<string, unknown> & {
        drawControls: (this: FabricObject, ctx: CanvasRenderingContext2D, style?: object) => void;
    };
    if (proto.__fbDeepZoomControls) return;
    proto.__fbDeepZoomControls = true;
    const draw = proto.drawControls;
    proto.drawControls = function (
        this: FabricObject,
        ctx: CanvasRenderingContext2D,
        style?: object,
    ) {
        const w = windowOf(this.canvas as Canvas | undefined);
        if (!w) return draw.call(this, ctx, style);
        const native = ctx.setTransform;
        ctx.setTransform = function (this: CanvasRenderingContext2D, ...m: number[]) {
            const [a, b, c, d, e, f] = m;
            return native.call(this, a, b, c, d, e - a * w.ox - c * w.oy, f - b * w.ox - d * w.oy);
        } as typeof ctx.setTransform;
        try {
            return draw.call(this, ctx, style);
        } finally {
            ctx.setTransform = native;
        }
    };
}

/** Draw only `w` of the page (deep zoom). The logical canvas stays page-sized. */
export function applyWindow(canvas: fabric.Canvas, w: ZoomWindow): void {
    const c = canvas as WindowedCanvas;
    patchPointer(c);
    patchControls();
    c.__fbWindow = w;
    // export / thumbnails turn retina off (`toCanvasElement`): shadows and blur must not use the screen density then
    (c as { getRetinaScaling: () => number }).getRetinaScaling = () =>
        c.enableRetinaScaling ? w.ratio : 1;
    sizeElement(c.lowerCanvasEl, c.contextContainer, w);
    if (c.upperCanvasEl) sizeElement(c.upperCanvasEl, c.contextTop, w);
    const wrapper = c.wrapperEl;
    if (wrapper) {
        Object.assign(wrapper.style, {
            position: 'absolute',
            left: `${w.ox * w.scale}px`,
            top: `${w.oy * w.scale}px`,
            width: `${w.ww * w.scale}px`,
            height: `${w.wh * w.scale}px`,
        });
    }
    c.calcOffset?.();
    c.requestRenderAll();
}

/** Back to a full-page buffer: the caller then sizes the canvas as usual (`setDimensions`). */
export function clearWindow(canvas: fabric.Canvas): void {
    const c = canvas as WindowedCanvas;
    if (!c.__fbWindow) return;
    c.__fbWindow = null;
    const wrapper = c.wrapperEl;
    if (wrapper) Object.assign(wrapper.style, { position: 'relative', left: '', top: '' });
}
