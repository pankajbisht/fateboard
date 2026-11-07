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
    /** Whiteboard: zoom / pan so `rect` (scene px) fills the view. Design: no-op (CanvasBoard fits the page). */
    zoomToRect: (
        rect: { left: number; top: number; width: number; height: number },
        padding?: number,
    ) => void;
    applyPageSize: (format?: PageFormat, orientation?: Orientation) => void;
}

type GeometryPeers = {
    settings?: { freehand?: boolean };
    selectedPreset?: { width: number; height: number } | null;
    cw?: number;
    ch?: number;
};

/**
 * Design board = CanvasBoard owns the canvas size + viewport (decision Q2, BUG-007). Before the
 * board reports its mode (init), Settings > Freehand decides (Q3: off = design).
 */
const isDesignBoard = (s: { boardMode?: 'design' | 'whiteboard' | null } & GeometryPeers) =>
    s.boardMode ? s.boardMode === 'design' : !s.settings?.freehand;

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
    // ONE zoom path (BUG-007 / BUG-025). Design: CanvasBoard draws the page at fitScale × zoom and
    // scrolls, so only the state changes. Whiteboard: the viewport zooms around `point` (canvas px,
    // default: view centre) and `zoom` always equals the viewport zoom.
    setZoom: (next, point) => {
        const canvas = get().canvas;
        if (!canvas) return;
        const zoom = clamp(next, MIN_ZOOM, MAX_ZOOM);

        if (isDesignBoard(get() as never)) {
            set({ zoom }, false, 'page/setZoom');
            return;
        }

        const p = point
            ? new fabric.Point(point.x, point.y)
            : new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
        canvas.zoomToPoint(p, zoom);
        set({ zoom }, false, 'page/setZoom');
        canvas.requestRenderAll();
    },

    zoomIn: () => get().setZoom(get().zoom * ZOOM_STEP),
    zoomOut: () => get().setZoom(get().zoom / ZOOM_STEP),
    zoomToRect: (rect, padding = 40) => {
        const canvas = get().canvas;
        if (!canvas || isDesignBoard(get() as never)) return;
        if (!(rect.width > 0 && rect.height > 0)) return;
        const viewW = canvas.getWidth();
        const viewH = canvas.getHeight();
        const zoom = clamp(
            Math.min(
                Math.max(viewW - padding * 2, 1) / rect.width,
                Math.max(viewH - padding * 2, 1) / rect.height,
            ),
            MIN_ZOOM,
            MAX_ZOOM,
        );
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        canvas.setViewportTransform([
            zoom,
            0,
            0,
            zoom,
            viewW / 2 - cx * zoom,
            viewH / 2 - cy * zoom,
        ]);
        set({ zoom }, false, 'page/zoomToRect');
        canvas.requestRenderAll();
    },

    fitToScreen: () => {
        if (isDesignBoard(get() as never)) {
            set({ zoom: 1 }, false, 'page/fit');
            return;
        }
        get().applyPageSize();
    },

    // Design: CanvasBoard owns the canvas size and viewport (Q2, BUG-007); this only resets the
    // zoom and mirrors the page size (one source: `selectedPreset`). Whiteboard: back to 1:1.
    applyPageSize: () => {
        const canvas = get().canvas;
        if (!canvas) return;
        const peers = get() as unknown as GeometryPeers;

        if (isDesignBoard(get() as never)) {
            const preset = peers.selectedPreset;
            set(
                {
                    zoom: 1,
                    ...(preset ? { pageWidth: preset.width, pageHeight: preset.height } : {}),
                },
                false,
                'page/applySize',
            );
            return;
        }

        const width = peers.cw || canvas.getWidth();
        const height = peers.ch || canvas.getHeight();
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        canvas.calcOffset();
        set({ scale: 1, zoom: 1, pageWidth: width, pageHeight: height }, false, 'page/applySize');
        get().drawBackground?.();
        canvas.requestRenderAll();
    },
});
