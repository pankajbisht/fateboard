import { test, expect } from './fixtures';

test('the Delete key removes the selected shape, like Backspace (BUG-103)', async ({
    editor,
    page,
}) => {
    await editor.addShape('Rectangle');
    await page.keyboard.press('Delete');
    await expect.poll(async () => (await editor.objects()).length).toBe(0);
});

test('⌘B / ⌘I / ⌘U style the selected text (BUG-096)', async ({ editor, page }) => {
    await editor.openPanel('Text');
    await page.getByRole('button', { name: /Add body text/ }).click(); // starts plain
    const last = async () => (await editor.objects()).at(-1)!;
    await page.keyboard.press('ControlOrMeta+b');
    await expect.poll(async () => (await last()).fontWeight).toBe('bold');
    await page.keyboard.press('ControlOrMeta+i');
    await expect.poll(async () => (await last()).fontStyle).toBe('italic');
    await page.keyboard.press('ControlOrMeta+b');
    await expect.poll(async () => String((await last()).fontWeight)).not.toBe('bold');
});
