/** Brush rail item (visual picker + Calligraphy pen) and the Pen's Path shape (Inkscape Triangle / Ellipse). */
import { test, expect, type Editor } from './fixtures';

const count = async (editor: Editor) => (await editor.objects()).length;

const rail = (editor: Editor) =>
    editor.page.getByRole('navigation', { name: 'Editor tools and panels' });

test('Pen Path shape: Triangle out turns an open path into one filled outline', async ({
    editor,
    page,
}) => {
    const box = await editor.settledCanvasBox();
    await page.keyboard.press('p');
    await page.getByRole('button', { name: 'Path shape' }).click();
    await page.getByRole('radio', { name: 'Triangle out' }).click();
    await page.keyboard.press('Escape'); // closes the popover, the Pen stays

    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.5);
    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.5);
    await page.keyboard.press('Enter');

    await expect.poll(() => count(editor)).toBe(1);
    const [path] = await editor.objects();
    expect(path.type).toBe('path');
    expect(path.strokeWidth).toBe(0);
    expect(path.fill).toBeTruthy();
    expect(path.height).toBeGreaterThan(8); // thick at the start, not a hairline
});

test('Brush: the picker paints with the Calligraphy pen; its options show in the top bar', async ({
    editor,
    page,
}) => {
    await rail(editor).getByRole('button', { name: 'Brush', exact: true }).click();
    await page.getByRole('radio', { name: 'Calligraphy pen' }).click();
    await expect.poll(() => editor.state<string>('activeTool')).toBe('draw');
    await expect.poll(() => editor.state<string>('brush')).toBe('nib');
    await expect(page.getByRole('slider', { name: 'Calligraphy fixation' })).toBeVisible();

    const box = await editor.settledCanvasBox();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.4);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 12 });
    await page.mouse.up();

    await expect.poll(() => count(editor)).toBe(1);
    const [stroke] = await editor.objects();
    expect(stroke.type).toBe('path');
    expect(stroke.strokeWidth).toBe(0); // a filled nib shape, not a stroked line
});

test('B switches to painting; Templates and Font Templates live in the right dock', async ({
    editor,
    page,
}) => {
    await page.locator('canvas.upper-canvas').focus();
    await page.keyboard.press('b');
    await expect.poll(() => editor.state<string>('activeTool')).toBe('draw');

    await expect(rail(editor).getByRole('button', { name: 'Templates', exact: true })).toHaveCount(
        0,
    );
    await editor.openDockTab('Font Templates');
    await editor.openDockTab('Templates');
    await expect(page.getByRole('button', { name: /^Preview / }).first()).toBeVisible();
});
