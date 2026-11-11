import type * as fabric from 'fabric';
import type { SliceCreator } from '../types';
import type { Orientation, PageFormat } from '@lib/types/page';
import {
    DEFAULT_PAGE_BACKGROUND,
    MAX_PAGE_PX,
    isFreehand,
    type CustomPageSize,
} from './createPageSlice';
import { CUSTOM_PROPS, serializeCanvas } from '@/lib/serialization';
import type { ProjectDoc } from '@/lib/storage';
import { emptyAnimation, type AnimationData } from '@/animation/engine';
import type { CanvasPreset } from '@/components/organisms/board/board.type';

/**
 * Custom props that must survive toObject()/loadFromJSON(). Fabric drops anything
 * not in this list. Keep it in sync with the props your other slices put on objects.
 */
export const PAGE_SERIALIZE_PROPS: string[] = [...CUSTOM_PROPS];

const THUMB_WIDTH = 160;
/** Project file / autosave format version (`.fateboard` files and the IndexedDB autosave). */
export const PROJECT_VERSION = 1;
const EMPTY_JSON = { objects: [] as unknown[] };

export type Page = {
    id: string;
    name: string;
    canvasJSON: Record<string, any> | null;
    thumbnail?: string;
    // Per-page setup, so A4 portrait and a 1920x1080 slide can live in one project.
    format: PageFormat;
    orientation: Orientation;
    customSize: CustomPageSize | null;
    background: string;
    /** This page's animation (decision Q12: each page is its own scene). Absent = none. */
    animation?: AnimationData;
    /** This page's size (BUG-007 / BUG-109: the one page-size source). Absent = keep the current one. */
    preset?: CanvasPreset;
    createdAt: number;
    updatedAt: number;
};

type PageSnapshot = Pick<
    Page,
    | 'canvasJSON'
    | 'thumbnail'
    | 'format'
    | 'orientation'
    | 'customSize'
    | 'background'
    | 'animation'
    | 'preset'
    | 'updatedAt'
>;

export type PagesSlice = {
    pages: Page[];
    currentPageId: string | null;
    /** True while a page is being loaded into the canvas. Undo/redo + autosave listeners should ignore events while this is true. */
    isPageSwitching: boolean;

    initPages: () => void;
    addPage: (afterId?: string) => Promise<string | null>;
    duplicatePage: (id: string) => Promise<string | null>;
    deletePage: (id: string) => Promise<boolean>;
    renamePage: (id: string, name: string) => void;
    movePage: (id: string, toIndex: number) => void;
    switchPage: (toId: string) => Promise<void>;
    goToNextPage: () => Promise<void>;
    goToPrevPage: () => Promise<void>;
    saveCurrentPage: () => void;
    clearCurrentPage: () => void;
    applyFormatToAllPages: () => void;
    exportPageAsDataURL: (quality?: number, format?: 'png' | 'jpeg') => string | null;
    exportProject: () => string;
    /**
     * The whole project (every page, live canvas written into the current one) for autosave
     * (BUG-004). Null until pages exist. `thumbnail: false` keeps the stored thumbnail (cheaper).
     */
    captureProject: (options?: { thumbnail?: boolean }) => ProjectDoc | null;
    /** Loads a project: a `.fateboard` JSON string or an already-parsed project object. */
    importProject: (json: string | object) => Promise<boolean>;
};

/* ----------------------------- helpers ----------------------------- */

const newId = () => crypto.randomUUID();

const nextPageName = (pages: Page[]) => {
    const nums = pages
        .map((p) => /^Page (\d+)$/.exec(p.name))
        .filter((m): m is RegExpExecArray => !!m)
        .map((m) => Number(m[1]));
    return `Page ${Math.max(0, ...nums) + 1}`;
};

const makeThumbnail = (canvas: fabric.Canvas): string | undefined => {
    try {
        const w = canvas.getWidth();
        if (!w) return undefined;
        return canvas.toDataURL({ format: 'png', multiplier: THUMB_WIDTH / w });
    } catch {
        // tainted canvas (cross-origin image) etc. A missing thumbnail is not fatal.
        return undefined;
    }
};

/** A page side the editor can show: a file must not ask for a canvas of any size (BUG-157). */
const isPageSide = (n: unknown): n is number =>
    typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= MAX_PAGE_PX;

const isPreset = (p: unknown): p is CanvasPreset =>
    !!p &&
    typeof p === 'object' &&
    isPageSide((p as CanvasPreset).width) &&
    isPageSide((p as CanvasPreset).height);

/** Thumbnails are shown in an `<img>`: only an embedded image, never an address to fetch (BUG-157). */
const isThumbnail = (t: unknown): t is string =>
    typeof t === 'string' && t.startsWith('data:image/');

/** Canvas slice: THE page size (BUG-007). */
type PresetPeers = {
    selectedPreset?: CanvasPreset;
    setSelectedPreset?: (preset: CanvasPreset) => void;
};

const isAnimationData = (a: unknown): a is AnimationData =>
    !!a &&
    typeof a === 'object' &&
    !!(a as AnimationData).tracks &&
    typeof (a as AnimationData).tracks === 'object';

/** Dialog slice: tell the user when a page cannot be opened. */
type DialogPeers = {
    alertDialog?: (options: { title: string; message?: string }) => Promise<void>;
};

/** Animation slice API used here (kept optional: the pages slice also runs without it in tests). */
type AnimationPeers = {
    getAnimationData?: () => AnimationData;
    loadAnimationData?: (data: AnimationData, options?: { keepHistory?: boolean }) => void;
    pause?: () => void;
};

const isValidSize = (s: any): s is CustomPageSize => !!s && isPageSide(s.w) && isPageSide(s.h);

const normalizePage = (raw: any, index: number, used: Set<string>): Page => {
    let id = typeof raw?.id === 'string' && raw.id ? raw.id : newId();
    if (used.has(id)) id = newId();
    used.add(id);
    const now = Date.now();
    return {
        id,
        name: typeof raw?.name === 'string' && raw.name.trim() ? raw.name : `Page ${index + 1}`,
        canvasJSON: raw?.canvasJSON && typeof raw.canvasJSON === 'object' ? raw.canvasJSON : null,
        thumbnail: isThumbnail(raw?.thumbnail) ? raw.thumbnail : undefined,
        format: (typeof raw?.format === 'string' && raw.format
            ? raw.format
            : 'Freehand') as PageFormat,
        orientation: raw?.orientation === 'portrait' ? 'portrait' : 'landscape',
        customSize: isValidSize(raw?.customSize) ? raw.customSize : null,
        background: typeof raw?.background === 'string' ? raw.background : DEFAULT_PAGE_BACKGROUND,
        ...(isAnimationData(raw?.animation) ? { animation: raw.animation } : {}),
        ...(isPreset(raw?.preset) ? { preset: raw.preset } : {}),
        createdAt: Number(raw?.createdAt) || now,
        updatedAt: Number(raw?.updatedAt) || now,
    };
};

/* ------------------------------ slice ------------------------------ */

export const createPagesSlice: SliceCreator<PagesSlice> = (set, get) => {
    // Page switches are async (loadFromJSON returns a Promise). Every page operation runs through
    // one queue so rapid clicks never interleave loads. Per store, not module-level (BUG-035).
    let opChain: Promise<unknown> = Promise.resolve();
    const runExclusive = <T>(task: () => Promise<T>): Promise<T> => {
        const next = opChain.then(task, task);
        opChain = next.catch(() => undefined);
        return next;
    };

    /** Snapshot of the live canvas + page setup (read from PageSlice). */
    const capture = (withThumbnail = true): PageSnapshot | null => {
        const s = get();
        const canvas = s.canvas;
        if (!canvas) return null;
        const thumbnail = withThumbnail ? makeThumbnail(canvas) : undefined;
        const animation = (s as unknown as AnimationPeers).getAnimationData?.();
        const preset = (s as unknown as PresetPeers).selectedPreset;
        return {
            ...(animation ? { animation } : {}),
            ...(preset ? { preset } : {}),
            // FIX: toJSON() drops custom props (id, name, locked...). toObject(props) keeps them.
            canvasJSON: serializeCanvas(canvas, PAGE_SERIALIZE_PROPS),
            ...(thumbnail ? { thumbnail } : {}),
            format: s.pageFormat,
            orientation: s.orientation,
            customSize: s.customSize,
            background: s.pageBackground,
            updatedAt: Date.now(),
        };
    };

    /** Pages list with the live canvas written back into the current page. */
    const withCurrentSaved = (withThumbnail = true): Page[] => {
        const { pages, currentPageId } = get();
        if (!currentPageId) return pages;
        const snap = capture(withThumbnail);
        if (!snap) return pages;
        return pages.map((p) => (p.id === currentPageId ? { ...p, ...snap } : p));
    };

    /**
     * Load a page into the canvas and make it current. Resolves false when the page cannot be
     * loaded: Fabric replaces the objects only after all of them are built, so the canvas still
     * shows the page that was open, and the page list and current page go back to match it
     * (BUG-154). Without that, the old content was autosaved into the page that failed.
     */
    const showPage = async (nextPages: Page[], targetId: string): Promise<boolean> => {
        const canvas = get().canvas;
        const target = nextPages.find((p) => p.id === targetId);
        if (!canvas || !target) return false;

        const anim = get() as unknown as AnimationPeers;
        anim.pause?.(); // playback must not drive the page that is being swapped out

        const before = { pages: get().pages, currentPageId: get().currentPageId };
        const { renderOnAddRemove } = canvas;
        set(
            { pages: nextPages, currentPageId: targetId, isPageSwitching: true },
            false,
            'pages/show:start',
        );

        try {
            // FIX: the old code used the v5 callback form and never awaited, so the
            // canvas rendered before objects existed. loadFromJSON also replaces
            // the objects itself, so the extra canvas.clear() is gone.
            await canvas.loadFromJSON(target.canvasJSON ?? EMPTY_JSON);
        } catch (err) {
            console.error('[pages] failed to load page', err);
            // Fabric switches this off for the load and only switches it back on success
            canvas.renderOnAddRemove = renderOnAddRemove;
            set({ ...before, isPageSwitching: false }, false, 'pages/show:failed');
            return false;
        }

        try {
            // Restore this page's own size/orientation/background (FIX: pages used to
            // share one global size).
            set(
                {
                    pageFormat: target.format,
                    orientation: target.orientation,
                    customSize: target.customSize,
                    pageBackground: target.background,
                },
                false,
                'pages/show:meta',
            );
            // this page's size first (one source, BUG-007 / BUG-109); CanvasBoard re-sizes from it
            if (target.preset) (get() as unknown as PresetPeers).setSelectedPreset?.(target.preset);
            get().applyPageSize(target.format, target.orientation);
            canvas.backgroundColor = target.background;
            // this page's own tracks (Q12); objects were saved at rest, the timeline starts at 0
            anim.loadAnimationData?.(target.animation ?? emptyAnimation(), { keepHistory: true });
            canvas.discardActiveObject();
            canvas.requestRenderAll();

            // Fresh thumbnail (covers imported pages that have none).
            const thumbnail = makeThumbnail(canvas);
            if (thumbnail) {
                set(
                    (state: PagesSlice) => ({
                        pages: state.pages.map((p) =>
                            p.id === targetId ? { ...p, thumbnail } : p,
                        ),
                    }),
                    false,
                    'pages/show:thumb',
                );
            }
        } catch (err) {
            console.error('[pages] failed to set up page', err);
        } finally {
            set({ isPageSwitching: false }, false, 'pages/show:end');
        }
        // The page list / current page changed (an empty page loads without object events).
        get().persist?.();
        return true;
    };

    /** Tells the user a page could not be opened (the slice also runs without dialogs in tests). */
    const reportUnreadablePage = (name: string) => {
        void (get() as unknown as DialogPeers).alertDialog?.({
            title: "Can't open page",
            message: `"${name}" has content this version of Fateboard cannot read. The page was left unchanged.`,
        });
    };

    const insertAfter = (list: Page[], index: number, page: Page) => {
        const at = index === -1 ? list.length : index + 1;
        return [...list.slice(0, at), page, ...list.slice(at)];
    };

    const step = async (delta: number) => {
        const { pages, currentPageId } = get();
        const i = pages.findIndex((p) => p.id === currentPageId);
        const target = pages[i + delta];
        if (target) await get().switchPage(target.id);
    };

    return {
        pages: [],
        currentPageId: null,
        isPageSwitching: false,

        // Call once after the canvas exists. Adopts whatever is on the canvas as Page 1.
        initPages: () => {
            if (get().pages.length || !get().canvas) return;
            const snap = capture();
            if (!snap) return;
            const page: Page = { id: newId(), name: 'Page 1', createdAt: Date.now(), ...snap };
            set({ pages: [page], currentPageId: page.id }, false, 'pages/init');
        },

        // FIX: used to copy the current canvas into the new page (so "add page" duplicated
        // content), never saved the page you left, and never loaded the new page.
        addPage: (afterId) =>
            runExclusive(async () => {
                if (!get().canvas) return null;
                if (!get().pages.length) get().initPages();

                const saved = withCurrentSaved();
                if (!saved.length) return null;

                const refIndex = saved.findIndex((p) => p.id === (afterId ?? get().currentPageId));
                const ref = saved[refIndex] ?? saved[saved.length - 1];
                const now = Date.now();
                const page: Page = {
                    id: newId(),
                    name: nextPageName(saved),
                    canvasJSON: null,
                    format: ref.format,
                    orientation: ref.orientation,
                    customSize: ref.customSize,
                    background: ref.background,
                    ...(ref.preset ? { preset: { ...ref.preset } } : {}),
                    createdAt: now,
                    updatedAt: now,
                };

                const shown = await showPage(insertAfter(saved, refIndex, page), page.id);
                return shown ? page.id : null;
            }),

        duplicatePage: (id) =>
            runExclusive(async () => {
                if (!get().canvas) return null;
                const saved = withCurrentSaved();
                const index = saved.findIndex((p) => p.id === id);
                if (index === -1) return null;

                const src = saved[index];
                const now = Date.now();
                const copy: Page = {
                    ...src,
                    id: newId(),
                    name: `${src.name} copy`,
                    canvasJSON: src.canvasJSON ? structuredClone(src.canvasJSON) : null,
                    ...(src.animation ? { animation: structuredClone(src.animation) } : {}),
                    customSize: src.customSize ? { ...src.customSize } : null,
                    createdAt: now,
                    updatedAt: now,
                };

                if (await showPage(insertAfter(saved, index, copy), copy.id)) return copy.id;
                reportUnreadablePage(src.name);
                return null;
            }),

        // FIX: deleting the active page changed currentPageId but left the old page's
        // objects on the canvas.
        deletePage: (id) =>
            runExclusive(async () => {
                const saved = withCurrentSaved();
                if (saved.length <= 1) return false;
                const index = saved.findIndex((p) => p.id === id);
                if (index === -1) return false;

                const remaining = saved.filter((p) => p.id !== id);
                if (id === get().currentPageId) {
                    // the neighbour first, then any other page that loads
                    const neighbour = remaining[Math.min(index, remaining.length - 1)];
                    const order = [neighbour, ...remaining.filter((p) => p !== neighbour)];
                    let shown = false;
                    for (const page of order) {
                        shown = await showPage(remaining, page.id);
                        if (shown) break;
                    }
                    if (!shown) {
                        reportUnreadablePage(neighbour.name);
                        return false;
                    }
                } else {
                    set({ pages: remaining }, false, 'pages/delete');
                    get().persist?.();
                }
                return true;
            }),

        renamePage: (id, name) => {
            const clean = name.trim();
            if (!clean) return;
            set(
                (state: PagesSlice) => ({
                    pages: state.pages.map((p) => (p.id === id ? { ...p, name: clean } : p)),
                }),
                false,
                'pages/rename',
            );
            get().persist?.();
        },

        movePage: (id, toIndex) => {
            const list = [...get().pages];
            const from = list.findIndex((p) => p.id === id);
            if (from === -1) return;
            const to = Math.min(Math.max(toIndex, 0), list.length - 1);
            if (from === to) return;
            const [item] = list.splice(from, 1);
            list.splice(to, 0, item);
            set({ pages: list }, false, 'pages/move');
            get().persist?.();
        },

        switchPage: (toId) =>
            runExclusive(async () => {
                if (toId === get().currentPageId) return;
                const saved = withCurrentSaved();
                const target = saved.find((p) => p.id === toId);
                if (!target) return;
                if (!(await showPage(saved, toId))) reportUnreadablePage(target.name);
            }),

        goToNextPage: () => step(1),
        goToPrevPage: () => step(-1),

        saveCurrentPage: () => {
            if (get().isPageSwitching || !get().currentPageId) return;
            set({ pages: withCurrentSaved() }, false, 'pages/save');
        },

        clearCurrentPage: () => {
            const canvas = get().canvas;
            if (!canvas || get().isPageSwitching) return;
            canvas.discardActiveObject();
            canvas.remove(...canvas.getObjects());
            canvas.requestRenderAll();
            get().saveCurrentPage();
        },

        // Copies the current page's size/orientation to every page (content is not rescaled).
        applyFormatToAllPages: () => {
            const { pageFormat, orientation, customSize } = get();
            const saved = withCurrentSaved();
            set(
                {
                    pages: saved.map((p) => ({
                        ...p,
                        format: pageFormat,
                        orientation,
                        customSize: customSize ? { ...customSize } : null,
                    })),
                },
                false,
                'pages/applyFormatToAll',
            );
            get().persist?.();
        },

        // Exports the page at real page resolution, independent of the current zoom.
        exportPageAsDataURL: (quality = 2, format = 'png') => {
            const canvas = get().canvas;
            if (!canvas) return null;
            try {
                const { pageWidth, pageFormat } = get();
                const base = canvas.getWidth() || 1;
                const multiplier = isFreehand(pageFormat) ? quality : (pageWidth * quality) / base;
                canvas.discardActiveObject();
                canvas.renderAll();
                return canvas.toDataURL({ format, multiplier, quality: 1 });
            } catch (err) {
                console.error('[pages] export failed', err);
                return null;
            }
        },

        exportProject: () =>
            JSON.stringify({
                app: 'fateboard',
                version: PROJECT_VERSION,
                exportedAt: new Date().toISOString(),
                currentPageId: get().currentPageId,
                pages: withCurrentSaved(),
            }),

        captureProject: ({ thumbnail = true } = {}) => {
            const { pages, currentPageId } = get();
            if (!pages.length || !currentPageId) return null;
            return {
                app: 'fateboard',
                version: PROJECT_VERSION,
                savedAt: new Date().toISOString(),
                currentPageId,
                pages: withCurrentSaved(thumbnail),
            };
        },

        importProject: (json) =>
            runExclusive(async () => {
                try {
                    const data = typeof json === 'string' ? JSON.parse(json) : json;
                    const raw = Array.isArray(data) ? data : data?.pages;
                    if (!Array.isArray(raw) || !raw.length) return false;

                    const used = new Set<string>();
                    const pages = raw
                        .filter((p) => p && typeof p === 'object')
                        .map((p, i) => normalizePage(p, i, used));
                    if (!pages.length) return false;

                    // the page that was open, else the first page that loads; a page that cannot
                    // be read stays in the project untouched (BUG-154)
                    const wanted = pages.find((p) => p.id === data?.currentPageId) ?? pages[0];
                    for (const page of [wanted, ...pages.filter((p) => p !== wanted)]) {
                        if (await showPage(pages, page.id)) return true;
                    }
                    return false;
                } catch (err) {
                    console.error('[pages] import failed', err);
                    return false;
                }
            }),
    };
};
