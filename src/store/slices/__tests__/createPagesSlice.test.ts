import { describe, expect, it } from 'vitest';
import { createPagesSlice } from '../createPagesSlice';
import { createPageSlice } from '../createPageSlice';
import { createHarness } from '@/test/sliceHarness';
import { createFakeCanvas } from '@/test/fakeCanvas';

function setup(objects: Record<string, unknown>[] = [{ type: 'rect', id: 'r1' }]) {
    const canvas = createFakeCanvas(objects);
    const h = createHarness([createPageSlice as never, createPagesSlice as never], {
        canvas,
        cw: 800,
        ch: 600,
        drawBackground: () => undefined,
    });
    h.get().initPages();
    return { canvas, h };
}

const ids = (canvas: ReturnType<typeof createFakeCanvas>) => canvas.getObjects().map((o) => o.id);

describe('createPagesSlice', () => {
    it('initPages adopts the current canvas as Page 1, once', () => {
        const { h } = setup();
        expect(h.get().pages).toHaveLength(1);
        expect(h.get().pages[0].name).toBe('Page 1');
        expect(h.get().pages[0].canvasJSON.objects).toHaveLength(1);
        h.get().initPages();
        expect(h.get().pages).toHaveLength(1);
    });

    it('addPage saves the current page, adds an empty page after it and shows it', async () => {
        const { canvas, h } = setup();
        const id = await h.get().addPage();
        expect(h.get().pages).toHaveLength(2);
        expect(h.get().currentPageId).toBe(id);
        expect(h.get().pages[1].name).toBe('Page 2');
        expect(canvas.getObjects()).toHaveLength(0);
        expect(h.get().isPageSwitching).toBe(false);
    });

    it('switchPage keeps each page’s content', async () => {
        const { canvas, h } = setup();
        const first = h.get().currentPageId;
        await h.get().addPage();
        canvas.add({ type: 'circle', id: 'c1' });
        const second = h.get().currentPageId;

        await h.get().switchPage(first);
        expect(ids(canvas)).toEqual(['r1']);
        await h.get().switchPage(second);
        expect(ids(canvas)).toEqual(['c1']);
    });

    it('duplicatePage deep-copies the content', async () => {
        const { h } = setup();
        const original = h.get().pages[0];
        const copyId = await h.get().duplicatePage(original.id);
        const copy = h.get().pages.find((p: { id: string }) => p.id === copyId);
        expect(copy.name).toBe('Page 1 copy');
        expect(copy.canvasJSON).toEqual(h.get().pages[0].canvasJSON);
        expect(copy.canvasJSON).not.toBe(h.get().pages[0].canvasJSON);
    });

    it('deletePage refuses to delete the last page and shows a neighbour after deleting the current one', async () => {
        const { canvas, h } = setup();
        expect(await h.get().deletePage(h.get().currentPageId)).toBe(false);
        const first = h.get().currentPageId;
        const second = await h.get().addPage();
        expect(await h.get().deletePage(second)).toBe(true);
        expect(h.get().pages).toHaveLength(1);
        expect(h.get().currentPageId).toBe(first);
        expect(ids(canvas)).toEqual(['r1']);
    });

    it('renamePage trims and ignores blank names', () => {
        const { h } = setup();
        const id = h.get().pages[0].id;
        h.get().renamePage(id, '  Cover  ');
        expect(h.get().pages[0].name).toBe('Cover');
        h.get().renamePage(id, '   ');
        expect(h.get().pages[0].name).toBe('Cover');
    });

    it('movePage clamps the target index', async () => {
        const { h } = setup();
        await h.get().addPage();
        const firstId = h.get().pages[0].id;
        h.get().movePage(firstId, 99);
        expect(h.get().pages[1].id).toBe(firstId);
    });

    it('exportProject / importProject round-trip the pages', async () => {
        const { h } = setup();
        await h.get().addPage();
        const json = h.get().exportProject();
        const other = setup([]);
        expect(await other.h.get().importProject(json)).toBe(true);
        expect(other.h.get().pages.map((p: { name: string }) => p.name)).toEqual([
            'Page 1',
            'Page 2',
        ]);
    });

    it('importProject rejects invalid input', async () => {
        const { h } = setup();
        expect(await h.get().importProject('not json')).toBe(false);
        expect(await h.get().importProject('{"pages": []}')).toBe(false);
        expect(h.get().pages).toHaveLength(1);
    });

    it('exportPageAsDataURL returns a data URL', () => {
        const { h } = setup();
        expect(h.get().exportPageAsDataURL()).toMatch(/^data:image\/png/);
    });
});
