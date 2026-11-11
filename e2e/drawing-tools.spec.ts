/** Pen (P), Pencil (Shift + P) and Laser pointer (K) with a real mouse and keyboard. */
import { test, expect, type Editor } from './fixtures';

const count = async (editor: Editor) => (await editor.objects()).length;
const tool = (editor: Editor) => editor.state<string>('activeTool');

test('Pen: clicks and a drag make a closed path; it is selected and one undo step', async ({
    editor,
    page,
}) => {
    const box = await editor.settledCanvasBox();
    const at = (fx: number, fy: number) =>
        [box.x + box.width * fx, box.y + box.height * fy] as const;

    await page.keyboard.press('p');
    await expect.poll(() => tool(editor)).toBe('pen');

    await page.mouse.click(...at(0.3, 0.3));
    await page.mouse.click(...at(0.6, 0.3));
    await page.mouse.move(...at(0.6, 0.7));
    await page.mouse.down();
    await page.mouse.move(...at(0.7, 0.7), { steps: 5 }); // a smooth point
    await page.mouse.up();
    await page.mouse.click(...at(0.3, 0.3)); // back on the first point: closed

    await expect.poll(() => count(editor)).toBe(1);
    const [path] = await editor.objects();
    expect(path.type).toBe('path');
    expect(await tool(editor)).toBe('select');
    expect((await editor.selection()).length).toBe(1);

    await page.waitForTimeout(350); // history is debounced
    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(() => count(editor)).toBe(0);
});

test('Pen: Enter finishes an open path; Backspace removes the last point first', async ({
    editor,
    page,
}) => {
    const box = await editor.settledCanvasBox();
    await editor.page
        .getByRole('navigation', { name: 'Editor tools and panels' })
        .getByRole('button', { name: 'Pen', exact: true })
        .click();
    for (const fx of [0.2, 0.4, 0.6])
        await page.mouse.click(box.x + box.width * fx, box.y + box.height / 2);
    await page.keyboard.press('Backspace');
    await expect.poll(() => editor.state<number>('penPointCount')).toBe(2);
    await page.keyboard.press('Enter');
    await expect.poll(() => count(editor)).toBe(1);
});

test('Pencil: Shift + P sketches a line; the Draw brush is left as it was', async ({
    editor,
    page,
}) => {
    const brushBefore = await editor.state<string>('brush');
    await page.keyboard.press('Shift+P');
    await expect.poll(() => tool(editor)).toBe('pencil');

    const box = await editor.settledCanvasBox();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.4, { steps: 12 });
    await page.mouse.up();

    await expect.poll(() => count(editor)).toBe(1);
    expect((await editor.objects())[0].type).toBe('path');
    expect(await editor.state<string>('brush')).toBe(brushBefore);
    expect(await tool(editor)).toBe('pencil'); // keep sketching
});

test('Laser: a red trail that fades; nothing is added to the board', async ({ editor, page }) => {
    await page.keyboard.press('k');
    await expect.poll(() => tool(editor)).toBe('laser');
    const redPixels = () =>
        page.evaluate(() => {
            const el = document.querySelector('canvas.upper-canvas') as HTMLCanvasElement;
            const data = el.getContext('2d')!.getImageData(0, 0, el.width, el.height).data;
            let n = 0;
            for (let i = 0; i < data.length; i += 4)
                if (data[i] > 200 && data[i + 1] < 120 && data[i + 3] > 40) n++;
            return n;
        });

    const box = await editor.settledCanvasBox();
    await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.5, { steps: 15 });
    expect(await redPixels()).toBeGreaterThan(50);
    await page.mouse.up();

    await expect.poll(redPixels, { timeout: 3000 }).toBe(0);
    expect(await count(editor)).toBe(0);
    await expect(page.getByRole('button', { name: 'Undo' }).first()).toBeDisabled();
});
