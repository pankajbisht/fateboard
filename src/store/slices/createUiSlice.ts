import type { SliceCreator } from '../types';

type ToolBarPosition = 'left';

export interface UiSlice {
    toolbarPosition: ToolBarPosition;
    isFullScreen: boolean;
    setToolbarPosition: (pos: ToolBarPosition) => void;
    toggleFullscreen: () => void;
    zoomFit: () => void;
    actualSize: () => void;
}

export const createUISlice: SliceCreator<UiSlice> = (set, get, store) => ({
    toolbarPosition: 'left',
    isFullScreen: false,

    setToolbarPosition: (pos) => set({ toolbarPosition: pos }),

    toggleFullscreen: () => {
        const elem = document.documentElement;

        if (!document.fullscreenElement) {
            elem.requestFullscreen?.();
            set({ isFullScreen: true });
        } else {
            document.exitFullscreen?.();
            set({ isFullScreen: false });
        }
    },

    // Whiteboard fit / 100% go through the page slice's one zoom path (BUG-025); the design
    // board fits / zooms through the same actions (state only, CanvasBoard draws).
    zoomFit: () => {
        const canvas = get().canvas;
        if (!canvas) return;
        const st = get() as unknown as {
            boardMode?: string;
            fitToScreen?: () => void;
            zoomToRect?: (r: { left: number; top: number; width: number; height: number }) => void;
        };
        if (st.boardMode === 'design') {
            st.fitToScreen?.();
            return;
        }

        const objs = canvas.getObjects().filter((o) => o.visible && !o.excludeFromExport);
        if (objs.length === 0) {
            st.fitToScreen?.(); // empty board: back to 1:1
            return;
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        objs.forEach((o) => {
            const r = o.getBoundingRect();
            minX = Math.min(minX, r.left);
            minY = Math.min(minY, r.top);
            maxX = Math.max(maxX, r.left + r.width);
            maxY = Math.max(maxY, r.top + r.height);
        });
        st.zoomToRect?.({ left: minX, top: minY, width: maxX - minX, height: maxY - minY });
    },

    actualSize: () => {
        const canvas = get().canvas;
        if (!canvas) return;
        const st = get() as unknown as {
            boardMode?: string;
            scale?: number;
            setZoom?: (z: number) => void;
        };
        // design: 100% on screen = zoom 1 / fit scale (CanvasBoard draws fit × zoom); whiteboard: 1
        st.setZoom?.(st.boardMode === 'design' ? 1 / (st.scale || 1) : 1);
    },
});
