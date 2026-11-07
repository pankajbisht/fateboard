import { test, expect } from './fixtures';

test('a new board is a clean white 1920 × 1080 page; grid and snap start off and can be turned on', async ({
    editor,
    page,
}) => {
    await expect(editor.footerView.getByText('1920 × 1080 px')).toBeVisible();

    const artboard = editor.canvas.locator('xpath=ancestor::div[contains(@class,"border")][1]');
    await expect(artboard).toHaveCSS('background-color', 'rgb(255, 255, 255)');

    expect(await page.evaluate(() => window.__fateboard!.state('gridEnabled'))).toBe(false);
    expect(await page.evaluate(() => window.__fateboard!.state('snapEnabled'))).toBe(false);

    await page.getByRole('button', { name: 'Show grid' }).click();
    await expect(page.getByRole('button', { name: 'Hide grid' })).toBeVisible();
    await page.getByRole('button', { name: 'Snap: off' }).click();
    await expect(page.getByRole('button', { name: /^Snap: on/ })).toBeVisible();
});
