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
    const box = (await editor.canvas.boundingBox())!;
    const b = await editor.page.evaluate((n) => window.__fateboard!.bounds(n), i);
    const k = box.width / b.canvasWidth;
    await editor.page.mouse.click(
        box.x + (b.left + b.width / 2) * k,
        box.y + (b.top + b.height / 2) * k,
    );
}

test('each page keeps its size; the canvas is the page; clicks hit the shape under the cursor', async ({
    editor,
    page,
}) => {
    const first = await geometry(editor);
    expect(first.backstore).toEqual(first.page);
    expect(first.vpt).toEqual([1, 0, 0, 1, 0, 0]);

    // page 2 gets a different size
    await editor.openPanel('Pages');
    await page.getByRole('button', { name: 'Add page' }).click();
    await editor.openPanel('Canvas Size');
    await page
        .getByRole('button', { name: /Instagram Post/ })
        .first()
        .click();
    await expect.poll(async () => (await geometry(editor)).page).not.toEqual(first.page);
    const second = await geometry(editor);
    await expect.poll(async () => (await geometry(editor)).backstore).toEqual(second.page);

    // a shape on page 2 can be selected by clicking it (pointer maps to the page)
    await editor.addShape('Rectangle');
    await editor.clickEmptyCanvas();
    await expect.poll(async () => (await editor.selection()).length).toBe(0);
    await clickCentreOf(editor, 0);
    await expect.poll(async () => (await editor.selection()).length).toBe(1);

    // back to page 1: its own size again, still identity viewport
    await editor.openPanel('Pages');
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
