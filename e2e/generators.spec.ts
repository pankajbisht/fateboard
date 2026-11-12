import { test, expect } from './fixtures';

/** Right dock generators: Fractals, Cellular Automata, Macro. */

test('Fractals inserts a selected vector path, and undo removes it', async ({ editor, page }) => {
    await editor.openDockTab('Fractals');
    await page.getByRole('button', { name: 'Insert fractal' }).click();
    await expect.poll(async () => (await editor.objects()).map((o) => o.type)).toEqual(['path']);
    expect(await editor.selection()).toHaveLength(1);

    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(async () => (await editor.objects()).length).toBe(0);
});

test('Cellular Automata inserts one filled path', async ({ editor, page }) => {
    await editor.openDockTab('Cellular Automata');
    await page.getByRole('radio', { name: 'Game of Life' }).click();
    await page.getByRole('button', { name: 'Insert pattern' }).click();
    await expect.poll(async () => (await editor.objects()).length).toBe(1);
    const [cells] = await editor.objects();
    expect(cells.type).toBe('path');
    expect(cells.fill).toBeTruthy();
});

test('Macro records a shortcut and replays it N times', async ({ editor, page }) => {
    await editor.addShape('Rectangle');
    await editor.openDockTab('Macro');

    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.locator('canvas.upper-canvas').focus();
    await page.keyboard.press('ControlOrMeta+d');
    await expect.poll(async () => (await editor.objects()).length).toBe(2);
    await page.getByRole('button', { name: 'Stop recording' }).click();
    await expect(page.getByRole('list', { name: 'Macro steps' }).getByRole('listitem')).toHaveText([
        /Duplicate/,
    ]);

    await page.getByRole('slider', { name: /Repeat/ }).fill('3');
    await page.getByRole('button', { name: 'Play macro' }).click();
    await expect.poll(async () => (await editor.objects()).length).toBe(5);
});
