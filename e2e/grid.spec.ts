import { test, expect } from './fixtures';

/** Ink on the (white) page: pixels of the drawn canvas that are not white. */
const inkedPixels = (page: import('@playwright/test').Page) =>
    page.evaluate(() => {
        const el = document.querySelector<HTMLCanvasElement>('canvas.lower-canvas')!;
        const { data } = el.getContext('2d')!.getImageData(0, 0, el.width, el.height);
        let n = 0;
        for (let i = 0; i < data.length; i += 4) if (data[i] < 250 && data[i + 3] > 0) n++;
        return n;
    });

test('grid options: pick a style and size; the choice is drawn and kept after a reload', async ({
    editor,
    page,
}) => {
    const blank = await inkedPixels(page);

    await page.getByRole('button', { name: 'Grid options' }).click();
    const menu = page.getByRole('dialog', { name: 'Grid options' });
    await expect(menu.getByRole('group', { name: 'Grid style' }).getByRole('button')).toHaveCount(
        7,
    );

    await menu.getByRole('button', { name: 'Isometric' }).click();
    await expect(menu.getByRole('button', { name: 'Isometric' })).toHaveAttribute(
        'aria-pressed',
        'true',
    );
    expect(await editor.state('gridEnabled')).toBe(true); // picking a style shows the grid
    await expect(page.getByRole('button', { name: 'Hide grid' })).toBeVisible();
    await expect.poll(() => inkedPixels(page)).toBeGreaterThan(blank + 1000);

    await menu.getByRole('slider').fill('32');
    expect(await editor.state('gridSize')).toBe(32);

    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);

    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    expect(await editor.state('gridStyle')).toBe('isometric');
    expect(await editor.state('gridSize')).toBe(32);
});
