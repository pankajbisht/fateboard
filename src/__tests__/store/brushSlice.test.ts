import { describe, it, expect, vi } from 'vitest';
import { createBrushSlice } from 'src/store/slices/createBrushSlice';

describe('createBrushSlice', () => {
    it('setBrush sets brush, color and width on canvas and calls set', () => {
        const state: any = {
            canvas: {
                freeDrawingBrush: { color: '#000', width: 2 },
                freeDrawingCursor: '',
                requestRenderAll: vi.fn(),
            },
        };

        const set = vi.fn((patch) => Object.assign(state, patch));
        const get = () => state;
        const store = {} as any;

        const slice = createBrushSlice(set as any, get as any, store as any);

        // set default brush
        slice.setBrush({ brush: 'pencil', color: '#abc', width: 10, cursor: 'url()' });

        expect(state.canvas.freeDrawingBrush.color).toBe('#abc');
        expect(state.canvas.freeDrawingBrush.width).toBe(10);
        expect(state.canvas.freeDrawingCursor).toBe('url()');
        expect(set).toHaveBeenCalled();
    });

    it('setBrushWidth updates width and calls set', () => {
        const state: any = {
            canvas: {
                freeDrawingBrush: { width: 3 },
                requestRenderAll: vi.fn(),
            },
        };
        const set = vi.fn((patch) => Object.assign(state, patch));
        const get = () => state;
        const store = {} as any;

        const slice = createBrushSlice(set as any, get as any, store as any);
        slice.setBrushWidth({ width: 7 });

        expect((state.canvas.freeDrawingBrush as any).width).toBe(7);
        expect(set).toHaveBeenCalled();
        expect(state.canvas.requestRenderAll).toHaveBeenCalled();
    });

    it('setBrushColor updates color and calls set', () => {
        const state: any = {
            canvas: {
                freeDrawingBrush: { color: '#000' },
                requestRenderAll: vi.fn(),
            },
        };
        const set = vi.fn((patch) => Object.assign(state, patch));
        const get = () => state;
        const store = {} as any;

        const slice = createBrushSlice(set as any, get as any, store as any);
        slice.setBrushColor({ color: '#123' });

        expect((state.canvas.freeDrawingBrush as any).color).toBe('#123');
        expect(set).toHaveBeenCalled();
        expect(state.canvas.requestRenderAll).toHaveBeenCalled();
    });
});
