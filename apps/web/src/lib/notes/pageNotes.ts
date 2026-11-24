/**
 * Page notes (2026-11-17), pure. A note is a numbered pin on a page: at a scene point, or linked to an object
 * (its `shapeId`) so it follows it. Notes are saved per page as the canvas-level prop `pageNotes` (in
 * `CUSTOM_PROPS`), so undo, page switches, autosave and files carry them. Values from a file go through
 * `normalizePageNotes` (bad fields repaired, bad notes dropped, sizes capped). Store: `createNotesSlice`.
 */

/** Tag colours. User content, like palette swatches: not themed (docs/DESIGN.md). */
export const NOTE_COLORS = ['yellow', 'orange', 'pink', 'purple', 'blue', 'green'] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

/** Pin fill per tag; the pin number is drawn in `NOTE_INK` (contrast ≥ 4.5:1 on every fill). */
export const NOTE_COLOR_HEX: Record<NoteColor, string> = {
    yellow: '#facc15',
    orange: '#fb923c',
    pink: '#f472b6',
    purple: '#c084fc',
    blue: '#60a5fa',
    green: '#4ade80',
};
export const NOTE_INK = '#1c1917';

export const noteColorName = (c: NoteColor) => c[0]!.toUpperCase() + c.slice(1);

export type NoteStatus = 'open' | 'resolved';

export interface NoteCheckItem {
    id: string;
    text: string;
    done: boolean;
}

export interface NoteReply {
    id: string;
    text: string;
    /** ms since epoch */
    at: number;
}

export interface PageNote {
    id: string;
    /** Scene point of the pin. For a linked note: where the object was last seen (used when it is gone). */
    x: number;
    y: number;
    /** `shapeId` of the linked object, or null. */
    objectId: string | null;
    text: string;
    color: NoteColor;
    status: NoteStatus;
    pinned: boolean;
    checklist: NoteCheckItem[];
    replies: NoteReply[];
    createdAt: number;
    updatedAt: number;
}

/** A file can hold anything: these keep one page's notes small. */
export const NOTE_LIMITS = { notes: 500, text: 5000, items: 100, replies: 200, itemText: 500 };

export interface NoteFilter {
    query: string;
    status: NoteStatus | 'all';
    /** Empty = every colour. */
    colors: NoteColor[];
}

export const DEFAULT_NOTE_FILTER: NoteFilter = { query: '', status: 'open', colors: [] };

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const time = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);
const idOf = (v: unknown) => (typeof v === 'string' && v ? v.slice(0, 64) : null);
const isColor = (v: unknown): v is NoteColor => NOTE_COLORS.includes(v as NoteColor);

function list<T>(v: unknown, max: number, item: (r: Rec) => T | null): T[] {
    if (!Array.isArray(v)) return [];
    const out: T[] = [];
    const seen = new Set<string>();
    for (const raw of v) {
        if (out.length >= max) break;
        const r = isRec(raw) ? item(raw) : null;
        const id = r && (r as { id?: string }).id;
        if (!r || !id || seen.has(id)) continue;
        seen.add(id);
        out.push(r);
    }
    return out;
}

/** Items and replies need an id and some text (the UI never adds blank ones). */
const checkItem = (r: Rec): NoteCheckItem | null => {
    const id = idOf(r.id);
    const text = str(r.text, NOTE_LIMITS.itemText);
    return id && text.trim() ? { id, text, done: !!r.done } : null;
};

const reply = (r: Rec): NoteReply | null => {
    const id = idOf(r.id);
    const text = str(r.text, NOTE_LIMITS.text);
    return id && text.trim() ? { id, text, at: time(r.at) } : null;
};

export function normalizeNote(r: Rec): PageNote | null {
    const id = idOf(r.id);
    const { x, y } = r;
    if (!id || typeof x !== 'number' || typeof y !== 'number') return null;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const createdAt = time(r.createdAt);
    return {
        id,
        x,
        y,
        objectId: idOf(r.objectId),
        text: str(r.text, NOTE_LIMITS.text),
        color: isColor(r.color) ? r.color : 'yellow',
        status: r.status === 'resolved' ? 'resolved' : 'open',
        pinned: r.pinned === true,
        checklist: list(r.checklist, NOTE_LIMITS.items, checkItem),
        replies: list(r.replies, NOTE_LIMITS.replies, reply),
        createdAt,
        updatedAt: Math.max(createdAt, time(r.updatedAt)),
    };
}

/** One page's notes from a file or the canvas: never throws, always a fresh, valid list. */
export const normalizePageNotes = (v: unknown): PageNote[] =>
    list(v, NOTE_LIMITS.notes, normalizeNote);

export function createNote(
    at: { x: number; y: number; objectId?: string | null; color?: NoteColor },
    id: string,
    now: number,
): PageNote {
    return {
        id,
        x: at.x,
        y: at.y,
        objectId: at.objectId ?? null,
        text: '',
        color: at.color ?? 'yellow',
        status: 'open',
        pinned: false,
        checklist: [],
        replies: [],
        createdAt: now,
        updatedAt: now,
    };
}

/** First line of a note, for names and list rows. */
export const noteSummary = (text: string, max = 60) => {
    const line = text.split('\n')[0]!.trim();
    return line.length > max ? `${line.slice(0, max - 1)}…` : line;
};

/** The pin's accessible name: "Note 2: Fix the logo (resolved)". */
export const pinLabel = (n: Pick<PageNote, 'text' | 'status'>, number: number) =>
    `Note ${number}: ${noteSummary(n.text) || 'Empty note'}${n.status === 'resolved' ? ' (resolved)' : ''}`;

/** Checklist and reply edits (pure): the changed note, or null for "no change" (blank text, limits). */
export const noteEdits = {
    addItem(n: PageNote, text: string, id: string): PageNote | null {
        const t = text.trim().slice(0, NOTE_LIMITS.itemText);
        if (!t || n.checklist.length >= NOTE_LIMITS.items) return null;
        return { ...n, checklist: [...n.checklist, { id, text: t, done: false }] };
    },
    toggleItem: (n: PageNote, itemId: string): PageNote | null =>
        n.checklist.some((c) => c.id === itemId)
            ? {
                  ...n,
                  checklist: n.checklist.map((c) =>
                      c.id === itemId ? { ...c, done: !c.done } : c,
                  ),
              }
            : null,
    removeItem: (n: PageNote, itemId: string): PageNote | null =>
        n.checklist.some((c) => c.id === itemId)
            ? { ...n, checklist: n.checklist.filter((c) => c.id !== itemId) }
            : null,
    addReply(n: PageNote, text: string, id: string, at: number): PageNote | null {
        const t = text.trim().slice(0, NOTE_LIMITS.text);
        if (!t || n.replies.length >= NOTE_LIMITS.replies) return null;
        return { ...n, replies: [...n.replies, { id, text: t, at }] };
    },
    removeReply: (n: PageNote, replyId: string): PageNote | null =>
        n.replies.some((r) => r.id === replyId)
            ? { ...n, replies: n.replies.filter((r) => r.id !== replyId) }
            : null,
};

/** Nothing written yet: an empty note is dropped when its editor closes. */
export const isNoteEmpty = (n: PageNote) =>
    !n.text.trim() && n.checklist.length === 0 && n.replies.length === 0;

export function matchesNoteFilter(n: PageNote, f: NoteFilter): boolean {
    if (f.status !== 'all' && n.status !== f.status) return false;
    if (f.colors.length && !f.colors.includes(n.color)) return false;
    const q = f.query.trim().toLowerCase();
    if (!q) return true;
    const texts = [n.text, ...n.checklist.map((c) => c.text), ...n.replies.map((r) => r.text)];
    return texts.some((t) => t.toLowerCase().includes(q));
}

/** Pinned first, then creation order (stable). */
export const sortNotes = (notes: readonly PageNote[]): PageNote[] =>
    [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.createdAt - b.createdAt);

export interface NoteRow {
    pageId: string | null;
    pageName: string;
    /** The pin's number on its page (1-based, page order). */
    number: number;
    note: PageNote;
}

type PageLike = { id: string; name?: string; canvasJSON?: Rec | null };

/**
 * Every page's notes, in page order (pinned first on each page): the open page from the live canvas (`live`), the others from their saved
 * JSON. Without pages yet (first load) the live notes are one unnamed page.
 */
export function collectNotes(
    pages: readonly PageLike[],
    currentPageId: string | null,
    live: readonly PageNote[],
): NoteRow[] {
    const rows = (pageId: string | null, pageName: string, notes: readonly PageNote[]) => {
        const number = new Map(notes.map((n, i) => [n.id, i + 1]));
        return sortNotes(notes).map((note) => ({
            pageId,
            pageName,
            number: number.get(note.id)!,
            note,
        }));
    };
    if (!pages.length) return rows(currentPageId, '', live);
    return pages.flatMap((p, i) =>
        rows(
            p.id,
            p.name || `Page ${i + 1}`,
            p.id === currentPageId
                ? live
                : normalizePageNotes(p.canvasJSON?.pageNotes).filter((n) => !isNoteEmpty(n)),
        ),
    );
}
