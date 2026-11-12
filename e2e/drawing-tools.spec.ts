/** Pen (P), Pencil (Shift + P) and Laser pointer (K) with a real mouse and keyboard. */
import AxeBuilder from '@axe-core/playwright';
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

test('Pen options: width from the bar; Shift keeps a segment level; clicking an end continues the path', async ({
    editor,
    page,
}) => {
    const box = await editor.settledCanvasBox();
    const at = (fx: number, fy: number) =>
        [box.x + box.width * fx, box.y + box.height * fy] as const;

    await page.keyboard.press('p');
    const bar = page.getByRole('toolbar', { name: 'Pen options' });
    await expect(bar).toBeVisible();
    const width = bar.getByRole('spinbutton', { name: 'Pen stroke width' });
    await width.fill('8');
    await width.press('Enter');
    await expect
        .poll(() => editor.state<{ strokeWidth: number }>('penStyle'))
        .toMatchObject({
            strokeWidth: 8,
        });

    await page.mouse.click(...at(0.3, 0.5));
    await page.keyboard.down('Shift');
    await page.mouse.click(...at(0.6, 0.53)); // slightly off level: Shift snaps it to 0°
    await page.keyboard.up('Shift');
    await expect(bar.getByText('2 points')).toBeVisible();
    await page.keyboard.press('Enter');

    await expect.poll(() => count(editor)).toBe(1);
    const [line] = await editor.objects();
    expect(line.height).toBeLessThan(1);
    const sw = line.strokeWidth;

    // continue it from its end point: still one object, now taller
    await page.keyboard.press('p');
    await page.mouse.click(...at(0.6, 0.5));
    await expect.poll(() => editor.state<number>('penPointCount')).toBe(2);
    await page.mouse.click(...at(0.6, 0.8));
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await editor.objects())[0].height).toBeGreaterThan(10);
    expect(await count(editor)).toBe(1);
    expect((await editor.objects())[0].strokeWidth).toBe(sw);
});

test('Pencil options: size from the bar; Shift draws a straight line', async ({ editor, page }) => {
    const box = await editor.settledCanvasBox();
    const at = (fx: number, fy: number) =>
        [box.x + box.width * fx, box.y + box.height * fy] as const;
    const stroke = async (shift: boolean) => {
        await page.mouse.move(...at(0.2, 0.5));
        if (shift) await page.keyboard.down('Shift');
        await page.mouse.down();
        await page.mouse.move(...at(0.4, 0.3), { steps: 6 });
        await page.mouse.move(...at(0.6, 0.5), { steps: 6 });
        await page.mouse.up();
        if (shift) await page.keyboard.up('Shift');
    };

    await page.keyboard.press('Shift+P');
    const bar = page.getByRole('toolbar', { name: 'Pencil options' });
    await expect(bar).toBeVisible();
    await stroke(false);
    await expect.poll(() => count(editor)).toBe(1);
    const thin = (await editor.objects())[0];
    expect(thin.height).toBeGreaterThan(20); // went up and down

    const size = bar.getByRole('spinbutton', { name: 'Pencil size' });
    await size.fill('10');
    await size.press('Enter');
    await stroke(true);
    await expect.poll(() => count(editor)).toBe(2);
    const thick = (await editor.objects())[1];
    expect(thick.strokeWidth / thin.strokeWidth).toBeCloseTo(5);
    expect(thick.height).toBeLessThan(2); // straight, level line
});

for (const scheme of ['light', 'dark'] as const) {
    test(`Pen / Pencil option bars and the Stroke style popover have no axe violations (${scheme})`, async ({
        editor,
        page,
    }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        if (scheme === 'dark') {
            // the app default is Light (not System): switch the way a user does
            await page.goto('/setting');
            await page.getByRole('radio', { name: 'Dark' }).click();
            await editor.open();
            await expect(page.locator('html')).toHaveClass(/\bdark\b/);
        }
        await editor.settledCanvasBox();
        const scan = async (selector: string) =>
            (
                await new AxeBuilder({ page })
                    .include(selector)
                    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
                    .analyze()
            ).violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`);

        await page.keyboard.press('p');
        await expect(page.getByRole('toolbar', { name: 'Pen options' })).toBeVisible();
        expect(await scan('[role="toolbar"][aria-label="Pen options"]')).toEqual([]);
        await page.getByRole('button', { name: 'Stroke style' }).click();
        expect(await scan('[role="dialog"][aria-label="Stroke style"]')).toEqual([]);
        await page.keyboard.press('Escape');

        await page.keyboard.press('Shift+P');
        await expect(page.getByRole('toolbar', { name: 'Pencil options' })).toBeVisible();
        expect(await scan('[role="toolbar"][aria-label="Pencil options"]')).toEqual([]);
    });
}

test('Pen modes: Curvature clicks make a curve; Freeform turns a drag into a path', async ({
    editor,
    page,
}) => {
    const box = await editor.settledCanvasBox();
    const at = (fx: number, fy: number) =>
        [box.x + box.width * fx, box.y + box.height * fy] as const;
    await page.keyboard.press('p');
    const bar = page.getByRole('toolbar', { name: 'Pen options' });

    await bar.getByRole('radio', { name: 'Curvature' }).click();
    for (const [fx, fy] of [
        [0.2, 0.5],
        [0.35, 0.3],
        [0.5, 0.5],
    ])
        await page.mouse.click(...at(fx, fy));
    await expect(bar.getByText('3 points')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect.poll(() => count(editor)).toBe(1);

    await page.keyboard.press('p');
    await bar.getByRole('radio', { name: 'Freeform' }).click();
    await page.mouse.move(...at(0.2, 0.75));
    await page.mouse.down();
    await page.mouse.move(...at(0.4, 0.7), { steps: 10 });
    await page.mouse.move(...at(0.6, 0.8), { steps: 10 });
    await page.mouse.up();
    await expect.poll(() => count(editor)).toBe(2);
    expect((await editor.objects())[1].type).toBe('path');
    expect(await tool(editor)).toBe('select');
});

test('Pen stroke style: the popover sets dashes; Escape closes it and keeps the Pen', async ({
    editor,
    page,
}) => {
    await editor.settledCanvasBox();
    await page.keyboard.press('p');
    await page.getByRole('button', { name: 'Stroke style' }).click();
    const dialog = page.getByRole('dialog', { name: 'Stroke style' });
    await dialog.getByRole('radio', { name: 'Dashed' }).click();
    await dialog.getByRole('radio', { name: 'End', exact: true }).click();
    const { violations } = await new AxeBuilder({ page })
        .include('[role="dialog"][aria-label="Stroke style"]')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
    expect(violations.map((v) => v.id)).toEqual([]);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    expect(await tool(editor)).toBe('pen');
    await expect
        .poll(() => editor.state<{ dash: string; arrow: string }>('penStyle'))
        .toMatchObject({ dash: 'dashed', arrow: 'end' });
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
