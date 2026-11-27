import { test, expect, type Editor } from './fixtures';

/*
 * BUG-007 / Q2: one geometry owner. Each page keeps its own size (BUG-109), the canvas backstore is
 * always the page size with an identity viewport, and a click lands on the object under the cursor.
 */

const geometry = (editor: Editor) =>
    editor.page.evaluate(() => {
        const c = window.__fateboard!.state('canvas') as {
            getWidth(): number;
            getHeight(): number;
            viewportTransform: number[];
        };
        const p = window.__fateboard!.state('selectedPreset') as { width: number; height: number };
        return {
            backstore: [c.getWidth(), c.getHeight()],
            vpt: [...c.viewportTransform],
            page: [p.width, p.height],
        };
    });

async function clickCentreOf(editor: Editor, i: number) {
    // the page's rectangle on screen: in deep zoom the canvas element is only the visible window (BUG-221)
    const box = (await editor.page.evaluate(() => window.__fateboard!.pageRect()))!;
    const b = await editor.page.evaluate((n) => window.__fateboard!.bounds(n), i);
    const k = box.width / b.canvasWidth;
    await editor.page.mouse.click(
        box.left + (b.left + b.width / 2) * k,
        box.top + (b.top + b.height / 2) * k,
    );
}

test('each page keeps its size; the canvas is the page; clicks hit the shape under the cursor', async ({
    editor,
    page,
}) => {
    const first = await geometry(editor);
    expect(first.backstore).toEqual(first.page);
    expect(first.vpt).toEqual([1, 0, 0, 1, 0, 0]);

    // page 2 gets a different size: Settings > Canvas size resizes the page that was open
    await editor.openDockTab('Pages');
    await page.getByRole('button', { name: 'Add page' }).click();
    await page.waitForTimeout(1500); // autosave: page 2 is the open page
    await page.goto('/setting');
    await page.getByRole('combobox', { name: 'Canvas size' }).click();
    await page.getByRole('option', { name: /Instagram Post/ }).click();
    await editor.open();
    await expect.poll(async () => (await geometry(editor)).page).toEqual([1080, 1080]);
    const second = await geometry(editor);
    await expect.poll(async () => (await geometry(editor)).backstore).toEqual(second.page);

    // a shape on page 2 can be selected by clicking it (pointer maps to the page)
    await editor.addShape('Rectangle');
    await editor.clickEmptyCanvas();
    await expect.poll(async () => (await editor.selection()).length).toBe(0);
    await clickCentreOf(editor, 0);
    await expect.poll(async () => (await editor.selection()).length).toBe(1);

    // back to page 1: its own size again, still identity viewport
    await editor.openDockTab('Pages');
    await page.getByRole('button', { name: /Previous page/ }).click();
    await expect.poll(async () => (await geometry(editor)).page).toEqual(first.page);
    await expect.poll(async () => (await geometry(editor)).backstore).toEqual(first.page);
    expect((await geometry(editor)).vpt).toEqual([1, 0, 0, 1, 0, 0]);

    // and the sizes survive a reload (page 1 open)
    await page.waitForTimeout(1500);
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect.poll(async () => (await geometry(editor)).page).toEqual(first.page);
});

test.describe('retina, zoomed in (BUG-108)', () => {
    test.use({ deviceScaleFactor: 2 });

    test('renders sharper when zoomed in and clicks still hit the shape', async ({
        editor,
        page,
    }) => {
        await editor.addShape('Rectangle');
        const zoomIn = page.getByRole('button', { name: /zoom in/i }).first();
        for (let i = 0; i < 10; i++) await zoomIn.click(); // ~930 %: deep zoom (BUG-221)
        const {
            backstore,
            page: pagePx,
            ratio,
        } = await page.evaluate(() => {
            const el = document.querySelector('canvas.lower-canvas') as HTMLCanvasElement;
            const p = window.__fateboard!.state('selectedPreset') as { width: number };
            const c = window.__fateboard!.state('canvas') as { getRetinaScaling: () => number };
            return { backstore: el.width, page: p.width, ratio: c.getRetinaScaling() };
        });
        // the old fixed retina backstore was exactly 2 × the page (blurry when zoomed in); now the density
        // follows the on-screen scale, and past the buffer limit only the visible part is drawn at it
        expect(ratio).toBeGreaterThan(2 * 1.5);
        expect(backstore).toBeLessThan(pagePx * ratio);

        // zoomed in, the page is bigger than the view: show its top-left corner and click empty page there
        const scroller = page.locator('[data-board-scroll]');
        await scroller.evaluate((el) => el.scrollTo(0, 0));
        await page.waitForTimeout(100); // deep zoom re-places its window on the next frame
        const corner = (await page.evaluate(() => window.__fateboard!.pageRect()))!;
        await page.mouse.click(corner.left + 20, corner.top + 20);
        await expect.poll(async () => (await editor.selection()).length).toBe(0);
        // then the middle of the page, where the shape is
        await scroller.evaluate((el) =>
            el.scrollTo(
                (el.scrollWidth - el.clientWidth) / 2,
                (el.scrollHeight - el.clientHeight) / 2,
            ),
        );
        await page.waitForTimeout(100);
        await clickCentreOf(editor, 0);
        await expect.poll(async () => (await editor.selection()).length).toBe(1);
    });
});
