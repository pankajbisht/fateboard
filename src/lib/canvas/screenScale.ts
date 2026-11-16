import type * as fabric from 'fabric';
import { canvasClientRect } from './deepZoom';

/**
 * Screen px per scene px: viewport zoom × the CSS scale of the canvas element (the design board
 * shows the page scaled to fit, so 1 scene px can be 0.5 screen px).
 */
export function screenScale(canvas: fabric.Canvas): number {
    const zoom = canvas.getZoom() || 1;
    const rect = canvasClientRect(canvas); // the page on screen (also while deep zoom draws a window)
    const width = canvas.getWidth();
    const css = rect?.width && width ? rect.width / width : 1;
    return zoom * (css > 0 && Number.isFinite(css) ? css : 1);
}
