import { test, expect, type Editor } from './fixtures';

const count = async (editor: Editor) => (await editor.objects()).length;
const undoKey = (editor: Editor) => editor.page.keyboard.press('ControlOrMeta+z');
const redoKey = (editor: Editor) => editor.page.keyboard.press('ControlOrMeta+Shift+z');
const settle = (editor: Editor) => editor.page.waitForTimeout(350); // history is debounced

test.describe('undo / redo', () => {
    test('add a shape: ⌘Z removes it, ⌘⇧Z brings it back; the top bar buttons follow', async ({
        editor,
        page,
    }) => {
        const undo = page.getByRole('button', { name: 'Undo' }).first();
        const redo = page.getByRole('button', { name: 'Redo' }).first();
        await expect(undo).toBeDisabled();

        await editor.addShape('Rectangle');
        await settle(editor);
        await expect(undo).toBeEnabled();

        await undoKey(editor);
        await expect.poll(() => count(editor)).toBe(0);
        await expect(redo).toBeEnabled();

        await redoKey(editor);
        await expect.poll(() => count(editor)).toBe(1);

        await undo.click();
        await expect.poll(() => count(editor)).toBe(0);
        await redo.click();
        await expect.poll(() => count(editor)).toBe(1);
    });

    test('a typed size can be undone right after Enter (focus still in the field)', async ({
        editor,
        page,
    }) => {
        await editor.addShape('Rectangle');
        await settle(editor);
        const width = page.getByRole('spinbutton', { name: 'Width' }).first();
        const before = (await editor.objects())[0]!.width;
        await width.fill('300');
        await width.press('Enter');
        await expect.poll(async () => (await editor.objects())[0]!.width).toBe(300);
        await settle(editor);

        await page.keyboard.press('ControlOrMeta+z'); // focus is still in Width
        await expect.poll(async () => (await editor.objects())[0]!.width).toBe(before);
    });

    test('text: undo while typing ends the typing and takes it back; once more removes the box', async ({
        editor,
        page,
    }) => {
        await editor.openPanel('Text'); // the rail's Text click adds a text box of its own
        await settle(editor);
        const before = await count(editor);
        await page.getByRole('button', { name: /Add body text/ }).click();
        await settle(editor);
        const original = (await editor.objects()).at(-1)!.text;
        await page.keyboard.press('ControlOrMeta+a');
        await page.keyboard.type('Hello world');
        await expect.poll(async () => (await editor.objects()).at(-1)!.text).toBe('Hello world');

        await undoKey(editor);
        await expect.poll(async () => (await editor.objects()).at(-1)?.text).toBe(original);
        await undoKey(editor);
        await expect.poll(() => count(editor)).toBe(before);
    });

    test('each page has its own history: undo never brings another page in', async ({
        editor,
        page,
    }) => {
        await editor.addShape('Rectangle');
        await settle(editor);
        await editor.openPanel('Pages');
        await page.getByRole('button', { name: 'Add page' }).click();
        await expect.poll(() => count(editor)).toBe(0);
        await editor.addShape('Circle');
        await settle(editor);

        await undoKey(editor); // page 2: circle gone
        await expect.poll(() => count(editor)).toBe(0);
        await undoKey(editor); // nothing more on page 2 (used to load page 1 here)
        await page.waitForTimeout(400);
        expect(await count(editor)).toBe(0);

        await editor.openPanel('Pages');
        await page.getByRole('button', { name: /Previous page/ }).click();
        await expect.poll(() => count(editor)).toBe(1);
        await undoKey(editor); // page 1 history still there
        await expect.poll(() => count(editor)).toBe(0);
    });
});
