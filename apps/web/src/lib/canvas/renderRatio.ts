/** Browsers refuse (or silently blank) canvases with a side much larger than this. */
export const MAX_BACKSTORE_PX = 8192;
// Fabric applies a backstore ratio only above 1 (setCanvasDimensions) but its pointer maths divides by
// any ratio: below 1 clicks land in the wrong place. So 1 is the floor.
const MIN_RATIO = 1;

/**
 * Backstore pixels per page pixel for the design board (BUG-108): the density the page is actually
 * shown at (`devicePixelRatio × on-screen scale`), never below 1. Zoomed out on retina it saves memory
 * (a 1920 × 1080 page at 40 % allocates 1920 × 1080 per layer, not 3840 × 2160); zoomed in it stays
 * sharp instead of upscaling a fixed bitmap. Capped so no backstore side exceeds `MAX_BACKSTORE_PX`. Export is not
 * affected: it renders at its own multiplier.
 */
export function designRenderRatio({
    dpr,
    displayScale,
    width,
    height,
}: {
    dpr: number;
    displayScale: number;
    width: number;
    height: number;
}): number {
    if (!(dpr > 0) || !(displayScale > 0) || !(width > 0) || !(height > 0)) return 1;
    const wanted = dpr * displayScale;
    const cap = MAX_BACKSTORE_PX / Math.max(width, height);
    return Math.max(MIN_RATIO, Math.min(wanted, cap));
}
