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
    describe('a page that cannot be loaded (BUG-154)', () => {
        /** Like Fabric: an object of an unknown type rejects the load and leaves the canvas as it was. */
        const failOn = (canvas: ReturnType<typeof createFakeCanvas>, type: string) => {
            const load = canvas.loadFromJSON;
            canvas.loadFromJSON = async (json) => {
                const objects = (json as { objects?: { type?: string }[] })?.objects ?? [];
                if (objects.some((o) => o.type === type))
                    throw new Error(`No class registered for ${type}`);
                return load(json);
            };
        };
        const broken = { objects: [{ type: 'nope', id: 'x' }] };

        it('switchPage stays on the current page and keeps both pages as they were', async () => {
            const { canvas, h } = setup();
            failOn(canvas, 'nope');
            const first = h.get().currentPageId;
            const second = await h.get().addPage();
            await h.get().switchPage(first);
            h.set({
                pages: h
                    .get()
                    .pages.map((p: { id: string }) =>
                        p.id === second ? { ...p, canvasJSON: broken } : p,
                    ),
            });

            await h.get().switchPage(second);

            expect(h.get().currentPageId).toBe(first);
            expect(h.get().isPageSwitching).toBe(false);
            expect(ids(canvas)).toEqual(['r1']);
            const saved = h.get().captureProject().pages;
            expect(saved[0].canvasJSON.objects.map((o: { id: string }) => o.id)).toEqual(['r1']);
            expect(saved[1].canvasJSON).toEqual(broken);
        });

        it('importProject opens the first page that loads and keeps the broken one untouched', async () => {
            const { canvas, h } = setup();
            failOn(canvas, 'nope');
            const ok = await h.get().importProject({
                currentPageId: 'bad',
                pages: [
                    { id: 'bad', name: 'Bad', canvasJSON: broken },
                    {
                        id: 'good',
                        name: 'Good',
                        canvasJSON: { objects: [{ type: 'rect', id: 'g' }] },
                    },
                ],
            });
            expect(ok).toBe(true);
            expect(h.get().currentPageId).toBe('good');
            expect(ids(canvas)).toEqual(['g']);
            expect(h.get().captureProject().pages[0].canvasJSON).toEqual(broken);
        });

        it('importProject fails and keeps the open project when no page loads', async () => {
            const { canvas, h } = setup();
            failOn(canvas, 'nope');
            const before = h.get().pages;
            const ok = await h
                .get()
                .importProject({ pages: [{ id: 'bad', name: 'Bad', canvasJSON: broken }] });
            expect(ok).toBe(false);
            expect(h.get().pages).toBe(before);
            expect(h.get().currentPageId).toBe(before[0].id);
            expect(ids(canvas)).toEqual(['r1']);
        });
    });

    describe('values from a project file are checked (BUG-157)', () => {
        const open = async (page: Record<string, unknown>) => {
            const { h } = setup([]);
            await h
                .get()
                .importProject({ pages: [{ id: 'p', canvasJSON: { objects: [] }, ...page }] });
            return h.get().pages[0];
        };

        it('a thumbnail must be an embedded image, never a remote address', async () => {
            const { h } = setup([]);
            await h.get().importProject({
                pages: [
                    { id: 'shown', canvasJSON: { objects: [] } },
                    { id: 'remote', thumbnail: 'https://tracker.test/pixel.png' },
                    { id: 'embedded', thumbnail: 'data:image/png;base64,AAAA' },
                ],
            });
            const [, remote, embedded] = h.get().pages;
            expect(remote.thumbnail).toBeUndefined();
            expect(embedded.thumbnail).toBe('data:image/png;base64,AAAA');
        });

        it('a page size outside the editor limits is dropped', async () => {
            const preset = { id: 'x', label: 'x', category: 'Custom', width: 9e9, height: 100 };
            expect((await open({ preset })).preset).toBeUndefined();
            const custom = await open({ customSize: { w: 9e9, h: 100 } });
            expect(custom.customSize).toBeNull();
        });
    });
});
