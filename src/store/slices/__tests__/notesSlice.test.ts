/**
 * Notes slice (2026-11-17): note pins saved per page as the canvas prop `pageNotes`, the Note tool (N), and the
 * actions the Notes panel and the pin pop-over call. Every change to a note is one undo step (`saveState`).
 */
import * as fabric from 'fabric';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHarness, type Harness } from '@/test/sliceHarness';
import { CUSTOM_PROPS, serializeCanvas } from '@/lib/serialization';
import { createNotesSlice, type NotesSlice } from '../createNotesSlice';

type PageRec = { id: string; name: string; canvasJSON: Record<string, unknown> | null };
type S = NotesSlice & {
    canvas: fabric.Canvas | null;
    activeTool: string;
    pages: PageRec[];
    currentPageId: string;
    isPageSwitching: boolean;
};
let h: Harness<S>;
let canvas: fabric.Canvas;
const saveState = vi.fn();
const showToast = vi.fn();
const undo = vi.fn();
const centerViewOn = vi.fn();
const setActiveTool = vi.fn();
const switchPage = vi.fn(async (id: string) => {
    await canvas.loadFromJSON(savedPages[id] ?? { objects: [] });
    h.set({ currentPageId: id });
});
let savedPages: Record<string, Record<string, unknown>> = {};

const rect = (left: number, top: number, extra: Record<string, unknown> = {}) =>
    new fabric.Rect({
        left,
        top,
        width: 100,
        height: 80,
        originX: 'left',
        originY: 'top',
        strokeWidth: 0,
        ...extra,
    });
const click = (x: number, y: number, button = 0) =>
    canvas.fire('mouse:down', { e: { button }, scenePoint: new fabric.Point(x, y) } as never);
const notes = () => h.get().pageNotes;
/** Recorded steps: `saveState()`; `saveState(true)` flushes pending history first (add / delete). */
const steps = () => saveState.mock.calls.filter((c) => c[0] !== true).length;

beforeEach(() => {
    canvas = new fabric.Canvas(document.createElement('canvas'), { renderOnAddRemove: false });
    h = createHarness<S>([createNotesSlice as never], {
        canvas: null,
        activeTool: 'select',
        pages: [
            { id: 'p1', name: 'One', canvasJSON: { objects: [] } },
            { id: 'p2', name: 'Two', canvasJSON: { objects: [] } },
        ],
        currentPageId: 'p1',
        isPageSwitching: false,
        saveState,
        showToast,
        undo,
        centerViewOn,
        setActiveTool,
        switchPage,
    });
    h.set({ canvas }); // the slice binds itself when the store gets a canvas
});
afterEach(() => {
    h.set({ canvas: null });
    canvas.dispose();
    vi.clearAllMocks();
});

describe('notes live on the page', () => {
    it('is a saved canvas prop (one serialize list)', () => {
        expect(CUSTOM_PROPS).toContain('pageNotes');
    });

    it('a note travels with save / load and is mirrored in the store', async () => {
        const id = h.get().addNote({ x: 40, y: 50 })!;
        h.get().updateNote(id, { text: 'Check the margin' });
        const json = serializeCanvas(canvas) as { pageNotes: { text: string }[] };
        expect(json.pageNotes[0]!.text).toBe('Check the margin');

        await canvas.loadFromJSON({ objects: [] }); // another page, saved before notes existed
        expect(notes()).toEqual([]);
        await canvas.loadFromJSON(json);
        expect(notes()[0]).toMatchObject({ id, text: 'Check the margin', x: 40, y: 50 });
    });

    it('does nothing without a canvas', () => {
        h.set({ canvas: null });
        expect(h.get().addNote({ x: 1, y: 1 })).toBeNull();
        expect(h.get().updateNote('x', { text: 'a' })).toBe(false);
        expect(h.get().deleteNote('x')).toBe(false);
    });

    it('binds to a new canvas and lets go of the old one', () => {
        const other = new fabric.Canvas(document.createElement('canvas'));
        h.set({ canvas: other });
        h.get().addNote({ x: 1, y: 2 });
        expect((other as unknown as { pageNotes: unknown[] }).pageNotes).toHaveLength(1);
        expect((canvas as unknown as { pageNotes: unknown[] }).pageNotes).toEqual([]);
        other.dispose();
    });
});

describe('history (undo snapshots hold the notes)', () => {
    it('a new empty note is not a step; its first text is', () => {
        const id = h.get().addNote({ x: 0, y: 0 })!;
        expect(steps()).toBe(0);
        expect(h.get().activeNoteId).toBe(id);
        h.get().updateNote(id, { text: 'hello' });
        expect(steps()).toBe(1);
    });

    it('an unchanged update records nothing', () => {
        const id = h.get().addNote({ x: 0, y: 0 })!;
        h.get().updateNote(id, { text: 'a' });
        saveState.mockClear();
        expect(h.get().updateNote(id, { text: 'a' })).toBe(false);
        expect(saveState).not.toHaveBeenCalled();
    });

    it('an empty note is dropped when its editor closes; a note with text is kept', () => {
        const empty = h.get().addNote({ x: 0, y: 0 })!;
        const kept = h.get().addNote({ x: 9, y: 9 })!;
        h.get().updateNote(kept, { text: 'keep me' });
        h.get().discardNoteIfEmpty(empty);
        h.get().discardNoteIfEmpty(kept);
        expect(notes().map((n) => n.id)).toEqual([kept]);
    });

    it('delete is one step and offers Undo', () => {
        const id = h.get().addNote({ x: 0, y: 0 })!;
        h.get().updateNote(id, { text: 'x' });
        saveState.mockClear();
        expect(h.get().deleteNote(id)).toBe(true);
        expect(notes()).toEqual([]);
        // flush the edits, then record the delete at once (the toast's Undo may come right away)
        expect(saveState.mock.calls).toEqual([[true], [true]]);
        expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ actionLabel: 'Undo' }));
        showToast.mock.calls[0]![0].onAction();
        expect(undo).toHaveBeenCalled();
    });
});

describe('note content', () => {
    let id: string;
    beforeEach(() => {
        id = h.get().addNote({ x: 0, y: 0 })!;
    });

    it('a dragged pin moves (one step)', () => {
        h.get().updateNote(id, { x: 300, y: 120 });
        expect(notes()[0]).toMatchObject({ x: 300, y: 120 });
        expect(steps()).toBe(1);
    });

    it('colour, pinned and resolved', () => {
        h.get().updateNote(id, { color: 'green', pinned: true, status: 'resolved' });
        expect(notes()[0]).toMatchObject({ color: 'green', pinned: true, status: 'resolved' });
    });

    it('checklist: add, tick, remove (blank items are ignored)', () => {
        expect(h.get().addNoteCheckItem(id, '   ')).toBe(false);
        h.get().addNoteCheckItem(id, ' Export PDF ');
        const item = notes()[0]!.checklist[0]!;
        expect(item).toMatchObject({ text: 'Export PDF', done: false });
        h.get().toggleNoteCheckItem(id, item.id);
        expect(notes()[0]!.checklist[0]!.done).toBe(true);
        h.get().removeNoteCheckItem(id, item.id);
        expect(notes()[0]!.checklist).toEqual([]);
    });

    it('replies: add and remove', () => {
        h.get().addNoteReply(id, 'Done in v2');
        const reply = notes()[0]!.replies[0]!;
        expect(reply.text).toBe('Done in v2');
        h.get().removeNoteReply(id, reply.id);
        expect(notes()[0]!.replies).toEqual([]);
    });

    it('a change bumps updatedAt', () => {
        const before = notes()[0]!.updatedAt;
        const now = vi.spyOn(Date, 'now').mockReturnValue(before + 5000);
        h.get().updateNote(id, { text: 'later' });
        expect(notes()[0]!.updatedAt).toBe(before + 5000);
        now.mockRestore(); // only this spy: setupTests stubs requestRenderAll for every test
    });
});

describe('linking a note to an object', () => {
    it('links to the selection and gives the object a shapeId if it has none', () => {
        const r = rect(10, 10);
        canvas.add(r);
        canvas.setActiveObject(r);
        const id = h.get().addNote({ x: 0, y: 0 })!;
        expect(h.get().linkNoteToSelection(id)).toBe(true);
        const shapeId = (r as unknown as { shapeId?: string }).shapeId;
        expect(shapeId).toBeTruthy();
        expect(notes()[0]!.objectId).toBe(shapeId);
        h.get().unlinkNote(id);
        expect(notes()[0]!.objectId).toBeNull();
    });

    it('cannot link without a selection', () => {
        const id = h.get().addNote({ x: 0, y: 0 })!;
        expect(h.get().linkNoteToSelection(id)).toBe(false);
    });

    it('selects the linked object', () => {
        const r = rect(10, 10, { shapeId: 's1' });
        canvas.add(r);
        const id = h.get().addNote({ x: 0, y: 0 }, r)!;
        expect(h.get().selectNoteObject(id)).toBe(true);
        expect(canvas.getActiveObject()).toBe(r);
    });

    it('keeps the pin where the object was when the object is deleted', () => {
        const r = rect(200, 100, { shapeId: 's1' });
        canvas.add(r);
        const id = h.get().addNote({ x: 0, y: 0 }, r)!;
        canvas.remove(r);
        const n = notes().find((x) => x.id === id)!;
        expect(n.objectId).toBe('s1'); // undo of the delete brings the object back, still linked
        expect(n.x).toBeCloseTo(300); // its top-right corner
        expect(n.y).toBeCloseTo(100);
    });

    it('ignores removals while a page loads', () => {
        const r = rect(200, 100, { shapeId: 's1' });
        canvas.add(r);
        h.get().addNote({ x: 0, y: 0 }, r);
        expect(notes()[0]!.x).toBeCloseTo(300); // linked at its corner
        r.set({ left: 500 });
        r.setCoords();
        h.set({ isPageSwitching: true });
        canvas.remove(r); // the page is being replaced: not a delete
        expect(notes()[0]!.x).toBeCloseTo(300);
    });
});

describe('Note tool (N)', () => {
    it('a click drops a note there, then opens its editor', () => {
        h.set({ activeTool: 'note' });
        click(120, 80);
        expect(notes()).toHaveLength(1);
        expect(notes()[0]).toMatchObject({ x: 120, y: 80, objectId: null });
        expect(h.get().activeNoteId).toBe(notes()[0]!.id);
    });

    it('a click on an object links the note to it', () => {
        const r = rect(100, 50);
        canvas.add(r);
        h.set({ activeTool: 'note' });
        click(150, 90);
        expect(notes()[0]!.objectId).toBe((r as unknown as { shapeId: string }).shapeId);
    });

    it('helpers (guides, handles) are never note targets', () => {
        canvas.add(rect(100, 50, { excludeFromExport: true }));
        h.set({ activeTool: 'note' });
        click(150, 90);
        expect(notes()[0]!.objectId).toBeNull();
    });

    it('only the primary button, only while the tool is on', () => {
        h.set({ activeTool: 'note' });
        click(1, 1, 2);
        expect(notes()).toHaveLength(0);
        h.set({ activeTool: 'select' });
        click(1, 1);
        expect(notes()).toHaveLength(0);
    });

    it('Escape goes back to Select', () => {
        h.set({ activeTool: 'note' });
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(setActiveTool).toHaveBeenCalledWith('select');
    });
});

describe('panel state', () => {
    it('filter, scope and pin visibility', () => {
        expect(h.get().noteFilter).toEqual({ query: '', status: 'open', colors: [] });
        h.get().setNoteFilter({ query: 'logo' });
        h.get().setNoteFilter({ colors: ['blue'] });
        expect(h.get().noteFilter).toEqual({ query: 'logo', status: 'open', colors: ['blue'] });
        h.get().setNotesScope('all');
        expect(h.get().notesScope).toBe('all');
        h.get().setNotesVisible(false);
        expect(h.get().notesVisible).toBe(false);
    });

    it('focusNote centres the view on the pin and opens it', async () => {
        const id = h.get().addNote({ x: 70, y: 30 })!;
        h.get().updateNote(id, { text: 'look here' });
        h.get().setActiveNote(null);
        expect(await h.get().focusNote(id)).toBe(true);
        expect(centerViewOn).toHaveBeenCalledWith({ x: 70, y: 30 });
        expect(h.get().activeNoteId).toBe(id);
        expect(h.get().notesVisible).toBe(true);
    });

    it('focusNote on another page switches page first', async () => {
        const id = h.get().addNote({ x: 5, y: 5 })!;
        h.get().updateNote(id, { text: 'here' });
        expect(await h.get().focusNote(id, 'p2')).toBe(false); // the note is not on p2
        expect(switchPage).toHaveBeenCalledWith('p2');
    });

    it('focusNote opens a note saved on another page', async () => {
        savedPages = {
            p2: { objects: [], pageNotes: [{ id: 'far', x: 9, y: 8, text: 'far away' }] },
        };
        expect(await h.get().focusNote('far', 'p2')).toBe(true);
        expect(h.get().activeNoteId).toBe('far');
        expect(centerViewOn).toHaveBeenCalledWith({ x: 9, y: 8 });
        savedPages = {};
    });
});
