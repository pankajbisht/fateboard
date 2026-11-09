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
        await page.getByRole('button', { name: 'Enter a hex color' }).click();
        const hex = page.getByRole('textbox', { name: 'Hex' });
        await expect(hex).toBeFocused();
        await hex.fill('0a60d6');
        await hex.press('Enter');
        await expect.poll(async () => (await editor.objects())[0].fill).toBe('#0a60d6');
        await page.keyboard.press('Escape');
        await expect(page.getByRole('button', { name: 'Use recent color #0a60d6' })).toBeVisible();
    });
});
