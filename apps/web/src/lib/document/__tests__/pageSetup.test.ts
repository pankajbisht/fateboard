// @vitest-environment node
/** Page setup (InDesign style, 2026-11-17): margins, columns, bleed, facing pages, page numbers. */
import { describe, expect, it } from 'vitest';
import {
    DEFAULT_PAGE_SETUP,
    columnRects,
    contentRect,
    isLeftPage,
    normalizePageSetup,
    pageNumberOf,
} from '../pageSetup';

describe('normalizePageSetup', () => {
    it('anything bad falls back to the defaults; values are clamped', () => {
        expect(normalizePageSetup(undefined)).toEqual(DEFAULT_PAGE_SETUP);
        const s = normalizePageSetup({
            margins: { top: -5, bottom: 20, inside: 'x', outside: 1e9 },
            columns: 3.7,
            gutter: -1,
            bleed: 9,
            facing: 1,
            guides: true,
        });
        expect(s.margins).toEqual({ top: 0, bottom: 20, inside: 36, outside: 10000 });
        expect(s.columns).toBe(4);
        expect(s.gutter).toBe(0);
        expect(s.bleed).toBe(9);
        expect(s.facing).toBe(false);
        expect(s.guides).toBe(true);
    });

    it('slug and crop marks (2026-11-17): clamped / boolean; guides are on unless a page turned them off', () => {
        expect(DEFAULT_PAGE_SETUP).toMatchObject({ guides: true, slug: 0, cropMarks: false });
        expect(normalizePageSetup({}).guides).toBe(true); // a page saved before guides existed
        expect(normalizePageSetup({ guides: false }).guides).toBe(false);
        expect(normalizePageSetup({ guides: 'yes' }).guides).toBe(true);
        const s = normalizePageSetup({ slug: 900, cropMarks: true });
        expect(s.slug).toBe(500);
        expect(s.cropMarks).toBe(true);
        expect(normalizePageSetup({ slug: -3, cropMarks: 1 })).toMatchObject({
            slug: 0,
            cropMarks: false,
        });
    });
});

describe('facing pages', () => {
    it('page 1 is a right page; even pages are left pages', () => {
        expect([1, 2, 3, 4].map(isLeftPage)).toEqual([false, true, false, true]);
    });

    it('inside margin sits at the spine: left on right pages, right on left pages', () => {
        const s = {
            ...DEFAULT_PAGE_SETUP,
            margins: { top: 10, bottom: 20, inside: 40, outside: 5 },
            facing: true,
        };
        expect(contentRect(s, 200, 300, 1)).toEqual({ left: 40, top: 10, width: 155, height: 270 });
        expect(contentRect(s, 200, 300, 2)).toEqual({ left: 5, top: 10, width: 155, height: 270 });
        const single = { ...s, facing: false };
        expect(contentRect(single, 200, 300, 2).left).toBe(40); // inside = left without facing pages
    });
});

describe('columns', () => {
    it('splits the content box into equal columns with gutters', () => {
        const cols = columnRects({ left: 0, top: 0, width: 100, height: 50 }, 3, 5);
        expect(cols.map((c) => [c.left, Math.round(c.width * 100) / 100])).toEqual([
            [0, 30],
            [35, 30],
            [70, 30],
        ]);
    });
});

describe('page numbers', () => {
    it('counts document pages only (masters are skipped); a master shows no number', () => {
        const pages = (['page', 'master', 'page', 'page'] as const).map((role) => ({ role }));
        expect(pages.map((_, i) => pageNumberOf(pages, i))).toEqual([1, null, 2, 3]);
    });
});
