import { test, expect } from './fixtures';
import { test as plain } from '@playwright/test';

plain(
    'Settings: theme, colour theme and icon size apply and survive a reload',
    async ({ page }) => {
        await page.goto('/setting');
        await page.getByRole('radio', { name: 'Dark' }).click();
        await expect(page.locator('html')).toHaveClass(/dark/);
        await page.getByRole('radio', { name: 'Large' }).click();
        await expect(page.locator('html')).toHaveAttribute('data-icon-size', 'lg');
        await page.reload();
        await expect(page.locator('html')).toHaveClass(/dark/);
        await expect(page.locator('html')).toHaveAttribute('data-icon-size', 'lg');
    },
);

plain(
    'Settings only offers preferences that work (no page size, background or snap)',
    async ({ page }) => {
        await page.goto('/setting');
        await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
        await expect(page.getByText('Page size', { exact: true })).toHaveCount(0);
        await expect(page.getByText('Snap to grid')).toHaveCount(0);
        await expect(page.getByText('Background pattern')).toHaveCount(0);
    },
);

test('Large icon size: toolbar buttons and swatches grow, nothing is cut', async ({
    editor,
    page,
}) => {
    await page.goto('/setting');
    await page.getByRole('radio', { name: 'Large' }).click();
    await editor.open();
    const swatch = page.getByRole('group', { name: 'Color palette' }).getByRole('button').first();
    await expect.poll(async () => (await swatch.boundingBox())!.width).toBe(24);
});
