/**
 * BUG-101: opening a single-board .fateboard / .json goes through the store (persist lock, autosave,
 * history): the board replaces the page as ONE undo step, and a broken file says so.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@/store';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { tick } from '@/test/sliceHarness';
import { createMemoryBackend, projectStorage } from '@/lib/storage/projectStorage';
import { importFile } from '..';

let canvas: any;
let prev: any;
const state = () => useStore.getState() as any;
const ids = () => canvas.getObjects().map((o: any) => o.id);
const file = (name: string, body: string) => new File([body], name, { type: 'application/json' });

beforeEach(() => {
    prev = { ...useStore.getState() };
    projectStorage.useBackend(createMemoryBackend());
    canvas = createFakeCanvas([{ type: 'rect', id: 'mine' }]);
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
    vi.restoreAllMocks();
});

describe('open a single-board file (BUG-101)', () => {
    it('replaces the page as one undo step and is autosaved', async () => {
        const board = { version: '7.1.0', objects: [{ type: 'circle', id: 'opened' }] };
        await importFile(canvas, file('old.fateboard', JSON.stringify(board)));
        expect(ids()).toEqual(['opened']);
        await tick(400);
        const page = state().captureProject().pages[0];
        expect(page.canvasJSON.objects.map((o: any) => o.id)).toEqual(['opened']);

        await state().undo();
        expect(ids()).toEqual(['mine']);
    });

    it('a broken file shows a dialog and leaves the page alone', async () => {
        const alertDialog = vi.fn(async () => undefined);
        useStore.setState({ alertDialog } as any);
        await importFile(canvas, file('broken.json', '{"objects": "nope"'));
        expect(ids()).toEqual(['mine']);
        expect(alertDialog).toHaveBeenCalled();
        useStore.setState({ alertDialog: prev.alertDialog } as any);
    });
});
