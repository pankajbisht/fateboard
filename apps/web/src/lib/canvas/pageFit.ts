/**
 * Design board fit (InDesign "Fit Page in Window" / Clip Studio "Fit to screen", 2026-11-17), pure. One formula
 * for CanvasBoard (its fit scale: visible zoom = fit × zoom) and the Page slice's `fitToWidth`. The page plus
 * `extent` page px on every side (bleed / slug frames, crop marks: lib/document/printMarks) fills the view
 * minus a small gap. Fit page never enlarges a page past 100 %; fit width may.
 */
type Box = { w: number; h: number };

/** Gap between the view's edge and the fitted page, CSS px. */
export const FIT_GAP = 16;
export const MIN_FIT_SCALE = 0.05;
export const MAX_FIT_SCALE = 1;

export const fitGap = (view: Box): number => (Math.min(view.w, view.h) < 480 ? 8 : FIT_GAP);

export function pageFitScale(view: Box, page: Box, extent: number, mode: 'page' | 'width'): number {
    if (view.w <= 0 || view.h <= 0 || page.w <= 0 || page.h <= 0) return 1;
    const gap = fitGap(view);
    const byWidth = Math.max(1, view.w - gap * 2) / (page.w + 2 * extent);
    if (mode === 'width') return Math.max(MIN_FIT_SCALE, byWidth);
    const byHeight = Math.max(1, view.h - gap * 2) / (page.h + 2 * extent);
    return Math.min(MAX_FIT_SCALE, Math.max(MIN_FIT_SCALE, Math.min(byWidth, byHeight)));
}

/**
 * The scroll area along one axis: the view, or the page + margins when zoomed past it. Floored: the page size
 * is rounded, so a fitted page + frames could pass the view by a fraction of a px and add a 1 px scroll (and,
 * with classic scrollbars, a scrollbar that changes the view and the fit again). The margin keeps ≥ 7 px slack.
 */
export const fitStage = (view: number, display: number, margin: number): number =>
    Math.max(view, Math.floor(display + margin * 2));

/** Portrait pages open this much past the fit, so the page looks long and scrolls a little (owner 2026-11-17). */
export const PORTRAIT_OPEN_ZOOM = 1.3;

/**
 * The zoom (× the fit) a page opens at: portrait pages 1.3 × the fit, never wider than the board (Fit width);
 * landscape and square pages, or an unknown view, at the fit. "Fit to screen" (zoom 1) still shows the whole page.
 */
export function openZoom(view: Box, page: Box, extent: number): number {
    if (page.h <= page.w || view.w <= 0 || view.h <= 0) return 1;
    const fit = pageFitScale(view, page, extent, 'page');
    const width = pageFitScale(view, page, extent, 'width');
    return Math.max(1, Math.min(PORTRAIT_OPEN_ZOOM, width / fit));
}
