import { useEffect, type RefObject } from 'react';
import type { Canvas } from 'fabric';
import { useStore } from '@store';
import { attachTouchGestures } from '@/lib/canvas/touchGestures';

/** Tools that draw on a finger drag: after a pen was used, one finger pans with these instead. */
const DRAW_TOOLS = new Set(['draw', 'pencil', 'pen', 'laser']);

/** Fabric's own handlers: a synthetic event on the canvas goes through its target lookup. */
function fireMouse(canvas: Canvas, type: 'contextmenu' | 'dblclick', x: number, y: number) {
    canvas.upperCanvasEl.dispatchEvent(
        new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            detail: type === 'dblclick' ? 2 : 0,
            button: type === 'contextmenu' ? 2 : 0,
        }),
    );
}

/**
 * Touch on the board (lib/canvas/touchGestures): pinch zoom and two-finger pan through the Page
 * slice (`pinchZoom` → `setZoom`, `panBy`), long press = context menu, double tap = dblclick,
 * pen-only drawing. `rootRef` is the element around the canvas (design: the scrolling board).
 */
export function useTouchGestures(rootRef: RefObject<HTMLElement | null>, canvas: Canvas | null) {
    useEffect(() => {
        const root = rootRef.current;
        if (!root || !canvas?.upperCanvasEl) return;
        return attachTouchGestures(root, {
            isCanvasTarget: (t) => t === canvas.upperCanvasEl,
            forwardStart: (e) => canvas._onTouchStart(e),
            forwardMove: (e) => canvas._onMouseMove(e),
            forwardEnd: (e) => canvas._onTouchEnd(e),
            getMode: () => {
                const tool = String(useStore.getState().activeTool ?? '');
                return {
                    panOnly: tool === 'pan',
                    drawing: canvas.isDrawingMode || DRAW_TOOLS.has(tool),
                    longPress: tool === 'select' && !canvas.isDrawingMode,
                    doubleTap: !canvas.isDrawingMode,
                };
            },
            pan: (dx, dy) => useStore.getState().panBy(dx, dy),
            pinch: (f, x, y) => useStore.getState().pinchZoom(f, x, y),
            longPress: (x, y) => fireMouse(canvas, 'contextmenu', x, y),
            doubleTap: (x, y) => fireMouse(canvas, 'dblclick', x, y),
        });
    }, [rootRef, canvas]);
}

/**
 * While the editor is open, a pinch must zoom the board, never the page (iOS Safari ignores
 * `user-scalable=no` and sends its own `gesture*` events), and an overscroll must not pull to
 * refresh (Android) or bounce the page.
 */
export function usePreventPageZoom() {
    useEffect(() => {
        const html = document.documentElement;
        const previous = html.style.overscrollBehavior;
        html.style.overscrollBehavior = 'none';
        const stop = (e: Event) => e.preventDefault();
        const opts: AddEventListenerOptions = { passive: false };
        for (const t of ['gesturestart', 'gesturechange']) document.addEventListener(t, stop, opts);
        return () => {
            html.style.overscrollBehavior = previous;
            for (const t of ['gesturestart', 'gesturechange'])
                document.removeEventListener(t, stop, opts);
        };
    }, []);
}
