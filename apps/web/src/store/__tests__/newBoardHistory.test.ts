/**
 * BUG-156: "New board" starts a new history. The first change on the new board can be undone, and
 * undo never brings back the board that was cleared.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { tick } from '@/test/sliceHarness';
import { createMemoryBackend, projectStorage } from '@/lib/storage';

let canvas: any;
let prev: any;
const state = () => useStore.getState() as any;
const ids = () => canvas.getObjects().map((o: any) => o.id);

beforeEach(() => {
    prev = { ...useStore.getState() };
    projectStorage.useBackend(createMemoryBackend());
    canvas = createFakeCanvas([{ type: 'rect', id: 'old' }]);
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

describe('New board history (BUG-156)', () => {
    it('the first change on a new board can be undone', async () => {
        state().clearBoard();
        await tick(200);
        expect(state().canUndo).toBe(false);

        canvas.add({ type: 'circle', id: 'first' });
        await tick(200);
        expect(state().canUndo).toBe(true);

        await state().undo();
        expect(ids()).toEqual([]);
    });

    it('undo on a new board does not bring the cleared board back', async () => {
        state().clearBoard();
        await tick(200);
        await state().undo();
        expect(ids()).toEqual([]);
    });
});
