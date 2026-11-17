import { useEffect, useLayoutEffect } from 'react';
import { useStore } from '@store';
import type * as fabric from 'fabric';
import { designRenderRatio } from '@/lib/canvas/renderRatio';
import { applyWindow, clearWindow, needsWindow, visibleWindow } from '@/lib/canvas/deepZoom';

type Size = { width: number; height: number };

/**
 * DESIGN board canvas size (CanvasBoard is the one geometry owner, BUG-007 / Q2): the canvas is exactly the
 * page (W × H document px), shown at `display` CSS px; the viewport stays identity.
 *
 * - Up to `MAX_BACKSTORE_PX` the pixel buffer is the whole page at the density it is shown at (BUG-108).
 * - Past it (deep zoom, BUG-221) the buffer covers only the visible part of the page at full density
 *   (lib/canvas/deepZoom), re-placed as the board scrolls, so 6400 % stays sharp with a small buffer.
 *
 * A layout effect: the page frame and the canvas resize in the same paint (BUG-146). Also opens the page view
 * (`useOpenPageView` below).
 */
export function useDesignCanvasSize(
    canvas: fabric.Canvas | null,
    o: {
        isWhiteboard: boolean;
        size: Size | null | undefined;
        display: Size | null | undefined;
        scroll: { x: number; y: number };
        /** The board's scroll element: read in the effect, after the zoom re-centring wrote it. */
        scroller?: HTMLElement | null;
        view: { w: number; h: number };
        art: { x: number; y: number };
    },
): void {
    const { isWhiteboard, size, display } = o;
    // a page opening (board measured, page size changed) gets its opening zoom
    useOpenPageView(canvas, isWhiteboard, size, o.view.w > 0 && o.view.h > 0);
    const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    const scale = size && display ? display.width / size.width : 1;
    const windowed = !!size && !isWhiteboard && needsWindow(size.width, size.height, dpr * scale);
    // in deep zoom the window follows the scroll position and the view size; otherwise they do not matter
    const follow = windowed
        ? `${o.scroll.x},${o.scroll.y},${o.view.w},${o.view.h},${o.art.x},${o.art.y}`
        : '';

    useLayoutEffect(() => {
        if (isWhiteboard || !canvas || !size || !display) return;
        if (canvas.getWidth() !== size.width || canvas.getHeight() !== size.height)
            canvas.setDimensions(
                { width: size.width, height: size.height },
                { backstoreOnly: true },
            );
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]); // design zoom is the CSS size (rulers / export)

        const win = windowed
            ? visibleWindow({
                  scroll: o.scroller
                      ? { x: o.scroller.scrollLeft, y: o.scroller.scrollTop }
                      : o.scroll,
                  view: o.view,
                  art: o.art,
                  page: { w: size.width, h: size.height },
                  scale,
                  dpr,
              })
            : null;
        if (win) return applyWindow(canvas, win);

        clearWindow(canvas);
        // render at the density the page is shown at: Fabric reads this ratio everywhere (render, brush,
        // hit-testing); export uses its own multiplier, so files are unaffected
        const ratio = designRenderRatio({
            dpr,
            displayScale: scale,
            width: size.width,
            height: size.height,
        });
        (canvas as { getRetinaScaling: () => number }).getRetinaScaling = () =>
            canvas.enableRetinaScaling ? ratio : 1;
        // 1) real document pixels (this is what gets exported / saved)
        canvas.setDimensions({ width: size.width, height: size.height }, { backstoreOnly: true });
        // 2) on-screen size only; Fabric corrects pointer coordinates for the CSS scale
        canvas.setDimensions({ width: display.width, height: display.height }, { cssOnly: true });
        canvas.calcOffset?.();
        canvas.requestRenderAll();
    }, [canvas, isWhiteboard, size?.width, size?.height, display?.width, display?.height, follow]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Opening a page on the design board: when the board is first measured and when the page size changes, the
 * Page slice's `applyPageSize` sets the opening zoom (portrait pages a bit taller than the board, top first;
 * lib/canvas/pageFit `openZoom`). A window resize keeps the user's zoom.
 */
export function useOpenPageView(
    canvas: fabric.Canvas | null,
    isWhiteboard: boolean,
    size: Size | null | undefined,
    measured: boolean,
): void {
    useEffect(() => {
        if (isWhiteboard || !canvas || !size || !measured) return;
        useStore.getState().applyPageSize?.();
    }, [canvas, isWhiteboard, size?.width, size?.height, measured]); // eslint-disable-line react-hooks/exhaustive-deps -- the size by value, not by object identity
}
