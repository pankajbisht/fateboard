import { test, expect } from '@playwright/test';

// Phones (owner decision 2026-11-07): the editor is desktop-only and says so; the landing page works.
test.use({ viewport: { width: 390, height: 844 } }); // isMobile is Chromium-only; the width is what matters

test('the editor explains it is desktop-only; Continue anyway opens it', async ({ page }) => {
    await page.goto('/draw');
    const notice = page.getByRole('dialog', { name: /larger screen/i });
    await expect(notice).toBeVisible();
    await notice.getByRole('button', { name: 'Continue anyway' }).click();
    await expect(notice).toBeHidden();
    await page.reload();
    await expect(page.getByRole('dialog', { name: /larger screen/i })).toHaveCount(0); // this session
});

test('the landing page has no notice and no horizontal scroll on a phone', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
});
