/**
 * Notes + the REAL undo history (fate-reviewer findings, 2026-11-17): the other notes tests mock `saveState`, so the
 * 150 ms debounce and the duplicate-snapshot check never ran there.
 */
import * as fabric from 'fabric';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHarness, type Harness } from '@/test/sliceHarness';
import { serializeCanvas } from '@/lib/serialization';
import { createUndoRedoSlice } from '../createUndoRedoSlice';
import { createNotesSlice, type NotesSlice } from '../createNotesSlice';

type S = NotesSlice & {
    undoStack: string[];
    initHistory: () => void;
    saveState: (immediate?: boolean) => void;
    undo: () => Promise<void>;
    canvas: fabric.Canvas | null;
};
let h: Harness<S>;
let canvas: fabric.Canvas;
let toasts: { onAction?: () => void }[];
const settle = () => vi.advanceTimersByTime(200); // past the 150 ms history debounce
const rect = (extra: Record<string, unknown> = {}) =>
    new fabric.Rect({
        left: 10,
        top: 10,
        width: 50,
        height: 50,
        originX: 'left',
        originY: 'top',
        strokeWidth: 0,
        ...extra,
    });
const texts = () => h.get().pageNotes.map((n) => n.text);

beforeEach(() => {
    vi.useFakeTimers();
    toasts = [];
    canvas = new fabric.Canvas(document.createElement('canvas'), { renderOnAddRemove: false });
    h = createHarness<S>([createUndoRedoSlice as never, createNotesSlice as never], {
        canvas: null,
        activeTool: 'select',
        isPageSwitching: false,
        persist: () => {},
        showToast: (t: { onAction?: () => void }) => toasts.push(t),
    });
    h.set({ canvas });
    h.get().initHistory();
});
afterEach(() => {
    vi.useRealTimers();
    h.set({ canvas: null });
    canvas.dispose();
});

describe('notes with the real undo history', () => {
    it('Undo in the "Note deleted" toast brings the note back with its text, nothing else', async () => {
        canvas.add(rect());
        h.get().saveState(true); // the user drew a rectangle
        const id = h.get().addNote({ x: 5, y: 5 })!;
        h.get().updateNote(id, { text: 'important' }); // left the field
        h.get().deleteNote(id); // clicked Delete at once (inside the debounce)
        settle();
        vi.useRealTimers();
        toasts[0]!.onAction!();
        await vi.waitFor(() => expect(texts()).toEqual(['important']));
        expect(canvas.getObjects()).toHaveLength(1);
    });

    it('an empty new note is deleted without a step or a toast', () => {
        const before = h.get().undoStack.length;
        const id = h.get().addNote({ x: 5, y: 5 })!;
        h.get().deleteNote(id);
        settle();
        expect(h.get().pageNotes).toEqual([]);
        expect(toasts).toEqual([]);
        expect(h.get().undoStack).toHaveLength(before);
    });

    it('undo never brings back an empty note (no ghost pins)', async () => {
        const a = h.get().addNote({ x: 5, y: 5 })!;
        h.get().updateNote(a, { text: 'A' });
        h.get().setActiveNote(null); // click outside: saved and closed...
        h.get().addNote({ x: 50, y: 50 }); // ...and the same click drops an empty note B
        settle();
        h.get().setActiveNote(null); // B closed empty: dropped
        settle();
        vi.useRealTimers();
        await h.get().undo();
        expect(texts().every((t) => t !== '')).toBe(true);
    });

    it('closing an empty note linked to an object adds no step (Ctrl+Z is never a no-op)', () => {
        const r = rect();
        canvas.add(r);
        h.get().saveState(true);
        const before = h.get().undoStack.length;
        h.get().addNote({ x: 0, y: 0 }, r); // gives the rectangle a shapeId
        h.get().setActiveNote(null);
        settle();
        expect(h.get().undoStack).toHaveLength(before);
    });

    it('typing is on the page at once (autosave sees it) and the burst is one step', () => {
        const id = h.get().addNote({ x: 5, y: 5 })!;
        const before = h.get().undoStack.length;
        for (const t of ['H', 'He', 'Hel', 'Hello']) {
            h.get().updateNote(id, { text: t }, { record: false });
            settle();
        }
        expect(
            (serializeCanvas(canvas) as { pageNotes: { text: string }[] }).pageNotes[0]!.text,
        ).toBe('Hello');
        expect(h.get().undoStack).toHaveLength(before);
        h.get().saveNoteEdits(id); // left the field
        settle();
        expect(h.get().undoStack).toHaveLength(before + 1);
        h.get().saveNoteEdits(id); // nothing new
        settle();
        expect(h.get().undoStack).toHaveLength(before + 1);
    });

    it('closing a note records its unsaved typing', () => {
        const id = h.get().addNote({ x: 5, y: 5 })!;
        const before = h.get().undoStack.length;
        h.get().updateNote(id, { text: 'typed' }, { record: false });
        h.get().setActiveNote(null);
        settle();
        expect(h.get().undoStack).toHaveLength(before + 1);
        expect(texts()).toEqual(['typed']);
    });
});

describe('loads drop empty notes', () => {
    it('an empty note saved by mistake never comes back from a file or snapshot', async () => {
        const kept = { id: 'k', x: 1, y: 1, text: 'keep' };
        await canvas.loadFromJSON({ objects: [], pageNotes: [{ id: 'e', x: 1, y: 1 }, kept] });
        expect(h.get().pageNotes.map((n) => n.id)).toEqual(['k']);
    });

    it('the open empty note survives the own writes of the slice', () => {
        const id = h.get().addNote({ x: 5, y: 5 })!;
        h.get().addNote({ x: 9, y: 9 }); // another note: the first (empty) one is dropped on close…
        expect(h.get().pageNotes.some((n) => n.id === id)).toBe(false);
        const open = h.get().activeNoteId!;
        h.get().setNotesVisible(false);
        expect(h.get().pageNotes.some((n) => n.id === open)).toBe(true); // …the open one stays
    });
});

describe('deleting a group around a linked object', () => {
    it('keeps the pin where the linked child was last', () => {
        const child = rect({ shapeId: 'kid' });
        const group = new fabric.Group([child, rect({ left: 100 })]);
        canvas.add(group);
        h.get().addNote({ x: 0, y: 0 }, child);
        group.set({ left: group.left + 200 });
        group.setCoords();
        child.setCoords();
        const expected = child.getBoundingRect();
        canvas.remove(group);
        const n = h.get().pageNotes[0]!;
        expect(n.x).toBeCloseTo(expected.left + expected.width);
        expect(n.y).toBeCloseTo(expected.top);
    });
});
