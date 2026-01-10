import type { SliceCreator } from '../types';
import * as fabric from 'fabric';

type ToolBarPosition = 'left';

export interface UiSlice {
    toolbarPosition: ToolBarPosition;
    isFullScreen: boolean;
    setToolbarPosition: (pos: ToolBarPosition) => void;
    toggleFullscreen: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    zoomFit: () => void;
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

    zoomIn: () => {
        const canvas = get().canvas;
        if (!canvas) return;
        const center = new fabric.Point(canvas.width / 2, canvas.height / 2);
        const next = Math.min(canvas.getZoom() * 1.1, 5);
        canvas.zoomToPoint(center, next);
        canvas.requestRenderAll();
    },

    zoomOut: () => {
        const canvas = get().canvas;
        if (!canvas) return;
        const center = new fabric.Point(canvas.width / 2, canvas.height / 2);
        const next = Math.max(canvas.getZoom() / 1.1, 0.1);
        canvas.zoomToPoint(center, next);
        canvas.requestRenderAll();
    },

    zoomFit: () => {
        const canvas = get().canvas;
        if (!canvas) return;

        const objs = canvas.getObjects().filter((o) => o.visible);
        if (objs.length === 0) {
            // reset to 1:1 centered
            const vpt = canvas.viewportTransform;
            const scale = 1;
            vpt[0] = scale;
            vpt[3] = scale;
            vpt[4] = 0;
            vpt[5] = 0;
            canvas.setViewportTransform(vpt);
            canvas.requestRenderAll();
            return;
        }

        // compute union bounds in absolute coords (transforms applied)
        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
        objs.forEach((o) => {
            const r = (o as any).getBoundingRect(true, true);
            minX = Math.min(minX, r.left);
            minY = Math.min(minY, r.top);
            maxX = Math.max(maxX, r.left + r.width);
            maxY = Math.max(maxY, r.top + r.height);
        });

        const bounds = {
            left: minX,
            top: minY,
            width: maxX - minX,
            height: maxY - minY,
        };
        const padding = 20;
        const fitW = canvas.width - padding * 2;
        const fitH = canvas.height - padding * 2;

        let scale = Math.min(fitW / bounds.width, fitH / bounds.height);
        scale = Math.min(Math.max(scale, 0.1), 5);

        // center the bounds in viewport
        const cx = bounds.left + bounds.width / 2;
        const cy = bounds.top + bounds.height / 2;
        const vpt = canvas.viewportTransform;
        vpt[0] = scale; // scaleX
        vpt[3] = scale; // scaleY
        vpt[4] = canvas.width / 2 - cx * scale; // translateX
        vpt[5] = canvas.height / 2 - cy * scale; // translateY
        canvas.setViewportTransform(vpt);
        canvas.requestRenderAll();
    },

    actualSize: () => {
        const canvas = get().canvas;
        if (!canvas) return;

        canvas.setZoom(1);

        canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
        canvas.requestRenderAll();
    },
});
