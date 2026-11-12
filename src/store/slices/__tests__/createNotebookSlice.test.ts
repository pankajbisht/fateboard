/**
 * Grid and snap start OFF (like Figma / Canva / Illustrator): a new board is a clean page and
 * objects move freely until the user turns them on (top bar or Ctrl/⌘ + ' / ;).
 */
import { describe, expect, it } from 'vitest';
import * as fabric from 'fabric';
import { createHarness } from '@/test/sliceHarness';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { isoRowHeight } from '@/lib/canvas/grid';
import { createNotebookSlice } from '../createNotebookSlice';
import { createSettingSlice } from '../createSettingSlice';

const make = () =>
    createHarness([createSettingSlice as never, createNotebookSlice as never], { canvas: null });

describe('notebook slice defaults', () => {
    it('grid is hidden and snapping is off on a new board', () => {
        const { get } = make();
        expect(get().gridEnabled).toBe(false);
        expect(get().snapEnabled).toBe(false);
    });

    it('turning snap on gives smart guides (snap to objects stays the default sub-option)', () => {
        const { get } = make();
        expect(get().snapToObjects).toBe(true);
        get().toggleSnap();
        expect(get().snapEnabled).toBe(true);
    });

    it('the grid can still be turned on', () => {
        const { get } = make();
        get().toggleGrid();
        expect(get().gridEnabled).toBe(true);
    });
});

describe('grid default per board mode (whiteboard tools show a dot grid; design pages start clean)', () => {
    it('entering the whiteboard turns the grid on; entering a design page turns it off', () => {
        const h = make();
        h.set({ boardMode: 'whiteboard' });
        expect(h.get().gridEnabled).toBe(true);
        h.set({ boardMode: 'design' });
        expect(h.get().gridEnabled).toBe(false);
    });

    it('the user’s choice stays while the mode stays (leaving the editor and coming back)', () => {
        const h = make();
        h.set({ boardMode: 'whiteboard' });
        h.get().toggleGrid(); // off
        h.set({ boardMode: null }); // editor closed (Settings)
        h.set({ boardMode: 'whiteboard' });
        expect(h.get().gridEnabled).toBe(false);
    });
});

describe('grid style and size (saved per mode in Settings)', () => {
    it('follows the board mode: dots on the whiteboard, graph lines on a design page', () => {
        const h = make();
        h.set({ boardMode: 'whiteboard' });
        expect(h.get().gridStyle).toBe('dots');
        h.set({ boardMode: 'design' });
        expect(h.get().gridStyle).toBe('lines');
    });

    it('setGridStyle / setGridSize change the current mode only and are saved in Settings', () => {
        const h = make();
        h.set({ boardMode: 'design' });
        h.get().setGridStyle('isometric');
        h.get().setGridSize(32);
        expect(h.get().gridStyle).toBe('isometric');
        expect(h.get().gridSize).toBe(32);
        expect(h.get().settings.grid.design).toEqual({ style: 'isometric', size: 32 });

        h.set({ boardMode: 'whiteboard' });
        expect(h.get().gridStyle).toBe('dots');
        expect(h.get().gridSize).toBe(20);

        h.set({ boardMode: 'design' });
        expect(h.get().gridStyle).toBe('isometric');
    });

    it('ignores unknown styles and sizes that are not numbers', () => {
        const h = make();
        h.get().setGridStyle('zigzag' as never);
        h.get().setGridSize(Number.NaN);
        expect(h.get().gridStyle).toBe('lines');
        expect(h.get().gridSize).toBe(20);
    });

    it('saved settings loaded at start apply to the grid', () => {
        const h = make();
        h.get().hydrate({ grid: { design: { style: 'ruled', size: 28 } } });
        expect(h.get().gridStyle).toBe('ruled');
        expect(h.get().gridSize).toBe(28);
    });
});

describe('snap to the grid that is shown', () => {
    const drag = (style: 'isometric' | 'ruled' | 'lines', left: number, top: number) => {
        const h = make();
        const canvas = createFakeCanvas() as never as fabric.Canvas;
        h.set({ canvas, boardMode: 'design' });
        h.get().setGridStyle(style);
        h.get().setGridEnabled(true);
        h.get().setSnapEnabled(true);
        h.get().setSnapToObjects(false);
        const rect = new fabric.Rect({
            left,
            top,
            width: 4,
            height: 4,
            strokeWidth: 0,
            originX: 'left',
            originY: 'top',
        });
        canvas.add(rect);
        canvas.fire('object:moving', { target: rect, e: {} } as never);
        return rect;
    };

    it('isometric: onto a triangle corner (half-side columns, triangle-height rows)', () => {
        const rect = drag('isometric', 9.2, 16.5);
        expect(rect.left).toBeCloseTo(10);
        expect(rect.top).toBeCloseTo(isoRowHeight(20));
    });

    it('ruled: onto a line vertically, free horizontally', () => {
        const rect = drag('ruled', 9.2, 19.2);
        expect(rect.left).toBeCloseTo(9.2);
        expect(rect.top).toBeCloseTo(20);
    });

    it('square styles: onto the cells', () => {
        const rect = drag('lines', 19.3, 3);
        expect(rect.left).toBeCloseTo(20);
        expect(rect.top).toBeCloseTo(0);
    });
});
