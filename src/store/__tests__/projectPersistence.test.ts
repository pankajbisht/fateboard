/**
 * BUG-004: autosave keeps the whole project (every page + current page), not only the live canvas.
 * Real store (all slices composed) + fake canvas + in-memory storage backend. A "reload" = a fresh
 * empty canvas and empty pages state, then `restoreFromStorage()` + `initPages()` like `init()`.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import db from 'opendb-store';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { tick } from '@/test/sliceHarness';
import { LEGACY_DRAW_KEY, createMemoryBackend, projectStorage } from '@/lib/storage/projectStorage';

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
});
