import { test, expect } from '@playwright/test';

// Phones: the full editor runs on every screen (owner decision 2026-11-14, BUG-215; the 2026-11-07
// "desktop-only" notice is gone). Layout checks per screen size: e2e/responsive.spec.ts.
test.use({ viewport: { width: 390, height: 844 } }); // isMobile is Chromium-only; the width is what matters

test('the editor opens on a phone with no "larger screen" notice', async ({ page }) => {
    await page.goto('/draw');
    await expect(page.locator('canvas.upper-canvas')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
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
