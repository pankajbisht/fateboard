/**
 * Notes (2026-11-17): numbered note pins on a page, at a point or linked to an object, with colour tags,
 * open / resolved, pinned, a checklist and replies. Model and file checks: `lib/notes/pageNotes`.
 * - Saved per page as the canvas-level prop `pageNotes` (`CUSTOM_PROPS`), so page switches, autosave and files
 *   carry notes with no change to the Pages slice. Other pages' notes are read from their saved `canvasJSON`.
 * - Undo snapshots hold the notes, so every note change is a step (`saveState`): an unrecorded change would be
 *   lost by the next undo. A new note is recorded with its first content; an empty one is dropped on close with
 *   no step. Typing is written at once (`record: false`, so a reload keeps it) and recorded as one step when the
 *   field is left or the note closes. Add / delete flush pending history first (one step per user action), and
 *   loads (undo, page switch, file) drop empty notes, so no "ghost" pin ever comes back.
 * - Note tool (`activeTool === 'note'`, key N): a click drops a note; on an object it links the note to it.
 * - Binds itself to every new canvas (store subscription), so the canvas slice does not have to.
 * Pins and the pop-over are DOM (`organisms/notes/NotePins`): never drawn into exports.
 */
import type { Canvas, FabricObject } from 'fabric';
import { nanoid } from 'nanoid';
import type { SliceCreator } from '../types';
import { defineCanvasProp } from '@/lib/canvas/canvasProp';
import { isLayerHelper } from '@/lib/canvas/docLayers';
import {
    DEFAULT_NOTE_FILTER,
    NOTE_LIMITS,
    createNote,
    isNoteEmpty,
    normalizePageNotes,
    noteEdits,
    type NoteFilter,
    type PageNote,
} from '@/lib/notes/pageNotes';
import {
    collectShapeIds,
    ensureShapeId,
    findByShapeId,
    noteAnchorOf,
    notePoint,
    shapeIdIndex,
} from '@/lib/notes/noteTargets';
import { attachNoteTool } from './notes/noteTool';

export type NoteScope = 'page' | 'all';
/** `x` / `y`: a dragged pin (free notes). */
export type NotePatch = Partial<Pick<PageNote, 'text' | 'color' | 'status' | 'pinned' | 'x' | 'y'>>;

export interface NotesSlice {
    /** The open page's notes (mirror of `canvas.pageNotes`). */
    pageNotes: PageNote[];
    /** The note whose pop-over is open. */
    activeNoteId: string | null;
    /** Show the pins on the board. */
    notesVisible: boolean;
    noteFilter: NoteFilter;
    notesScope: NoteScope;
    bindNotes: (canvas: Canvas) => () => void;
    /** Add a note at a scene point, or on `target` (linked). Opens it. Not a step until it has content. */
    addNote: (at: { x: number; y: number }, target?: FabricObject | null) => string | null;
    /** `record: false` = typing: written at once, recorded by `saveNoteEdits` / closing the note. */
    updateNote: (id: string, patch: NotePatch, opts?: { record?: boolean }) => boolean;
    /** Record a note's unrecorded typing as one history step (its field was left). */
    saveNoteEdits: (id: string) => void;
    /** One undo step, with an Undo toast. */
    deleteNote: (id: string) => boolean;
    /** Drop the note when nothing was written in it (its editor closed). */
    discardNoteIfEmpty: (id: string) => void;
    addNoteCheckItem: (id: string, text: string) => boolean;
    toggleNoteCheckItem: (id: string, itemId: string) => boolean;
    removeNoteCheckItem: (id: string, itemId: string) => boolean;
    addNoteReply: (id: string, text: string) => boolean;
    removeNoteReply: (id: string, replyId: string) => boolean;
    /** Link the note to the one selected object (gives it a `shapeId`). */
    linkNoteToSelection: (id: string) => boolean;
    unlinkNote: (id: string) => boolean;
    /** Select the linked object (Select tool). */
    selectNoteObject: (id: string) => boolean;
    /** Open the note's page when given, bring its pin to the middle of the view and open it. */
    focusNote: (id: string, pageId?: string | null) => Promise<boolean>;
    /** Open a note's pop-over (null closes it; an empty closed note is dropped). */
    setActiveNote: (id: string | null) => void;
    setNotesVisible: (visible: boolean) => void;
    setNoteFilter: (patch: Partial<NoteFilter>) => void;
    setNotesScope: (scope: NoteScope) => void;
}

type NotesCanvas = Canvas & { pageNotes?: PageNote[] };
type Peers = NotesSlice & {
    canvas?: NotesCanvas | null;
    activeTool?: string;
    currentPageId?: string | null;
    isPageSwitching?: boolean;
    _isRestoring?: boolean;
    saveState?: (immediate?: boolean) => void;
    showToast?: (t: { message: string; actionLabel?: string; onAction?: () => void }) => void;
    undo?: () => unknown;
    setActiveTool?: (tool: string) => void;
    switchPage?: (id: string) => Promise<unknown>;
    centerViewOn?: (p: { x: number; y: number }) => void;
};

export const createNotesSlice: SliceCreator<NotesSlice> = (set, get, store) => {
    const peers = () => get() as Peers;
    let unbind: (() => void) | null = null;
    let detachTool: (() => void) | null = null;
    /** Notes whose current state is not in the history yet: new ones and unrecorded typing. */
    const unrecorded = new Set<string>();
    let ownWrite = false;
    /** Values from a load (undo, page switch, file) drop empty notes: one only lives while it is open. */
    const loadNotes = (v: unknown) => {
        const notes = normalizePageNotes(v);
        if (ownWrite) return notes;
        unrecorded.clear();
        return notes.filter((n) => !isNoteEmpty(n));
    };
    const setNotes = (c: NotesCanvas, next: PageNote[]) => {
        ownWrite = true;
        try {
            c.pageNotes = next;
        } finally {
            ownWrite = false;
        }
    };
    const findNote = (id: string) => peers().canvas?.pageNotes?.find((n) => n.id === id);

    const mirror = (pageNotes: PageNote[]) => {
        const active = get().activeNoteId;
        const gone = !!active && !pageNotes.some((n) => n.id === active);
        set(gone ? { pageNotes, activeNoteId: null } : { pageNotes }, false, 'notes/page');
    };

    /** Replace the page's notes; `record` = one history step (+ autosave). */
    const write = (
        name: string,
        fn: (c: NotesCanvas, notes: PageNote[]) => PageNote[] | null,
        record: boolean,
    ) => {
        const c = peers().canvas;
        if (!c) return false;
        try {
            const notes = c.pageNotes ?? [];
            const next = fn(c, notes);
            if (!next) return false;
            setNotes(c, next);
            if (record) peers().saveState?.();
            return true;
        } catch (err) {
            console.error(`[notes] ${name} failed`, err);
            return false;
        }
    };

    /** Change one note; `recipe` returns the same note (or null) for "no change". */
    const edit = (
        name: string,
        id: string,
        recipe: (n: PageNote, c: NotesCanvas) => PageNote | null,
        record = true,
    ) => {
        const ok = write(
            name,
            (c, notes) => {
                const i = notes.findIndex((n) => n.id === id);
                const next = i < 0 ? null : recipe(notes[i]!, c);
                if (!next || next === notes[i]) return null;
                return notes.map((n, j) => (j === i ? { ...next, updatedAt: Date.now() } : n));
            },
            record,
        );
        if (ok && record) unrecorded.delete(id);
        else if (ok) unrecorded.add(id);
        return ok;
    };

    store.subscribe((s: Peers, prev: Peers) => {
        if (s.canvas !== prev.canvas) {
            detachTool?.();
            detachTool = null;
            unbind?.();
            unbind = s.canvas ? get().bindNotes(s.canvas) : null;
        }
        const wantsTool = s.activeTool === 'note' && !!s.canvas;
        if (wantsTool && !detachTool)
            detachTool = attachNoteTool(s.canvas!, {
                addNote: (at, target) => get().addNote(at, target),
                toSelect: () => peers().setActiveTool?.('select'),
            });
        else if (!wantsTool && detachTool) {
            detachTool();
            detachTool = null;
        }
    });

    return {
        pageNotes: [],
        activeNoteId: null,
        notesVisible: true,
        noteFilter: DEFAULT_NOTE_FILTER,
        notesScope: 'page',

        bindNotes: (canvas) => {
            const c = canvas as NotesCanvas;
            const prop = defineCanvasProp(c, 'pageNotes', loadNotes, mirror);
            // a deleted object (or group) leaves its notes where it was (an undo brings it back, still linked)
            const onRemoved = ({ target }: { target: FabricObject }) => {
                const { isPageSwitching, _isRestoring } = peers();
                const notes = prop.get();
                if (isPageSwitching || _isRestoring || !notes.some((n) => n.objectId)) return;
                const gone = collectShapeIds([target]);
                const hit = (n: PageNote) => (n.objectId ? gone.get(n.objectId) : undefined);
                if (!notes.some(hit)) return;
                setNotes(
                    c,
                    notes.map((n) => {
                        const o = hit(n);
                        return o ? { ...n, ...noteAnchorOf(o) } : n;
                    }),
                );
            };
            const offs = [
                c.on('canvas:cleared', () => prop.reset()),
                c.on('object:removed', onRemoved as never),
            ];
            return () => {
                offs.forEach((off) => off());
                prop.release();
            };
        },

        addNote: (at, target = null) => {
            get().setActiveNote(null); // the open note is recorded (or dropped when empty) first
            peers().saveState?.(true); // pending changes are their own step, without the new note
            let id: string | null = null;
            write(
                'addNote',
                (_c, notes) => {
                    if (notes.length >= NOTE_LIMITS.notes) return null;
                    const objectId = target ? ensureShapeId(target) : null;
                    const point = target ? noteAnchorOf(target) : { x: at.x, y: at.y };
                    const note = createNote({ ...point, objectId }, nanoid(10), Date.now());
                    id = note.id;
                    return [...notes, note];
                },
                false, // recorded with its first content (an empty note is dropped on close)
            );
            if (id) {
                unrecorded.add(id);
                set({ notesVisible: true }, false, 'notes/show');
                get().setActiveNote(id);
            }
            return id;
        },

        updateNote: (id, patch, opts) =>
            edit(
                'updateNote',
                id,
                (n) => {
                    const keys = Object.keys(patch) as (keyof NotePatch)[];
                    return keys.some((k) => patch[k] !== undefined && patch[k] !== n[k])
                        ? { ...n, ...patch }
                        : n;
                },
                opts?.record !== false,
            ),

        saveNoteEdits: (id) => {
            const n = findNote(id);
            if (!n || !unrecorded.has(id) || isNoteEmpty(n)) return;
            unrecorded.delete(id);
            peers().saveState?.();
        },

        deleteNote: (id) => {
            const n = findNote(id);
            if (!n) return false;
            const remove = (_c: NotesCanvas, notes: PageNote[]) => notes.filter((x) => x.id !== id);
            if (unrecorded.has(id) && isNoteEmpty(n)) {
                unrecorded.delete(id);
                return write('deleteNote', remove, false); // never recorded: nothing to undo
            }
            peers().saveState?.(true); // its last edits are a step of their own…
            const ok = write('deleteNote', remove, false);
            unrecorded.delete(id);
            if (ok) peers().saveState?.(true); // …and the delete is one at once (the toast's Undo)
            if (ok)
                peers().showToast?.({
                    message: 'Note deleted',
                    actionLabel: 'Undo',
                    onAction: () => void peers().undo?.(),
                });
            return ok;
        },

        discardNoteIfEmpty: (id) => {
            const n = findNote(id);
            if (!n || !isNoteEmpty(n)) return;
            const silent = unrecorded.delete(id); // never recorded: dropping it is no step
            write('discardNoteIfEmpty', (_c, notes) => notes.filter((x) => x !== n), !silent);
        },

        addNoteCheckItem: (id, text) =>
            edit('addNoteCheckItem', id, (n) => noteEdits.addItem(n, text, nanoid(8))),
        toggleNoteCheckItem: (id, itemId) =>
            edit('toggleNoteCheckItem', id, (n) => noteEdits.toggleItem(n, itemId)),
        removeNoteCheckItem: (id, itemId) =>
            edit('removeNoteCheckItem', id, (n) => noteEdits.removeItem(n, itemId)),
        addNoteReply: (id, text) =>
            edit('addNoteReply', id, (n) => noteEdits.addReply(n, text, nanoid(8), Date.now())),
        removeNoteReply: (id, replyId) =>
            edit('removeNoteReply', id, (n) => noteEdits.removeReply(n, replyId)),

        linkNoteToSelection: (id) =>
            edit('linkNoteToSelection', id, (n, c) => {
                const o = c.getActiveObject();
                if (!o || o.type.toLowerCase() === 'activeselection' || isLayerHelper(o))
                    return null;
                return { ...n, ...noteAnchorOf(o), objectId: ensureShapeId(o) };
            }),

        unlinkNote: (id) =>
            edit('unlinkNote', id, (n, c) =>
                n.objectId ? { ...n, ...notePoint(n, shapeIdIndex(c)), objectId: null } : null,
            ),

        selectNoteObject: (id) => {
            const c = peers().canvas;
            const note = c?.pageNotes?.find((n) => n.id === id);
            const hit = c && note?.objectId ? findByShapeId(c, note.objectId) : null;
            if (!c || !hit) return false;
            try {
                if (peers().activeTool !== 'select') peers().setActiveTool?.('select');
                c.setActiveObject(hit.top);
                c.requestRenderAll();
                return true;
            } catch (err) {
                console.error('[notes] selectNoteObject failed', err);
                return false;
            }
        },

        focusNote: async (id, pageId = null) => {
            try {
                if (pageId && pageId !== peers().currentPageId) {
                    get().setActiveNote(null); // recorded / dropped before the page is saved
                    await peers().switchPage?.(pageId);
                }
                const c = peers().canvas;
                const note = c?.pageNotes?.find((n) => n.id === id);
                if (!c || !note) return false;
                set({ notesVisible: true }, false, 'notes/show');
                get().setActiveNote(id);
                peers().centerViewOn?.(notePoint(note, shapeIdIndex(c)));
                return true;
            } catch (err) {
                console.error('[notes] focusNote failed', err);
                return false;
            }
        },

        setActiveNote: (id) => {
            const prev = get().activeNoteId;
            if (prev === id) return;
            set({ activeNoteId: id }, false, 'notes/active');
            if (!prev) return;
            get().saveNoteEdits(prev);
            get().discardNoteIfEmpty(prev);
        },

        setNotesVisible: (notesVisible) => set({ notesVisible }, false, 'notes/visible'),

        setNoteFilter: (patch) =>
            set({ noteFilter: { ...get().noteFilter, ...patch } }, false, 'notes/filter'),

        setNotesScope: (notesScope) => set({ notesScope }, false, 'notes/scope'),
    };
};
