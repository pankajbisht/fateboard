import * as fabric from 'fabric';
import type { SliceCreator } from '../types';

export interface NotebookSlice {
    gridEnabled: boolean;
    gridSize: number;
    toggleGrid: () => void;
    drawGrid: () => void;
}

export const createNotebookSlice: SliceCreator<NotebookSlice> = (set, get, store) => ({
    gridEnabled: true,
    gridSize: 20, // like math notebook spacing

    toggleGrid: () => {
        const canvas = get().canvas;
        if (!canvas) return;

        set({ gridEnabled: !get().gridEnabled });
        get().drawGrid(); // redraw
    },

    drawGrid: () => {
        const canvas = get().canvas;
        if (!canvas) return;

        const { gridEnabled, gridSize } = get();

        // clear old background
        canvas.setBackgroundImage(null, canvas.renderAll.bind(canvas));

        if (!gridEnabled) return;

        // const { width, height } = canvas;

        // create grid pattern
        const gridCanvas = document.createElement('canvas');
        gridCanvas.width = gridSize;
        gridCanvas.height = gridSize;
        const ctx = gridCanvas.getContext('2d')!;

        ctx.strokeStyle = '#e0e0e0'; // light gray lines
        ctx.lineWidth = 1;

        // vertical line
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, gridSize);
        ctx.stroke();

        // horizontal line
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(gridSize, 0);
        ctx.stroke();

        // create pattern
        const pattern = new fabric.Pattern({
            source: gridCanvas,
            repeat: 'repeat',
        });

        // apply as background
        canvas.setBackgroundColor(pattern, canvas.renderAll.bind(canvas));
    },
});
