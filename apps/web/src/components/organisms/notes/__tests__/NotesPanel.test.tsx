/** Notes panel (2026-11-17): list, search, filters, scope, jump to a note, resolve, Note tool. */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@store';
import { DEFAULT_NOTE_FILTER, createNote, type PageNote } from '@/lib/notes/pageNotes';
import NotesPanel from '../NotesPanel';

const note = (id: string, over: Partial<PageNote> = {}): PageNote => ({
    ...createNote({ x: 0, y: 0 }, id, 1),
    ...over,
});

const a = {
    focusNote: vi.fn(async () => true),
    updateNote: vi.fn(() => true),
    setActiveTool: vi.fn(),
};

const list = () => within(screen.getByRole('list', { name: 'Notes' }));

describe('NotesPanel', () => {
    beforeEach(() => {
        useStore.setState({
            pageNotes: [
                note('a', { text: 'Fix the logo', color: 'blue' }),
                note('b', { text: 'Approved', status: 'resolved' }),
                note('c', {
                    text: 'Pinned brief',
                    pinned: true,
                    checklist: [
                        { id: 'i1', text: 'kerning', done: true },
                        { id: 'i2', text: 'colours', done: false },
                    ],
                }),
            ],
            pages: [
                { id: 'p1', name: 'Cover', canvasJSON: {} },
                {
                    id: 'p2',
                    name: 'Inside',
                    canvasJSON: { pageNotes: [note('far', { text: 'On page two' })] },
                },
            ],
            currentPageId: 'p1',
            activeTool: 'select',
            notesVisible: true,
            noteFilter: DEFAULT_NOTE_FILTER,
            notesScope: 'page',
            ...a,
        } as never);
    });
    afterEach(() => vi.clearAllMocks());

    it('lists the open notes of this page, pinned first, with checklist progress', () => {
        render(<NotesPanel />);
        const rows = list().getAllByRole('button', { name: /Pinned brief|Fix the logo|Approved/ });
        expect(rows.map((r) => r.textContent)).toEqual([
            expect.stringContaining('Pinned brief'),
            expect.stringContaining('Fix the logo'),
        ]);
        expect(rows[0]!.textContent).toContain('1/2');
    });

    it('status filter: resolved and all', () => {
        render(<NotesPanel />);
        fireEvent.click(screen.getByRole('radio', { name: 'Resolved' }));
        expect(list().getByRole('button', { name: /Approved/ })).toBeTruthy();
        expect(list().queryByRole('button', { name: /Fix the logo/ })).toBeNull();
        fireEvent.click(screen.getByRole('radio', { name: 'All' }));
        expect(
            list().getAllByRole('button', { name: /Approved|Fix the logo|Pinned/ }),
        ).toHaveLength(3);
    });

    it('search and colour tags narrow the list', () => {
        render(<NotesPanel />);
        fireEvent.change(screen.getByRole('textbox', { name: 'Search notes' }), {
            target: { value: 'kern' },
        });
        expect(list().getAllByRole('button', { name: /Pinned brief/ })).toHaveLength(1);
        expect(list().queryByRole('button', { name: /Fix the logo/ })).toBeNull();
        fireEvent.change(screen.getByRole('textbox', { name: 'Search notes' }), {
            target: { value: '' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Blue', pressed: false }));
        expect(list().getAllByRole('button', { name: /Fix the logo/ })).toHaveLength(1);
        expect(list().queryByRole('button', { name: /Pinned brief/ })).toBeNull();
    });

    it('a row jumps to its note; the check button resolves it', () => {
        render(<NotesPanel />);
        fireEvent.click(list().getByRole('button', { name: /Fix the logo/ }));
        expect(a.focusNote).toHaveBeenCalledWith('a', 'p1');
        fireEvent.click(screen.getByRole('button', { name: 'Resolve note 1' }));
        expect(a.updateNote).toHaveBeenCalledWith('a', { status: 'resolved' });
    });

    it('All pages lists other pages too, with their names', () => {
        render(<NotesPanel />);
        fireEvent.click(screen.getByRole('radio', { name: 'All pages' }));
        const row = list().getByRole('button', { name: /On page two/ });
        expect(row.textContent).toContain('Inside');
        fireEvent.click(row);
        expect(a.focusNote).toHaveBeenCalledWith('far', 'p2');
    });

    it('Add note turns on the Note tool; Show pins hides them', () => {
        render(<NotesPanel />);
        const add = screen.getByRole('button', { name: /Add note/ });
        expect(add.getAttribute('aria-pressed')).toBe('false');
        fireEvent.click(add);
        expect(a.setActiveTool).toHaveBeenCalledWith('note');
        fireEvent.click(screen.getByRole('switch', { name: 'Show pins' }));
        expect(useStore.getState().notesVisible).toBe(false);
    });

    it('says how to start when the page has no notes', () => {
        useStore.setState({ pageNotes: [] } as never);
        render(<NotesPanel />);
        expect(screen.getByText('No notes yet')).toBeTruthy();
    });
});
