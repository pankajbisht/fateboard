/**
 * Grid and snap start OFF (like Figma / Canva / Illustrator): a new board is a clean page and
 * objects move freely until the user turns them on (top bar or Ctrl/⌘ + ' / ;).
 */
import { describe, expect, it } from 'vitest';
import { createHarness } from '@/test/sliceHarness';
import { createNotebookSlice } from '../createNotebookSlice';

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
