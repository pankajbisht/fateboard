import { test, expect, type Editor } from './fixtures';

/*
 * Header arrange tools (2026-11-12 audit): Align / Group / Lock follow the selection, and locking a
 * multi-selection really holds (BUG-188: dragging the selection box moved the locked objects).
 */
const header = (editor: Editor, name: string) =>
    editor.page.getByRole('button', { name, exact: true }).first();

async function selectAll(editor: Editor) {
    const box = await editor.settledCanvasBox();
    const { page } = editor;
    await page.mouse.move(box.x + 4, box.y + 4);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 4, box.y + box.height - 4, { steps: 8 });
    await page.mouse.up();
}

const lefts = (editor: Editor) =>
    editor.page.evaluate(() => [0, 1].map((i) => Math.round(window.__fateboard!.bounds(i).left)));

test.describe('header arrange tools', () => {
    test('buttons follow the selection; a locked multi-selection cannot be dragged', async ({
        editor,
        page,
    }) => {
        await editor.addShape('Rectangle');
        await editor.addShape('Circle');
        await editor.clickEmptyCanvas();
        await expect(header(editor, 'Group')).toBeDisabled();
        await expect(header(editor, 'Lock')).toBeDisabled();
        await expect(header(editor, 'Distribute Horizontally')).toBeDisabled();

        await selectAll(editor);
        await expect.poll(async () => (await editor.selection()).length).toBe(2);
        await expect(header(editor, 'Group')).toBeEnabled();
        await expect(header(editor, 'Ungroup')).toBeDisabled();
        await expect(header(editor, 'Align Left')).toBeEnabled();

        await header(editor, 'Lock').click();
        await expect(header(editor, 'Unlock')).toBeEnabled();
        await expect(header(editor, 'Align Left')).toBeDisabled();

        // drag the (locked) selection: nothing moves
        const before = await lefts(editor);
        const box = await editor.settledCanvasBox();
        const b = await page.evaluate(() => window.__fateboard!.bounds(1));
        const k = box.width / b.canvasWidth;
        const x = box.x + (b.left + b.width / 2) * k;
        const y = box.y + (b.top + b.height / 2) * k;
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + 80, y + 40, { steps: 8 });
        await page.mouse.up();
        expect(await lefts(editor)).toEqual(before);

        // arrow keys do not nudge it either
        await page.keyboard.press('ArrowRight');
        expect(await lefts(editor)).toEqual(before);

        await header(editor, 'Unlock').click();
        await expect(header(editor, 'Lock')).toBeEnabled();
    });
});
