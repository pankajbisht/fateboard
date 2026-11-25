/**
 * Document tools (InDesign style, 2026-11-17): page setup (margins, columns, bleed, facing pages, guides), master
 * pages and page numbers. Everything is saved per page on the canvas as canvas-level props in `CUSTOM_PROPS`
 * (`pageSetup`, `pageRole`, `masterId`), so undo, page switches, autosave and files carry it with no change to
 * the Pages slice. Other pages' values are read from their saved `canvasJSON`.
 * - A master page (`pageRole: 'master'`) is drawn under every page that uses it (`pageUnderlay`, through the layer
 *   compositor), never selectable there; edit it by opening the master page itself.
 * - Page number fields (`pageNumberField` text) show the page's number (masters skipped), also on masters.
 * - Guides (`paintPageOverlay`) draw on the board only, never in exports.
 */
import { Textbox, util, type Canvas, type FabricObject } from 'fabric';
import type { SliceCreator } from '../types';
import { defineCanvasProp } from '@/lib/canvas/canvasProp';
import {
    isLayerHelper,
    isLayerVisible,
    leafOrder,
    normalizeLayers,
    rankMap,
    resolveLayerId,
    sortByRank,
} from '@/lib/canvas/docLayers';
import {
    DEFAULT_PAGE_SETUP,
    columnRects,
    contentRect,
    normalizePageRole,
    normalizePageSetup,
    pageNumberOf,
    type PageMargins,
    type PageRole,
    type PageSetup,
} from '@/lib/document/pageSetup';

export type PageSetupPatch = Partial<Omit<PageSetup, 'margins'>> & {
    margins?: Partial<PageMargins>;
};

export interface DocumentSlice {
    /** The current page's setup (mirror of `canvas.pageSetup`). */
    pageSetup: PageSetup;
    /** 'master' when the current page is a master page. */
    pageRole: PageRole;
    /** The master page drawn under the current page, or null. */
    pageMasterId: string | null;
    bindDocument: (canvas: Canvas) => () => void;
    /** Change the setup of this page, or of every page (`allPages`). One undo step. */
    setPageSetup: (patch: PageSetupPatch, allPages?: boolean) => void;
    setPageRole: (role: PageRole) => void;
    applyMasterPage: (masterId: string | null) => void;
    /** Add a page number field at the bottom centre of the page. */
    insertPageNumber: () => void;
    /** This page's number counting document pages only; null on a master page. */
    currentPageNumber: () => number | null;
    /** The master's objects for the layer compositor (empty while loading or without a master). */
    pageUnderlay: () => FabricObject[];
    /** Margin / column guides on the board (layer compositor overlay). */
    paintPageOverlay: (ctx: CanvasRenderingContext2D) => void;
}

type PageRec = { id: string; name?: string; canvasJSON?: Record<string, unknown> | null };
type DocCanvas = Canvas & { pageSetup?: PageSetup; pageRole?: PageRole; masterId?: string | null };
type Peers = DocumentSlice & {
    canvas?: DocCanvas | null;
    pages?: PageRec[];
    currentPageId?: string | null;
    pageWidth?: number;
    pageHeight?: number;
    saveState?: (immediate?: boolean) => void;
    persist?: () => void;
};
type NumberField = FabricObject & { pageNumberField?: boolean; text?: string };

const label = (n: number | null) => (n === null ? '#' : String(n));
const masterIdOf = (v: unknown) => (typeof v === 'string' && v ? v : null);

/** Set every page number field in `objs` to `text`; true when one changed. */
function numberFields(objs: FabricObject[], text: string): boolean {
    let changed = false;
    for (const o of objs as NumberField[])
        if (o.pageNumberField && o.text !== text) {
            o.set('text', text);
            changed = true;
        }
    return changed;
}

export const createDocumentSlice: SliceCreator<DocumentSlice> = (set, get, store) => {
    const peers = () => get() as Peers;
    let master: { id: string; json: unknown; num: string; objects: FabricObject[] } | null = null;
    let loading: string | null = null;

    const roles = (): PageRole[] => {
        const { pages = [], currentPageId, canvas } = peers();
        return pages.map((p) =>
            p.id === currentPageId
                ? normalizePageRole(canvas?.pageRole)
                : normalizePageRole(p.canvasJSON?.pageRole),
        );
    };
    const currentPageNumber = () => {
        const { pages = [], currentPageId, canvas } = peers();
        const i = pages.findIndex((p) => p.id === currentPageId);
        if (i < 0) return normalizePageRole(canvas?.pageRole) === 'master' ? null : 1;
        return pageNumberOf(
            roles().map((role) => ({ role })),
            i,
        );
    };
    const refreshNumbers = () => {
        const c = peers().canvas;
        if (c && numberFields(c.getObjects(), label(currentPageNumber()))) c.requestRenderAll();
    };
    const act = (name: string, fn: (c: DocCanvas) => void) => {
        const c = peers().canvas;
        if (!c) return;
        try {
            fn(c);
        } catch (err) {
            console.error(`[document] ${name} failed`, err);
        }
    };

    return {
        pageSetup: DEFAULT_PAGE_SETUP,
        pageRole: 'page',
        pageMasterId: null,

        bindDocument: (canvas) => {
            const c = canvas as DocCanvas;
            const props = [
                defineCanvasProp(c, 'pageSetup', normalizePageSetup, (pageSetup) =>
                    set({ pageSetup }, false, 'document/setup'),
                ),
                defineCanvasProp(c, 'pageRole', normalizePageRole, (pageRole) =>
                    set({ pageRole }, false, 'document/role'),
                ),
                defineCanvasProp(c, 'masterId', masterIdOf, (pageMasterId) =>
                    set({ pageMasterId }, false, 'document/master'),
                ),
            ];
            const onCleared = () => props.forEach((p) => p.reset());
            const onAdded = ({ target }: { target: FabricObject }) => {
                if ((target as NumberField).pageNumberField)
                    numberFields([target], label(currentPageNumber()));
            };
            const offs = [c.on('canvas:cleared', onCleared), c.on('object:added', onAdded)];
            const unsubscribe = store.subscribe((s: Peers, prev: Peers) => {
                if (s.pages !== prev.pages || s.currentPageId !== prev.currentPageId)
                    refreshNumbers();
            });
            return () => {
                offs.forEach((off) => off());
                unsubscribe();
                props.forEach((p) => p.release());
                master = null;
            };
        },

        setPageSetup: (patch, allPages = false) =>
            act('setPageSetup', (c) => {
                const now = normalizePageSetup(c.pageSetup);
                const next = normalizePageSetup({
                    ...now,
                    ...patch,
                    margins: { ...now.margins, ...patch.margins },
                });
                c.pageSetup = next;
                c.requestRenderAll();
                peers().saveState?.();
                if (!allPages) return;
                const { pages = [], currentPageId } = peers();
                set(
                    {
                        pages: pages.map((p) =>
                            p.id === currentPageId
                                ? p
                                : {
                                      ...p,
                                      canvasJSON: { objects: [], ...p.canvasJSON, pageSetup: next },
                                  },
                        ),
                    } as Partial<DocumentSlice>,
                    false,
                    'document/setupAllPages',
                );
                peers().persist?.();
            }),

        setPageRole: (role) =>
            act('setPageRole', (c) => {
                c.pageRole = role;
                if (role === 'master') c.masterId = null; // a master never shows another master
                refreshNumbers();
                c.requestRenderAll();
                peers().saveState?.();
            }),

        applyMasterPage: (masterId) =>
            act('applyMasterPage', (c) => {
                c.masterId = masterId;
                c.requestRenderAll();
                peers().saveState?.();
            }),

        insertPageNumber: () =>
            act('insertPageNumber', (c) => {
                const { pageWidth = c.getWidth(), pageHeight = c.getHeight() } = peers();
                const s = normalizePageSetup(c.pageSetup);
                const box = contentRect(s, pageWidth, pageHeight, currentPageNumber() ?? 1);
                const field = new Textbox(label(currentPageNumber()), {
                    left: box.left + box.width / 2,
                    top: pageHeight - Math.max(12, s.margins.bottom / 2),
                    originX: 'center',
                    originY: 'center',
                    width: 80,
                    fontSize: 14,
                    textAlign: 'center',
                    fill: '#000000',
                });
                Object.assign(field, { pageNumberField: true, name: 'Page number' });
                c.add(field);
                c.setActiveObject(field);
                c.requestRenderAll();
            }),

        currentPageNumber,

        pageUnderlay: () => {
            const { canvas: c, pages = [], currentPageId } = peers();
            const id = c?.masterId;
            if (!c || !id || normalizePageRole(c.pageRole) === 'master' || id === currentPageId)
                return [];
            const json = pages.find((p) => p.id === id)?.canvasJSON;
            if (!json) return [];
            const num = label(currentPageNumber());
            if (master?.id === id && master.json === json && master.num === num)
                return master.objects;
            const key = `${id}:${num}`;
            if (loading !== key) {
                loading = key;
                util.enlivenObjects<FabricObject>((json.objects as object[]) ?? [])
                    .then((objs) => {
                        if (loading !== key) return;
                        loading = null;
                        const layers = normalizeLayers(json.docLayers);
                        const rank = rankMap(layers);
                        const bottom = leafOrder(layers)[0] ?? '';
                        const leaf = (o: FabricObject) => resolveLayerId(o, layers, bottom);
                        const shown = objs.filter(
                            (o) => !isLayerHelper(o) && isLayerVisible(layers, leaf(o)),
                        );
                        numberFields(shown, num);
                        master = {
                            id,
                            json,
                            num,
                            objects: sortByRank(shown, (o) => rank.get(leaf(o)) ?? 0) ?? shown,
                        };
                        peers().canvas?.requestRenderAll();
                    })
                    .catch((err) => {
                        loading = null;
                        console.error('[document] master page failed to load', err);
                    });
            }
            // the previous picture of the same master while the new one loads
            return master?.id === id ? master.objects : [];
        },

        paintPageOverlay: (ctx) => {
            const { canvas: c, pageWidth, pageHeight } = peers();
            const s = normalizePageSetup(c?.pageSetup);
            if (!c || !s.guides || !pageWidth || !pageHeight) return;
            const box = contentRect(s, pageWidth, pageHeight, currentPageNumber() ?? 1);
            const px = 1 / (ctx.getTransform().a || 1);
            ctx.save();
            ctx.lineWidth = px;
            ctx.setLineDash([]);
            ctx.strokeStyle = '#d946ef'; // margins: magenta (InDesign)
            ctx.strokeRect(box.left, box.top, box.width, box.height);
            if (s.columns > 1) {
                ctx.strokeStyle = '#8b5cf6'; // columns: violet
                ctx.beginPath();
                for (const col of columnRects(box, s.columns, s.gutter)) {
                    ctx.moveTo(col.left, box.top);
                    ctx.lineTo(col.left, box.top + box.height);
                    ctx.moveTo(col.left + col.width, box.top);
                    ctx.lineTo(col.left + col.width, box.top + box.height);
                }
                ctx.stroke();
            }
            ctx.restore();
        },
    };
};
