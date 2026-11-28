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

// upright phones: one tool bar under the board; panels, colors and zoom fold behind "More"
test('the phone editor gives the board most of the screen; "More" unfolds the rest', async ({
    page,
}) => {
    await page.goto('/draw');
    await expect(page.locator('canvas.upper-canvas')).toBeVisible();
    const docks = page.getByRole('toolbar', { name: 'Dock panels' });
    await expect(docks).toBeHidden();
    await expect(page.getByTestId('footer-view')).toBeHidden();
    await expect(page.getByTestId('property-bar')).toBeVisible(); // kept with nothing selected: no board resize
    const board = (await page
        .getByRole('region', { name: 'Editor canvas workspace' })
        .boundingBox())!;
    expect(board.height).toBeGreaterThan(844 * 0.7);

    const more = page.getByRole('button', { name: 'More: panels, colors and zoom' });
    await more.click();
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(docks).toBeVisible();
    await expect(page.getByTestId('footer-view')).toBeVisible();
    await more.click();
    await expect(docks).toBeHidden();
});
