// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
    NOTE_LIMITS,
    collectNotes,
    createNote,
    matchesNoteFilter,
    normalizePageNotes,
    sortNotes,
    type PageNote,
} from '../pageNotes';

const note = (over: Partial<PageNote> = {}): PageNote => ({
    ...createNote({ x: 10, y: 20 }, 'n1', 1000),
    ...over,
});

describe('createNote', () => {
    it('starts open, yellow, unpinned, empty, at the point', () => {
        const n = createNote({ x: 5, y: 6 }, 'a', 42);
        expect(n).toMatchObject({
            id: 'a',
            x: 5,
            y: 6,
            objectId: null,
            text: '',
            color: 'yellow',
            status: 'open',
            pinned: false,
            checklist: [],
            replies: [],
            createdAt: 42,
            updatedAt: 42,
        });
    });

    it('keeps a linked object id and a colour', () => {
        const n = createNote({ x: 0, y: 0, objectId: 's1', color: 'blue' }, 'a', 1);
        expect(n.objectId).toBe('s1');
        expect(n.color).toBe('blue');
    });
});

describe('normalizePageNotes (values from a file)', () => {
    it('anything that is not a list is no notes', () => {
        expect(normalizePageNotes(undefined)).toEqual([]);
        expect(normalizePageNotes({ id: 'x' })).toEqual([]);
        expect(normalizePageNotes('notes')).toEqual([]);
    });

    it('drops notes without an id or a finite position, and duplicate ids', () => {
        const ok = note();
        const out = normalizePageNotes([
            ok,
            { ...ok, id: '' },
            { ...ok, id: 'n2', x: Number.NaN },
            { ...ok, id: 'n3', y: 'top' },
            { ...ok, text: 'second copy of n1' },
            null,
            7,
        ]);
        expect(out.map((n) => n.id)).toEqual(['n1']);
    });

    it('repairs bad fields instead of dropping the note', () => {
        const [n] = normalizePageNotes([
            {
                id: 'n1',
                x: 1,
                y: 2,
                color: 'chartreuse',
                status: 'maybe',
                pinned: 'yes',
                text: 12,
                objectId: 4,
                checklist: [{ id: 'c1', text: 'ok', done: 1 }, { text: 'no id' }, 'x'],
                replies: [{ id: 'r1', text: 'hi', at: 'later' }, { id: 'r2' }],
                createdAt: 'now',
            },
        ]);
        expect(n).toMatchObject({
            color: 'yellow',
            status: 'open',
            pinned: false,
            text: '',
            objectId: null,
            checklist: [{ id: 'c1', text: 'ok', done: true }],
            replies: [{ id: 'r1', text: 'hi', at: 0 }],
            createdAt: 0,
        });
    });

    it('caps the number of notes and the text length', () => {
        const many = Array.from({ length: NOTE_LIMITS.notes + 5 }, (_, i) => note({ id: `n${i}` }));
        expect(normalizePageNotes(many)).toHaveLength(NOTE_LIMITS.notes);
        const [long] = normalizePageNotes([note({ text: 'a'.repeat(NOTE_LIMITS.text + 50) })]);
        expect(long!.text).toHaveLength(NOTE_LIMITS.text);
    });

    it('returns the same notes for a normalized list (idempotent)', () => {
        const once = normalizePageNotes([
            note({ checklist: [{ id: 'c', text: 't', done: false }] }),
        ]);
        expect(normalizePageNotes(once)).toEqual(once);
    });
});

describe('matchesNoteFilter', () => {
    const all = { query: '', status: 'all' as const, colors: [] };

    it('filters by status', () => {
        const open = note();
        const done = note({ status: 'resolved' });
        expect(matchesNoteFilter(open, { ...all, status: 'open' })).toBe(true);
        expect(matchesNoteFilter(done, { ...all, status: 'open' })).toBe(false);
        expect(matchesNoteFilter(done, { ...all, status: 'resolved' })).toBe(true);
        expect(matchesNoteFilter(done, all)).toBe(true);
    });

    it('filters by colour tags (none chosen = every colour)', () => {
        const blue = note({ color: 'blue' });
        expect(matchesNoteFilter(blue, all)).toBe(true);
        expect(matchesNoteFilter(blue, { ...all, colors: ['blue', 'green'] })).toBe(true);
        expect(matchesNoteFilter(blue, { ...all, colors: ['pink'] })).toBe(false);
    });

    it('searches the text, checklist items and replies, ignoring case', () => {
        const n = note({
            text: 'Fix the Logo',
            checklist: [{ id: 'c', text: 'kerning', done: false }],
            replies: [{ id: 'r', text: 'Client approved', at: 1 }],
        });
        expect(matchesNoteFilter(n, { ...all, query: 'logo' })).toBe(true);
        expect(matchesNoteFilter(n, { ...all, query: 'KERN' })).toBe(true);
        expect(matchesNoteFilter(n, { ...all, query: 'approved' })).toBe(true);
        expect(matchesNoteFilter(n, { ...all, query: 'banner' })).toBe(false);
        expect(matchesNoteFilter(n, { ...all, query: '   ' })).toBe(true);
    });
});

describe('sortNotes / collectNotes', () => {
    it('pinned notes first, then in creation order', () => {
        const a = note({ id: 'a', createdAt: 1 });
        const b = note({ id: 'b', createdAt: 2, pinned: true });
        const c = note({ id: 'c', createdAt: 3 });
        expect(sortNotes([c, a, b]).map((n) => n.id)).toEqual(['b', 'a', 'c']);
    });

    it('lists the open page live and the others from their saved JSON, numbered per page', () => {
        const live = [note({ id: 'L1' }), note({ id: 'L2' })];
        const pages = [
            {
                id: 'p1',
                name: 'Cover',
                // an empty note saved on another page is never listed (it only lives while open)
                canvasJSON: { pageNotes: [note({ id: 'A', text: 'a' }), note({ id: 'E' })] },
            },
            { id: 'p2', name: 'Inside', canvasJSON: { pageNotes: [note({ id: 'stale' })] } },
            { id: 'p3', name: 'Back', canvasJSON: null },
        ];
        const rows = collectNotes(pages, 'p2', live);
        expect(rows.map((r) => [r.pageId, r.note.id, r.number])).toEqual([
            ['p1', 'A', 1],
            ['p2', 'L1', 1],
            ['p2', 'L2', 2],
        ]);
        expect(rows[0]!.pageName).toBe('Cover');
    });

    it('pinned notes come first on each page; numbers stay the pin numbers', () => {
        const live = [note({ id: 'a' }), note({ id: 'b', pinned: true })];
        const rows = collectNotes([], 'p1', live);
        expect(rows.map((r) => [r.note.id, r.number])).toEqual([
            ['b', 2],
            ['a', 1],
        ]);
    });

    it('with no pages yet, lists the live notes as one page', () => {
        expect(collectNotes([], null, [note()]).map((r) => r.note.id)).toEqual(['n1']);
    });
});
