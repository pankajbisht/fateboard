/**
 * How much bigger than its base size a new object is made (shapes, sticky notes, text, pictures).
 *
 * Base sizes (the shape catalog, the Text panel presets) are what a new object measures on a
 * whiteboard at 100 %. Like the design and whiteboard tools people know:
 * - design page (Canva): new objects follow the PAGE, not the zoom. A page whose shorter side is
 *   `DESIGN_REFERENCE_SIDE` px gets the base sizes; a 1920 × 1080 page gets 1.8 ×.
 * - whiteboard (FigJam, Miro): new objects follow the ZOOM, so they look the same on screen at any
 *   zoom (zoomed out to 50 % they are made twice as big).
 * An object given an explicit size keeps it.
 */
export const DESIGN_REFERENCE_SIDE = 600;

const MIN_SCALE = 0.25;
const MAX_SCALE = 8;

export type CreationScaleInput = {
    boardMode?: 'design' | 'whiteboard' | null;
    pageWidth?: number;
    pageHeight?: number;
    /** The whiteboard's viewport zoom (`canvas.getZoom()`). */
    viewportZoom?: number;
};

const clamp = (v: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));
const positive = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0;

export function creationScale({
    boardMode,
    pageWidth,
    pageHeight,
    viewportZoom,
}: CreationScaleInput): number {
    if (boardMode === 'whiteboard') return positive(viewportZoom) ? clamp(1 / viewportZoom) : 1;
    if (!positive(pageWidth) || !positive(pageHeight)) return 1;
    return clamp(Math.min(pageWidth, pageHeight) / DESIGN_REFERENCE_SIDE);
}

/** The scale for the store's current board (page size, board mode, viewport zoom). */
export function creationScaleOf(state: {
    boardMode?: 'design' | 'whiteboard' | null;
    pageWidth?: number;
    pageHeight?: number;
    canvas?: { getZoom?: () => number } | null;
}): number {
    return creationScale({
        boardMode: state.boardMode,
        pageWidth: state.pageWidth,
        pageHeight: state.pageHeight,
        viewportZoom: state.canvas?.getZoom?.(),
    });
}
