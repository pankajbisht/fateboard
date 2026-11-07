import * as fabric from 'fabric';
import type { SliceCreator } from '../types';
import { PAGE_SIZES } from '@lib/const/editor';
import type { Orientation, PageFormat } from '@lib/types/page';

/**
 * NOTE: add 'Custom' to your PageFormat union in lib/types/page.ts:
 *   export type PageFormat = 'Freehand' | 'Custom' | 'A4' | ...;
 */

export type CustomPageSize = { w: number; h: number };

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 1.25;
export const MIN_PAGE_PX = 50;
export const MAX_PAGE_PX = 10000;

const PAGE_PADDING = 48; // breathing room around the page inside the workspace
const FALLBACK_FIT_WIDTH = 800; // used until the workspace size (cw/ch) is known
const MAX_FIT_SCALE = 2; // never blow tiny pages up more than 2x on "fit"
export const DEFAULT_PAGE_BACKGROUND = '#ffffff';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const isFreehand = (format: PageFormat | string) =>
    String(format || '').toLowerCase() === 'freehand';
const isCustom = (format: PageFormat | string) => String(format || '').toLowerCase() === 'custom';

/**
 * Resolve a format + orientation into real page pixels.
 * Works whether PAGE_SIZES stores portrait or landscape, and ignores key casing.
 */
export const resolvePageSize = (
    format: PageFormat,
    orientation: Orientation,
    custom: CustomPageSize | null,
): CustomPageSize | null => {
    let base: CustomPageSize | null;

    if (isCustom(format)) {
        base = custom;
    } else {
        const sizes = PAGE_SIZES as unknown as Record<string, { w: number; h: number }>;
        const key = Object.keys(sizes).find(
            (k) => k.toLowerCase() === String(format || '').toLowerCase(),
        );
        base = key ? sizes[key] : null;
    }

    if (!base) return null;
    const short = Math.min(base.w, base.h);
    const long = Math.max(base.w, base.h);
    return orientation === 'portrait' ? { w: short, h: long } : { w: long, h: short };
};

const computeFitScale = (width: number, height: number, cw?: number, ch?: number) => {
    if (!cw || !ch) return FALLBACK_FIT_WIDTH / width;
    const availW = Math.max(cw - PAGE_PADDING * 2, 100);
    const availH = Math.max(ch - PAGE_PADDING * 2, 100);
    return Math.min(availW / width, availH / height, MAX_FIT_SCALE);
};

export interface PageSlice {
    pageFormat: PageFormat;
    orientation: Orientation;
    customSize: CustomPageSize | null;
    pageBackground: string;

    /** User zoom multiplier. 1 = "fit to screen" in paper mode, real 100% in freehand. */
    zoom: number;
    /** Fit scale (page px -> screen px at zoom 1). Always 1 in freehand. */
    scale: number;
    /** Logical page size in page pixels. */
    pageWidth: number;
    pageHeight: number;

    setPageFormat: (format: PageFormat, orientation?: Orientation) => void;
    setOrientation: (orientation: Orientation) => void;
    setCustomPageSize: (w: number, h: number) => void;
    setPageBackground: (color: string) => void;
    /**
     * Which board is mounted. 'design' = CanvasBoard owns the geometry (page drawn at
     * fitScale × zoom, ADR Q2): zoom actions only change state. 'whiteboard' / null = viewport zoom.
     */
    boardMode: 'design' | 'whiteboard' | null;
    setBoardMode: (mode: 'design' | 'whiteboard' | null) => void;
    setZoom: (zoom: number, point?: { x: number; y: number }) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    fitToScreen: () => void;
    applyPageSize: (format?: PageFormat, orientation?: Orientation) => void;
}

export const createPageSlice: SliceCreator<PageSlice> = (set, get) => ({
    pageFormat: 'Freehand',
    orientation: 'landscape',
    customSize: null,
    pageBackground: DEFAULT_PAGE_BACKGROUND,
    zoom: 1,
    scale: 1,
    boardMode: null,
    setBoardMode: (boardMode) => set({ boardMode }, false, 'page/boardMode'),
    pageWidth: 0,
    pageHeight: 0,

    // FIX: orientation default now keeps the current orientation (the old 'portrait'
    // default made the parameter's meaning depend on call site), and the action
    // name no longer says 'page/orientation' for a format change.
    setPageFormat: (format, orientation = get().orientation) => {
        set({ pageFormat: format, orientation }, false, 'page/setFormat');
        get().applyPageSize(format, orientation);
    },

    setOrientation: (orientation) => {
        if (isFreehand(get().pageFormat)) return; // nothing to rotate in freehand
        set({ orientation }, false, 'page/setOrientation');
        get().applyPageSize(get().pageFormat, orientation);
    },

    setCustomPageSize: (w, h) => {
        const width = Math.round(clamp(Number(w) || 0, MIN_PAGE_PX, MAX_PAGE_PX));
        const height = Math.round(clamp(Number(h) || 0, MIN_PAGE_PX, MAX_PAGE_PX));
        const orientation: Orientation = width > height ? 'landscape' : 'portrait';
        set(
            {
                customSize: { w: width, h: height },
                pageFormat: 'Custom' as PageFormat,
                orientation,
            },
            false,
            'page/setCustomSize',
        );
        get().applyPageSize('Custom' as PageFormat, orientation);
    },

    setPageBackground: (color) => {
        const canvas = get().canvas;
        set({ pageBackground: color }, false, 'page/setBackground');
        if (!canvas) return;
        canvas.backgroundColor = color;
        canvas.requestRenderAll();
    },

    // FIX: zoom used to only call canvas.setZoom() on a fixed-size element, so the page
    // got clipped instead of growing, and `zoom` state desynced from `scale` after
    // every applyPageSize. Now: paper mode resizes the element to pageSize * scale * zoom,
    // freehand zooms around a point (default: viewport centre).
    setZoom: (next, point) => {
        const canvas = get().canvas;
        if (!canvas) return;
        const zoom = clamp(next, MIN_ZOOM, MAX_ZOOM);

        // design board: CanvasBoard draws the page at fitScale × zoom and scrolls; don't touch
        // the canvas here (writing the viewport / element size fought CanvasBoard, BUG-007)
        if (get().boardMode === 'design') {
            set({ zoom }, false, 'page/setZoom');
            return;
        }

        if (isFreehand(get().pageFormat)) {
            const p = point
                ? new fabric.Point(point.x, point.y)
                : new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
            canvas.zoomToPoint(p, zoom);
            set({ zoom }, false, 'page/setZoom');
        } else {
            const { pageWidth, pageHeight, scale } = get();
            if (!pageWidth || !pageHeight) return;
            const eff = scale * zoom;
            canvas.setDimensions({ width: pageWidth * eff, height: pageHeight * eff });
            canvas.setViewportTransform([eff, 0, 0, eff, 0, 0]);
            canvas.calcOffset();
            set({ zoom }, false, 'page/setZoom');
        }

        get().drawBackground?.();
        canvas.requestRenderAll();
    },

    zoomIn: () => get().setZoom(get().zoom * ZOOM_STEP),
    zoomOut: () => get().setZoom(get().zoom / ZOOM_STEP),
    fitToScreen: () => {
        if (get().boardMode === 'design') {
            set({ zoom: 1 }, false, 'page/fit');
            return;
        }
        get().applyPageSize();
    },

    // Recomputes canvas dimensions + fit scale. Also resets zoom to 1 ("fit").
    // Call it again (via fitToScreen) when the workspace container is resized.
    applyPageSize: (format = get().pageFormat, orientation = get().orientation) => {
        const canvas = get().canvas;
        if (!canvas) return;

        if (isFreehand(format)) {
            const width = get().cw || canvas.getWidth();
            const height = get().ch || canvas.getHeight();

            canvas.setDimensions({ width, height });
            canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
            canvas.calcOffset();
            set(
                { scale: 1, zoom: 1, pageWidth: width, pageHeight: height },
                false,
                'page/applySize',
            );
            get().drawBackground?.();
            canvas.requestRenderAll();
            return;
        }

        // FIX: unknown formats used to throw on `PAGE_SIZES[format]` destructuring.
        const size = resolvePageSize(format, orientation, get().customSize);
        if (!size) {
            console.warn(`[page] Unknown page format "${format}"`);
            return;
        }

        // FIX: scale used to be a hard-coded 800px wide. Now it fits the whole page
        // (width AND height) into the workspace.
        const scale = computeFitScale(size.w, size.h, get().cw, get().ch);

        canvas.setDimensions({ width: size.w * scale, height: size.h * scale });
        canvas.setViewportTransform([scale, 0, 0, scale, 0, 0]);
        canvas.calcOffset();

        set({ scale, zoom: 1, pageWidth: size.w, pageHeight: size.h }, false, 'page/applySize');
        get().drawBackground?.();
        canvas.requestRenderAll();
    },
});
