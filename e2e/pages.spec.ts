import { test, expect } from './fixtures';

test.describe('pages', () => {
    test('add a page and move between pages', async ({ editor, page }) => {
        await editor.openPanel('Pages');
        await expect(page.getByText('1 of 1')).toBeVisible();
        await page.getByRole('button', { name: 'Add page' }).click();
        await expect(page.getByText('2 of 2')).toBeVisible();
        await page.getByRole('button', { name: /Previous page/ }).click();
        await expect(page.getByText('1 of 2')).toBeVisible();
    });

    test('each page keeps its own objects', async ({ editor, page }) => {
        await editor.addShape('Rectangle');
        await editor.openPanel('Pages');
        await page.getByRole('button', { name: 'Add page' }).click();
        await expect.poll(async () => (await editor.objects()).length).toBe(0);
        await page.getByRole('button', { name: /Previous page/ }).click();
        await expect.poll(async () => (await editor.objects()).length).toBe(1);
    });

    test('Clear page asks first, then empties the page', async ({ editor, page }) => {
        await editor.addShape('Rectangle');
        await editor.openPanel('Pages');
        await page.getByRole('button', { name: 'Clear page' }).click();
        await page.getByRole('button', { name: 'Clear page' }).last().click(); // dialog confirm
        await expect.poll(async () => (await editor.objects()).length).toBe(0);
    });
});
