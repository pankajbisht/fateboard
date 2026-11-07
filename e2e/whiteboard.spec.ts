import { test, expect } from './fixtures';

// BUG-107: with the grid on, the whiteboard draws ONE grid (the notebook grid that follows zoom and
// snap), not also a CSS dot grid with a different spacing.
test('whiteboard grid: one renderer only', async ({ editor, page }) => {
    await page.goto('/setting');
    await page.getByRole('switch', { name: /Freehand/i }).click();
    await page.goto('/draw');
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect
        .poll(() => page.evaluate(() => window.__fateboard!.state('boardMode')))
        .toBe('whiteboard');

    await page.getByRole('button', { name: /Show grid/ }).click();
    await expect
        .poll(() => page.evaluate(() => window.__fateboard!.state('gridEnabled')))
        .toBe(true);
    await expect(page.locator('[data-testid="whiteboard-grid"]')).toHaveCount(0);
    void editor;
});
