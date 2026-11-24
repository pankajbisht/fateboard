/** Note pins on the board + the note pop-over (2026-11-17). */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@store';
import { DEFAULT_NOTE_FILTER, createNote, type PageNote } from '@/lib/notes/pageNotes';
import NotePins from '../NotePins';

const note = (id: string, over: Partial<PageNote> = {}): PageNote => ({
    ...createNote({ x: 100, y: 50 }, id, 1),
    ...over,
});

/** A canvas shown 1:1 at the top left of the window; its notes are mirrored when the store binds it. */
const fakeCanvas = (pageNotes: PageNote[]) => ({
    pageNotes,
    upperCanvasEl: {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }) as DOMRect,
    },
    getWidth: () => 800,
    viewportTransform: [1, 0, 0, 1, 0, 0],
    getObjects: () => [],
    on: () => () => {},
    off: () => {},
    requestRenderAll: () => {}, // other slices react to a new canvas too (grid overlay)
});

const a = {
    updateNote: vi.fn(() => true),
    saveNoteEdits: vi.fn(),
    deleteNote: vi.fn(() => true),
    addNoteCheckItem: vi.fn(() => true),
    toggleNoteCheckItem: vi.fn(() => true),
    addNoteReply: vi.fn(() => true),
    linkNoteToSelection: vi.fn(() => true),
    discardNoteIfEmpty: vi.fn(),
};

describe('NotePins', () => {
    beforeEach(() => {
        useStore.setState({
            canvas: fakeCanvas([
                note('a', { text: 'Fix the logo\nsecond line' }),
                note('b', { text: 'Old', status: 'resolved', x: 300 }),
            ]),
            notesVisible: true,
            noteFilter: DEFAULT_NOTE_FILTER,
            activeNoteId: null,
            hasSelection: true,
            ...a,
        } as never);
    });
    afterEach(() => vi.clearAllMocks());

    it('draws a numbered pin per open note, at its point', () => {
        render(<NotePins />);
        const pin = screen.getByRole('button', { name: 'Note 1: Fix the logo' });
        expect(pin.style.left).toBe('100px');
        expect(pin.style.top).toBe('50px');
        // resolved notes show only when the Notes filter shows them
        expect(screen.queryByRole('button', { name: /Note 2/ })).toBeNull();
        act(() => useStore.setState({ noteFilter: { ...DEFAULT_NOTE_FILTER, status: 'all' } }));
        expect(screen.getByRole('button', { name: 'Note 2: Old (resolved)' })).toBeTruthy();
    });

    it('Show pins off hides them', () => {
        useStore.setState({ notesVisible: false });
        render(<NotePins />);
        expect(screen.queryByRole('button', { name: /Note 1/ })).toBeNull();
    });

    it('a click on a pin opens its note; typing is written at once, recorded when left', () => {
        render(<NotePins />);
        const pin = screen.getByRole('button', { name: 'Note 1: Fix the logo' });
        fireEvent.click(pin);
        expect(pin.getAttribute('aria-expanded')).toBe('true');
        const dialog = screen.getByRole('dialog', { name: 'Note 1' });
        const text = screen.getByRole('textbox', { name: 'Note text' });
        expect(dialog.contains(text)).toBe(true);
        fireEvent.change(text, { target: { value: 'Fix the logo colour' } });
        expect(a.updateNote).toHaveBeenCalledWith(
            'a',
            { text: 'Fix the logo colour' },
            { record: false },
        );
        fireEvent.blur(text);
        expect(a.saveNoteEdits).toHaveBeenCalledWith('a');
    });

    it('dragging a free pin moves the note (one update, no pop-over)', () => {
        render(<NotePins />);
        const pin = screen.getByRole('button', { name: 'Note 1: Fix the logo' });
        fireEvent.pointerDown(pin, { button: 0, clientX: 100, clientY: 50, pointerId: 1 });
        fireEvent.pointerMove(pin, { clientX: 140, clientY: 90, pointerId: 1 });
        fireEvent.pointerUp(pin, { clientX: 140, clientY: 90, pointerId: 1 });
        expect(a.updateNote).toHaveBeenCalledWith('a', { x: 140, y: 90 });
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('the pop-over edits colour, status, checklist and replies, and deletes', () => {
        useStore.setState({ activeNoteId: 'a' });
        render(<NotePins />);
        fireEvent.click(screen.getByRole('button', { name: 'Green' }));
        expect(a.updateNote).toHaveBeenCalledWith('a', { color: 'green' });
        fireEvent.click(screen.getByRole('button', { name: 'Resolve' }));
        expect(a.updateNote).toHaveBeenCalledWith('a', { status: 'resolved' });
        fireEvent.click(screen.getByRole('button', { name: 'Pin to top' }));
        expect(a.updateNote).toHaveBeenCalledWith('a', { pinned: true });

        const item = screen.getByRole('textbox', { name: 'Add checklist item' });
        fireEvent.change(item, { target: { value: 'Export PDF' } });
        fireEvent.keyDown(item, { key: 'Enter' });
        expect(a.addNoteCheckItem).toHaveBeenCalledWith('a', 'Export PDF');

        const reply = screen.getByRole('textbox', { name: 'Reply' });
        fireEvent.change(reply, { target: { value: 'On it' } });
        fireEvent.keyDown(reply, { key: 'Enter' });
        expect(a.addNoteReply).toHaveBeenCalledWith('a', 'On it');

        fireEvent.click(screen.getByRole('button', { name: 'Link to selection' }));
        expect(a.linkNoteToSelection).toHaveBeenCalledWith('a');

        fireEvent.click(screen.getByRole('button', { name: 'Delete note' }));
        expect(a.deleteNote).toHaveBeenCalledWith('a');
    });

    it('checklist items tick from the pop-over', () => {
        useStore.setState({
            activeNoteId: 'a',
            pageNotes: [note('a', { checklist: [{ id: 'i1', text: 'Kerning', done: false }] })],
        });
        render(<NotePins />);
        const box = screen.getByRole('checkbox', { name: 'Kerning' });
        expect(box.getAttribute('aria-checked')).toBe('false');
        fireEvent.click(box);
        expect(a.toggleNoteCheckItem).toHaveBeenCalledWith('a', 'i1');
    });

    it('Escape closes the pop-over (closing records the typing)', () => {
        useStore.setState({ activeNoteId: 'a' });
        render(<NotePins />);
        const text = screen.getByRole('textbox', { name: 'Note text' });
        fireEvent.change(text, { target: { value: 'typed' } });
        fireEvent.keyDown(text, { key: 'Escape' });
        expect(a.updateNote).toHaveBeenCalledWith('a', { text: 'typed' }, { record: false });
        expect(useStore.getState().activeNoteId).toBeNull();
    });
});
