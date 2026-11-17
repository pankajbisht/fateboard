/**
 * Page setup (InDesign style, 2026-11-17), pure. Stored per page on the canvas (`canvas.pageSetup`, a canvas
 * prop in `CUSTOM_PROPS`, so it travels with the page, undo and autosave) and mirrored by the Document slice.
 * Lengths are page px (the UI converts with lib/units).
 */

export interface PageMargins {
    top: number;
    bottom: number;
    /** At the spine (left on right pages, right on left pages); the left margin without facing pages. */
    inside: number;
    outside: number;
}

export interface PageSetup {
    margins: PageMargins;
    /** Text / layout columns inside the margins, 1 … 24. */
    columns: number;
    /** Space between columns. */
    gutter: number;
    /** Extra area printed past the trim edge (export). */
    bleed: number;
    /** Area past the bleed for notes / printer info (board frame; exported with crop marks). */
    slug: number;
    /** Facing pages (book / magazine spreads): page 1 right, then left / right pairs. */
    facing: boolean;
    /** Show margin, column, bleed and slug guides on the board (never exported). */
    guides: boolean;
    /** Show crop marks at the trim corners on the board (export has its own option). */
    cropMarks: boolean;
}

export type PageRole = 'page' | 'master';
export type Rect = { left: number; top: number; width: number; height: number };

export const DEFAULT_PAGE_SETUP: PageSetup = {
    margins: { top: 36, bottom: 36, inside: 36, outside: 36 },
    columns: 1,
    gutter: 18,
    bleed: 0,
    slug: 0,
    facing: false,
    guides: true, // InDesign shows margins by default (owner 2026-11-17)
    cropMarks: false,
};

const num = (v: unknown, lo: number, hi: number, fallback: number) => {
    const n = Number(v);
    return v === null || v === undefined || v === '' || !Number.isFinite(n)
        ? fallback
        : Math.min(hi, Math.max(lo, n));
};

export function normalizePageSetup(input: unknown): PageSetup {
    const d = DEFAULT_PAGE_SETUP;
    if (!input || typeof input !== 'object') return { ...d, margins: { ...d.margins } };
    const r = input as Record<string, unknown>;
    const m = (r.margins && typeof r.margins === 'object' ? r.margins : {}) as Record<
        string,
        unknown
    >;
    return {
        margins: {
            top: num(m.top, 0, 10000, d.margins.top),
            bottom: num(m.bottom, 0, 10000, d.margins.bottom),
            inside: num(m.inside, 0, 10000, d.margins.inside),
            outside: num(m.outside, 0, 10000, d.margins.outside),
        },
        columns: Math.round(num(r.columns, 1, 24, d.columns)),
        gutter: num(r.gutter, 0, 2000, d.gutter),
        bleed: num(r.bleed, 0, 500, d.bleed),
        slug: num(r.slug, 0, 500, d.slug),
        facing: r.facing === true,
        guides: typeof r.guides === 'boolean' ? r.guides : d.guides,
        cropMarks: r.cropMarks === true,
    };
}

export const normalizePageRole = (v: unknown): PageRole => (v === 'master' ? 'master' : 'page');

/** Facing pages: page 1 is a right page, so even page numbers are left pages. */
export const isLeftPage = (pageNumber: number) => pageNumber % 2 === 0;

/** The box inside the margins of page `pageNumber` (1-based; masters use 1). */
export function contentRect(s: PageSetup, w: number, h: number, pageNumber: number): Rect {
    const { top, bottom, inside, outside } = s.margins;
    const left = s.facing && isLeftPage(pageNumber) ? outside : inside;
    const right = s.facing && isLeftPage(pageNumber) ? inside : outside;
    return {
        left,
        top,
        width: Math.max(0, w - left - right),
        height: Math.max(0, h - top - bottom),
    };
}

/** Equal columns across a box, `gutter` apart. */
export function columnRects(box: Rect, columns: number, gutter: number): Rect[] {
    const n = Math.max(1, Math.round(columns));
    const g = n > 1 ? Math.min(gutter, box.width / (n - 1)) : 0;
    const w = (box.width - g * (n - 1)) / n;
    return Array.from({ length: n }, (_, i) => ({
        left: box.left + i * (w + g),
        top: box.top,
        width: w,
        height: box.height,
    }));
}

/** 1-based number of the page at `index` counting document pages only; null for a master page. */
export function pageNumberOf(pages: { role: PageRole }[], index: number): number | null {
    if (pages[index]?.role === 'master') return null;
    let n = 0;
    for (let i = 0; i <= index && i < pages.length; i++) if (pages[i].role !== 'master') n++;
    return n;
}
