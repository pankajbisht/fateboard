import { test, expect } from './fixtures';

test.describe('colour palette (right dock)', () => {
    test('a strip swatch paints the selection and is ringed as current', async ({
        editor,
        page,
    }) => {
        await editor.addShape('Rectangle');
        const swatch = page
            .getByRole('group', { name: 'Color palette' })
            .getByRole('button', { name: /^Blue 500 · #/ });
        await swatch.click();
        await expect.poll(async () => (await editor.objects())[0].fill).toBe('#2b7fff');
        await expect(swatch).toHaveAttribute('aria-pressed', 'true');
    });

    test('All colors grid: pick a shade; Escape closes', async ({ editor, page }) => {
        await editor.addShape('Rectangle');
        await page.getByRole('button', { name: 'All colors' }).click();
        const grid = page.getByRole('dialog', { name: 'All colors' });
        await grid.getByRole('button', { name: /^Red 300 · #/ }).click();
        await expect.poll(async () => (await editor.objects())[0].fill).toBe('#ffa2a2');
        await page.keyboard.press('Escape');
        await expect(grid).toBeHidden();
    });

    test('custom picker: typed hex applies live; Recent gets it on close', async ({
        editor,
        page,
    }) => {
        await editor.addShape('Rectangle');
        await page.getByRole('button', { name: 'Custom color' }).click();
        const hex = page.getByRole('textbox', { name: 'Hex' });
        await hex.fill('0a60d6');
        await hex.press('Enter');
        await expect.poll(async () => (await editor.objects())[0].fill).toBe('#0a60d6');
        await page.keyboard.press('Escape');
        await expect(page.getByRole('button', { name: 'Use recent color #0a60d6' })).toBeVisible();
    });
    test('custom picker: CMYK fields and a harmony swatch paint the selection', async ({
        editor,
        page,
    }) => {
        await editor.addShape('Rectangle');
        await page.getByRole('button', { name: 'Custom color' }).click();
        const dialog = page.getByRole('dialog', { name: 'Custom color' });
        const hex = dialog.getByRole('textbox', { name: 'Hex' });
        await hex.fill('ff0000');
        await hex.press('Enter');

        await dialog.getByRole('radio', { name: 'CMYK' }).click();
        await expect(
            dialog.getByRole('button', { name: 'Copy cmyk(0%, 100%, 100%, 0%)' }),
        ).toBeVisible();
        const black = dialog.getByRole('spinbutton', { name: 'Black' });
        await black.fill('50');
        await black.press('Enter');
        await expect.poll(async () => (await editor.objects())[0].fill).toBe('#800000');

        await dialog.getByRole('button', { name: 'Complementary color #008080' }).click();
        await expect.poll(async () => (await editor.objects())[0].fill).toBe('#008080');
    });
    test('Fill & Shadow color harmony: a swatch fills, Gradient makes a gradient', async ({
        editor,
        page,
    }) => {
        await editor.addShape('Rectangle');
        await page.getByRole('button', { name: 'Custom color' }).click();
        const hex = page.getByRole('dialog', { name: 'Custom color' }).getByRole('textbox', {
            name: 'Hex',
        });
        await hex.fill('ff0000');
        await hex.press('Enter');
        await page.keyboard.press('Escape');

        await editor.openDockTab('Fill & Shadow');
        const harmony = page.getByRole('group', { name: 'Color harmony' });
        await harmony.getByRole('button', { name: 'Triadic color #00ff00' }).click();
        await expect.poll(async () => (await editor.objects())[0].fill).toBe('#00ff00');

        await harmony.getByRole('button', { name: 'Gradient from Complementary' }).click();
        // the bridge reports gradients as 'gradient'; the stops are checked in FillShadowPanel.test
        await expect.poll(async () => (await editor.objects())[0].fill).toBe('gradient');
    });
});
