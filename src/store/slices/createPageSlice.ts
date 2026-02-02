import type { SliceCreator } from '../types';
import { PAGE_SIZES } from '../../lib/const/editor';
import type { Orientation, PageFormat } from '../../lib/types/page';

export interface PageSlice {
    pageFormat: PageFormat;
    orientation: Orientation;
    zoom: number;
    scale: number;

    setPageFormat: (format: PageFormat, orientation: Orientation) => void;
    setOrientation: (orientation: Orientation) => void;
    setZoom: (zoom: number) => void;
    applyPageSize: (format: PageFormat, orientation: Orientation) => void;
}

export const createPageSlice: SliceCreator<PageSlice> = (set, get, store) => ({
    pageFormat: 'Freehand',
    orientation: 'landscape',
    zoom: 1,
    scale: 1,

    setPageFormat: (format, orientation = 'portrait') => {
        set({ pageFormat: format, orientation }, false, 'page/orientation');
        get().applyPageSize(format, orientation);
    },

    setOrientation: (orientation) => {
        set({ orientation }, false, 'page/orientation');
        get().applyPageSize(get().pageFormat, orientation);
    },

    setZoom: (zoom) => {
        const canvas = get().canvas;
        if (!canvas) return;
        canvas.setZoom(zoom);
        set({ zoom });
        get().drawBackground();
        canvas.renderAll();
    },

    applyPageSize: (format = get().pageFormat, orientation = get().orientation) => {
        const canvas = get().canvas;
        if (!canvas) return;

        // normalize name
        const fmt = String(format || '').toLowerCase();

        if (fmt === 'freehand') {
            canvas.setDimensions({
                width: get().cw,
                height: get().ch,
            });

            canvas.setZoom(1);
            canvas.calcOffset();
            canvas.renderAll();
            set(
                {
                    scale: 1,
                    pageWidth: canvas.getWidth(),
                    pageHeight: canvas.getHeight(),
                },
                false,
                'page/applysize',
            );

            return;
        }

        // Paper mode
        const { w, h } = PAGE_SIZES[format];
        const width = orientation === 'portrait' ? w : h;
        const height = orientation === 'portrait' ? h : w;

        const MAX_PAGE_WIDTH = 800;
        const scale = MAX_PAGE_WIDTH / width;

        canvas.setDimensions({
            width: width * scale,
            height: height * scale,
        });

        canvas.setZoom(scale);
        canvas.calcOffset();
        canvas.renderAll();

        set({ scale, pageWidth: width, pageHeight: height }, false, 'page/applysize');
        get().drawBackground();
    },
});
