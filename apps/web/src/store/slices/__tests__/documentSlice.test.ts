/**
 * Document slice (2026-11-17, InDesign style): page setup (margins, columns, bleed, facing pages, guides),
 * master pages drawn under the pages that use them, page number fields.
 */
import * as fabric from 'fabric';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHarness, type Harness } from '@/test/sliceHarness';
import { serializeCanvas } from '@/lib/serialization';
import { createDocumentSlice, type DocumentSlice } from '../createDocumentSlice';

type PageRec = { id: string; name: string; canvasJSON: Record<string, unknown> | null };
type S = DocumentSlice & { canvas: fabric.Canvas; pages: PageRec[]; currentPageId: string };
let h: Harness<S>;
let canvas: fabric.Canvas;
let unbind: () => void;
const saveState = vi.fn();
const persist = vi.fn();
const flush = () => new Promise((r) => setTimeout(r, 0));

const page = (id: string, json: Record<string, unknown> | null = { objects: [] }): PageRec => ({
    id,
    name: id,
    canvasJSON: json,
});

beforeEach(() => {
    canvas = new fabric.Canvas(document.createElement('canvas'), { renderOnAddRemove: false });
    h = createHarness<S>([createDocumentSlice], {
        canvas,
        pages: [page('p1'), page('p2'), page('p3')],
        currentPageId: 'p2',
        pageWidth: 600,
        pageHeight: 800,
        saveState,
        persist,
    });
    unbind = h.get().bindDocument(canvas);
});
afterEach(() => {
    unbind();
    canvas.dispose();
    vi.clearAllMocks();
});

describe('page setup', () => {
    it('lives on the page (saved with it) and is mirrored in the store', async () => {
        h.get().setPageSetup({ margins: { top: 50 }, columns: 3, guides: true });
        expect(h.get().pageSetup.margins.top).toBe(50);
        expect(h.get().pageSetup.margins.bottom).toBe(36);
        expect(saveState).toHaveBeenCalled();
        const json = serializeCanvas(canvas) as { pageSetup: { columns: number } };
        expect(json.pageSetup.columns).toBe(3);
        await canvas.loadFromJSON({ objects: [] }); // an old page: defaults
        expect(h.get().pageSetup.columns).toBe(1);
        await canvas.loadFromJSON(json);
        expect(h.get().pageSetup.columns).toBe(3);
    });

    it('"apply to all pages" writes the setup into every other page', () => {
        h.get().setPageSetup({ facing: true }, true);
        for (const p of h.get().pages.filter((x) => x.id !== 'p2'))
            expect((p.canvasJSON as { pageSetup: { facing: boolean } }).pageSetup.facing).toBe(
                true,
            );
        expect(persist).toHaveBeenCalled();
    });

    it('guides draw on the board (margin box, column lines) only when shown', () => {
        const ctx = {
            save: vi.fn(),
            restore: vi.fn(),
            strokeRect: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            stroke: vi.fn(),
            setLineDash: vi.fn(),
            getTransform: () => ({ a: 2 }),
        } as unknown as CanvasRenderingContext2D;
        h.get().setPageSetup({ guides: false }); // on by default since 2026-11-17
        h.get().paintPageOverlay(ctx);
        expect(ctx.strokeRect).not.toHaveBeenCalled();
        h.get().setPageSetup({ guides: true, columns: 2 });
        h.get().paintPageOverlay(ctx);
        expect(ctx.strokeRect).toHaveBeenCalledWith(36, 36, 528, 728);
        expect(ctx.lineTo).toHaveBeenCalled();
    });
});

describe('master pages and page numbers', () => {
    it('page numbers skip master pages', () => {
        expect(h.get().currentPageNumber()).toBe(2);
        h.set({
            pages: [page('p1', { objects: [], pageRole: 'master' }), page('p2'), page('p3')],
        });
        expect(h.get().currentPageNumber()).toBe(1);
        h.get().setPageRole('master');
        expect(h.get().pageRole).toBe('master');
        expect(h.get().currentPageNumber()).toBeNull();
    });

    it('a page number field shows the page number and follows page moves', () => {
        h.get().insertPageNumber();
        const field = canvas.getObjects()[0] as fabric.Textbox & { pageNumberField?: boolean };
        expect(field.pageNumberField).toBe(true);
        expect(field.text).toBe('2');
        h.set({ pages: [page('p2'), page('p1'), page('p3')] });
        expect(field.text).toBe('1');
    });

    it('the master is drawn under the page, with its own page number fields numbered for this page', async () => {
        const master = page('m', {
            pageRole: 'master',
            objects: [
                { type: 'Rect', width: 10, height: 10, fill: '#ff0000' },
                { type: 'Textbox', text: '#', pageNumberField: true },
                { type: 'Rect', width: 10, height: 10, layerId: 'hidden' },
            ],
            docLayers: [
                { id: 'shown', name: 'A', kind: 'layer' },
                { id: 'hidden', name: 'B', kind: 'layer', visible: false },
            ],
        });
        h.set({ pages: [master, page('p1'), page('p2')], currentPageId: 'p2' });
        h.get().applyMasterPage('m');
        expect(h.get().pageMasterId).toBe('m');
        expect(h.get().pageUnderlay()).toEqual([]); // loading
        await flush();
        const under = h.get().pageUnderlay();
        expect(under.map((o) => o.type)).toEqual(['rect', 'textbox']); // the hidden layer is left out
        expect((under[1] as fabric.Textbox).text).toBe('2');
        h.get().setPageRole('master');
        expect(h.get().pageUnderlay()).toEqual([]); // a master page shows no master
    });
});
