import { test, expect } from './fixtures';

test('the board is autosaved: objects survive a reload', async ({ editor, page }) => {
    await editor.addShape('Rectangle');
    await editor.addShape('Circle');
    await page.waitForTimeout(1500); // autosave debounce
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect
        .poll(async () => (await editor.objects()).map((o) => o.type).sort())
        .toEqual(['circle', 'rect']);
});

test('all pages and the open page survive a reload (BUG-004)', async ({ editor, page }) => {
    await editor.addShape('Rectangle');
    await editor.openPanel('Pages');
    await page.getByRole('button', { name: 'Add page' }).click();
    await editor.addShape('Circle');
    await page.waitForTimeout(1500); // autosave debounce
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect
        .poll(() => page.evaluate(() => (window.__fateboard!.state('pages') as unknown[]).length))
        .toBe(2);
    // the page that was open (Page 2, the circle) is shown again
    await expect.poll(async () => (await editor.objects()).map((o) => o.type)).toEqual(['circle']);
    await editor.openPanel('Pages');
    await page.getByRole('button', { name: /Previous page/ }).click();
    await expect.poll(async () => (await editor.objects()).map((o) => o.type)).toEqual(['rect']);
});

// BUG-121: an imported photo used to be saved as a dead blob: URL and was lost on reload
test('an imported photo survives a reload', async ({ editor, page }) => {
    const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'base64',
    );
    const [chooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: 'Open Board' }).first().click(),
    ]);
    await chooser.setFiles({ name: 'dot.png', mimeType: 'image/png', buffer: png });
    await expect.poll(async () => (await editor.objects()).map((o) => o.type)).toEqual(['image']);

    await page.waitForTimeout(1500); // autosave debounce
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect.poll(async () => (await editor.objects()).map((o) => o.type)).toEqual(['image']);
    const src = await page.evaluate(() =>
        (window.__fateboard!.state('canvas') as any).getObjects()[0].getSrc().slice(0, 15),
    );
    expect(src).toBe('data:image/png;');
});
