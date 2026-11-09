/** Keys that act on the board: select all, arrow-key nudge, hold Space to pan. */
import { test, expect } from './fixtures';

const left = (editor: { page: import('@playwright/test').Page }, index = 0) =>
    editor.page.evaluate((i) => window.__fateboard!.bounds(i), index);

test('select all takes everything on the board', async ({ editor, page }) => {
    await editor.addShape('Rectangle');
    await editor.addShape('Circle');
    await editor.clickEmptyCanvas();
    await expect.poll(async () => (await editor.selection()).length).toBe(0);

    await page.keyboard.press('ControlOrMeta+a');

    await expect.poll(async () => (await editor.selection()).length).toBe(2);
});

test('arrow keys nudge the selection, and one undo takes a run back', async ({ editor, page }) => {
    await editor.addShape('Rectangle');
    await page.waitForTimeout(400); // adding the shape is its own history step
    const start = await left(editor);

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await left(editor)).left).toBeCloseTo(start.left + 2, 0);

    await page.keyboard.press('Shift+ArrowDown');
    await expect.poll(async () => (await left(editor)).top).toBeCloseTo(start.top + 10, 0);

    await page.waitForTimeout(400); // the history step closes after the run
    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(async () => (await left(editor)).left).toBeCloseTo(start.left, 0);
    await expect.poll(async () => (await left(editor)).top).toBeCloseTo(start.top, 0);
    expect((await editor.objects()).length).toBe(1);
});

test('holding Space drags the view: nothing moves and the selection stays', async ({
    editor,
    page,
}) => {
    await editor.addShape('Rectangle');
    await expect.poll(async () => (await editor.selection()).length).toBe(1);
    const before = await left(editor);
    const box = await editor.settledCanvasBox();
    const k = box.width / before.canvasWidth;
    const x = box.x + (before.left + before.width / 2) * k;
    const y = box.y + (before.top + before.height / 2) * k;

    await page.mouse.move(x, y);
    await page.keyboard.down('Space');
    await page.mouse.down();
    await page.mouse.move(x + 60, y + 40, { steps: 4 });
    await page.mouse.up();
    await page.keyboard.up('Space');

    const after = await left(editor);
    expect(after.left).toBeCloseTo(before.left, 0);
    expect(after.top).toBeCloseTo(before.top, 0);
    await expect.poll(async () => (await editor.selection()).length).toBe(1);
    expect(await editor.state('activeTool')).toBe('select');

    // and the board works normally again
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 30, y, { steps: 3 });
    await page.mouse.up();
    await expect.poll(async () => (await left(editor)).left).toBeGreaterThan(before.left + 5);
});
