/**
 * Grid and snap start OFF (like Figma / Canva / Illustrator): a new board is a clean page and
 * objects move freely until the user turns them on (top bar or Ctrl/⌘ + ' / ;).
 */
import { describe, expect, it } from 'vitest';
import { createHarness } from '@/test/sliceHarness';
import { createNotebookSlice, gridStyleFor } from '../createNotebookSlice';

const make = () => createHarness([createNotebookSlice as never], { canvas: null });

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

describe('grid style', () => {
    it('the whiteboard grid is dots; the design grid is lines', () => {
        expect(gridStyleFor('whiteboard')).toBe('dots');
        expect(gridStyleFor('design')).toBe('lines');
        expect(gridStyleFor(null)).toBe('lines');
    });
});
