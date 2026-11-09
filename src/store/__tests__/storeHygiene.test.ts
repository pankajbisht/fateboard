/**
 * BUG-034: selecting is not an edit: no undo step and no full-canvas serialisation per selection.
 * BUG-035: page operations are queued per store (no module-level queue); rename / move during a
 *          page switch are not lost.
 * BUG-138: hiding the tab flushes the pending autosave at once.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fabric from 'fabric';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { tick } from '@/test/sliceHarness';
import { createMemoryBackend, projectStorage } from '@/lib/storage/projectStorage';

let canvas: any;
let prev: any;
let backend: ReturnType<typeof createMemoryBackend>;
const state = () => useStore.getState() as any;

beforeEach(() => {
    prev = { ...useStore.getState() };
    backend = createMemoryBackend();
    projectStorage.useBackend(backend);
    canvas = createFakeCanvas();
    canvas.setCursor = () => undefined;
    useStore.setState({ canvas, pages: [], currentPageId: null } as any);
    state().registerCanvasEvents(canvas);
    state().initHistory();
    state().initPages();
});
afterEach(() => {
    state().unregisterCanvasEvents(canvas);
    state().clearHistory();
    useStore.setState({ canvas: prev.canvas, pages: prev.pages, currentPageId: null } as any);
});

describe('store hygiene', () => {
    it('BUG-034: selecting and deselecting never record an undo step', async () => {
        const r = new fabric.Rect({ left: 0, top: 0, width: 10, height: 10 } as any);
        canvas.add(r);
        await tick(400); // let the add's history step and autosave (300 ms) finish first
        const before = state().undoStack.length;
        const serialize = vi.spyOn(canvas, 'toObject');
        for (let i = 0; i < 3; i++) {
            canvas.setActiveObject(r);
            canvas.fire('selection:created', { selected: [r] });
            canvas.discardActiveObject();
            canvas.fire('selection:cleared', {});
        }
        await tick(200);
        expect(state().undoStack.length).toBe(before);
        expect(serialize).not.toHaveBeenCalled(); // no full-canvas serialisation per selection
    });

    it('BUG-035: page operations are queued per store, not in a module-level queue', async () => {
        const { createPagesSlice } = await import('@/store/slices/createPagesSlice');
        const { createPageSlice } = await import('@/store/slices/createPageSlice');
        const { createHarness } = await import('@/test/sliceHarness');
        const make = () => {
            const c: any = createFakeCanvas([{ type: 'rect', id: 'r' }]);
            const h = createHarness([createPageSlice as never, createPagesSlice as never], {
                canvas: c,
                cw: 800,
                ch: 600,
            });
            h.get().initPages();
            return { c, h };
        };
        const a = make();
        const b = make();
        a.c.loadFromJSON = () => new Promise(() => undefined); // store A's switch never finishes
        void a.h.get().addPage();
        await tick(0);
        const done = await Promise.race([
            b.h
                .get()
                .addPage()
                .then(() => 'done'),
            tick(200).then(() => 'blocked'),
        ]);
        expect(done).toBe('done');
    });

    it('BUG-138: hiding the tab saves the pending change immediately', async () => {
        canvas.add({ type: 'rect', id: 'late' });
        const spy = vi.spyOn(backend, 'set');
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
        document.dispatchEvent(new Event('visibilitychange'));
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            value: 'visible',
        });
        expect(spy).toHaveBeenCalled(); // no 300 ms wait
    });
});
