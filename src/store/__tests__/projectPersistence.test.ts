/**
 * BUG-004: autosave keeps the whole project (every page + current page), not only the live canvas.
 * Real store (all slices composed) + fake canvas + in-memory storage backend. A "reload" = a fresh
 * empty canvas and empty pages state, then `restoreFromStorage()` + `initPages()` like `init()`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import db from 'opendb-store';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { tick } from '@/test/sliceHarness';
import {
    LEGACY_DRAW_KEY,
    UNREADABLE_KEY,
    createMemoryBackend,
    projectStorage,
} from '@/lib/storage';

/* eslint-disable @typescript-eslint/no-explicit-any */

let canvas: any;
let backend: ReturnType<typeof createMemoryBackend>;
let prev: any;
const state = () => useStore.getState() as any;
const ids = () => canvas.getObjects().map((o: any) => o.id);
const settle = () => tick(400); // autosave is debounced (300 ms)

const mount = () => {
    canvas = createFakeCanvas();
    canvas.setCursor = () => undefined;
    useStore.setState({ canvas, pages: [], currentPageId: null } as any);
    state().registerCanvasEvents(canvas);
};

const unmount = () => {
    state().unregisterCanvasEvents(canvas);
    state().clearHistory();
};

/** Simulates a page reload: new empty canvas + empty pages, then the same steps as `init()`. */
const reload = async () => {
    unmount();
    mount();
    await state().restoreFromStorage();
    state().initPages();
};

beforeEach(() => {
    prev = { ...useStore.getState() };
    backend = createMemoryBackend();
    projectStorage.useBackend(backend);
    db.local.remove(LEGACY_DRAW_KEY);
    mount();
    state().initPages();
});

afterEach(() => {
    unmount();
    useStore.setState({ canvas: prev.canvas, pages: prev.pages, currentPageId: null } as any);
});

describe('project autosave (BUG-004)', () => {
    it('all pages and the current page survive a reload', async () => {
        canvas.add({ type: 'rect', id: 'r1' });
        await state().addPage();
        canvas.add({ type: 'circle', id: 'c1' });
        await settle();

        await reload();

        expect(state().pages).toHaveLength(2);
        expect(state().currentPageId).toBe(state().pages[1].id);
        expect(ids()).toEqual(['c1']);
        await state().switchPage(state().pages[0].id);
        expect(ids()).toEqual(['r1']);
    });

    it('page-only changes (rename, reorder, adding an empty page) are saved', async () => {
        await state().addPage();
        await settle();
        const [first] = state().pages;
        state().renamePage(first.id, 'Cover');
        state().movePage(first.id, 1);
        await settle();

        await reload();

        expect(state().pages.map((p: any) => p.name)).toEqual(['Page 2', 'Cover']);
    });

    it('migrates the old single-canvas save (drawJson) into Page 1 and removes the old key', async () => {
        unmount();
        db.local.set(LEGACY_DRAW_KEY, { version: '7', objects: [{ type: 'rect', id: 'old' }] });
        mount();
        await state().restoreFromStorage();
        state().initPages();
        expect(ids()).toEqual(['old']);

        state().persist();
        await settle();

        const saved: any = await backend.get('project');
        expect(saved.pages).toHaveLength(1);
        expect(saved.pages[0].canvasJSON.objects.map((o: any) => o.id)).toEqual(['old']);
        expect(db.local.get(LEGACY_DRAW_KEY) ?? null).toBeNull();
    });

    it('never saves a page while it is still loading', async () => {
        canvas.add({ type: 'rect', id: 'r1' });
        await state().addPage();
        await settle();
        const saved: any = await backend.get('project');
        const [p1, p2] = saved.pages;
        expect(p1.canvasJSON.objects.map((o: any) => o.id)).toEqual(['r1']);
        expect(p2.canvasJSON?.objects ?? []).toEqual([]);
    });

    it('New board resets the project to one empty page and clears the saved copy', async () => {
        canvas.add({ type: 'rect', id: 'r1' });
        await state().addPage();
        await settle();

        state().clearBoard();
        await settle();

        expect(state().pages).toHaveLength(1);
        expect(ids()).toEqual([]);
        // the old project is gone: at most the new empty one-page project is saved
        const saved: any = await backend.get('project');
        if (saved) {
            expect(saved.pages).toHaveLength(1);
            expect(saved.pages[0].canvasJSON?.objects ?? []).toEqual([]);
        }

        await reload();
        expect(state().pages).toHaveLength(1);
        expect(ids()).toEqual([]);
    });
    it('a saved project that cannot be opened is kept as a backup, not overwritten (BUG-154)', async () => {
        const doc = {
            app: 'fateboard',
            version: 1,
            currentPageId: 'p',
            pages: [{ id: 'p', name: 'P', canvasJSON: { objects: [{ type: 'nope', id: 'x' }] } }],
        };
        await backend.set('project', doc);
        const confirmDialog = vi.fn(async () => false);
        useStore.setState({ confirmDialog } as any);
        vi.spyOn(console, 'error').mockImplementation(() => undefined);

        unmount();
        mount();
        const load = canvas.loadFromJSON;
        canvas.loadFromJSON = async (json: any) => {
            if (json?.objects?.some((o: any) => o.type === 'nope')) throw new Error('unknown type');
            return load(json);
        };
        expect(await state().restoreFromStorage()).toBe(false);
        state().initPages();
        canvas.add({ type: 'rect', id: 'new' });
        await settle();

        expect(await backend.get(UNREADABLE_KEY)).toEqual(doc);
        expect(confirmDialog).toHaveBeenCalledTimes(1);
        useStore.setState({ confirmDialog: prev.confirmDialog } as any);
        vi.restoreAllMocks();
    });

    it('a saved project that cannot be READ at startup is never written over (BUG-173)', async () => {
        const doc = {
            app: 'fateboard',
            version: 1,
            currentPageId: 'p',
            pages: [
                { id: 'p', name: 'P', canvasJSON: { objects: [{ type: 'rect', id: 'kept' }] } },
            ],
        };
        await backend.set('project', doc);
        const realGet = backend.get;
        backend.get = () => Promise.reject(new Error('disk error'));
        const alertDialog = vi.fn(async () => undefined);
        useStore.setState({ alertDialog } as any);
        vi.spyOn(console, 'error').mockImplementation(() => undefined);

        await reload();
        canvas.add({ type: 'rect', id: 'new' });
        await settle();
        state().clearBoard(); // "New board" must not delete it either
        await settle();

        backend.get = realGet;
        expect(await backend.get('project')).toEqual(doc);
        expect(alertDialog).toHaveBeenCalledTimes(1);

        // once the project can be read again, it opens and autosave works again
        await reload();
        expect(ids()).toEqual(['kept']);
        canvas.add({ type: 'rect', id: 'after' });
        await settle();
        const saved: any = await backend.get('project');
        expect(saved.pages[0].canvasJSON.objects.map((o: any) => o.id)).toEqual(['kept', 'after']);

        useStore.setState({ alertDialog: prev.alertDialog } as any);
        vi.restoreAllMocks();
    });

    it('an edit made while the saved board is still being read is autosaved (BUG-186)', async () => {
        // first visit: nothing saved, and the read is slow (IndexedDB under load)
        const realGet = backend.get;
        let release!: () => void;
        const gate = new Promise<void>((resolve) => (release = resolve));
        backend.get = async (key) => {
            await gate;
            return realGet(key);
        };

        unmount();
        mount();
        const restoring = state().restoreFromStorage();
        canvas.add({ type: 'image', id: 'photo' }); // e.g. a photo opened right away
        release();
        await restoring;
        state().initPages();
        await settle();
        backend.get = realGet;

        await reload();
        expect(ids()).toEqual(['photo']);
    });

    it('any save skipped during the startup read is done once it ends, not only added objects (BUG-186)', async () => {
        const realGet = backend.get;
        let release!: () => void;
        const gate = new Promise<void>((resolve) => (release = resolve));
        backend.get = async (key) => {
            await gate;
            return realGet(key);
        };

        unmount();
        mount();
        const restoring = state().restoreFromStorage();
        state().persist(); // a document change that adds no object
        release();
        await restoring;
        state().initPages();
        await settle();
        backend.get = realGet;

        expect(await backend.get('project')).toMatchObject({ app: 'fateboard' });
    });

    it('nothing is written after a first-visit read when nothing changed', async () => {
        unmount();
        mount();
        await state().restoreFromStorage();
        state().initPages();
        await settle();
        expect(await backend.get('project')).toBeUndefined();
    });

    it('a failed autosave is shown once per failure, with "Save a copy" (BUG-162)', async () => {
        const confirmDialog = vi.fn(async () => true);
        const saveBoard = vi.fn();
        useStore.setState({ confirmDialog, saveBoard } as any);
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const realSet = backend.set;
        const fail = () => Promise.reject(new Error('quota'));

        backend.set = fail;
        canvas.add({ type: 'rect', id: 'a' });
        await settle();
        canvas.add({ type: 'rect', id: 'b' });
        await settle();
        expect(confirmDialog).toHaveBeenCalledTimes(1); // not once per autosave
        expect(saveBoard).toHaveBeenCalledTimes(1); // the user chose "Save a copy"

        backend.set = realSet; // saving works again...
        canvas.add({ type: 'rect', id: 'c' });
        await settle();
        backend.set = fail; // ...and fails again: the user is told again
        canvas.add({ type: 'rect', id: 'd' });
        await settle();
        expect(confirmDialog).toHaveBeenCalledTimes(2);

        backend.set = realSet;
        useStore.setState({
            confirmDialog: prev.confirmDialog,
            saveBoard: prev.saveBoard,
        } as any);
        vi.restoreAllMocks();
    });
});
