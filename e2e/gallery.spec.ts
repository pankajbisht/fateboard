/** The gallery page (`/gallery`, linked from the landing) and the per-piece tutorials (`/gallery/<id>`). */
import { expect, test, type Page } from '@playwright/test';

const section = (page: Page) => page.getByRole('region', { name: 'Made with Fateboard.' });
const cards = (page: Page) =>
    section(page).getByRole('list', { name: 'Gallery pieces' }).getByRole('listitem');
const board = (page: Page) => page.getByTestId('tutorial-board');

test.beforeEach(async ({ page }) => {
    page.on('pageerror', (error) => {
        throw error;
    });
});

test('the landing loads no gallery artwork; its header link opens /gallery', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const artwork: string[] = [];
    page.on('request', (r) => {
        if (/\/gallery\/[^/]+\.svg$/.test(r.url())) artwork.push(r.url());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(artwork).toEqual([]);

    await page.getByRole('navigation').getByRole('link', { name: 'Gallery' }).click();
    await expect(page).toHaveURL(/\/gallery$/);
    await expect(page).toHaveTitle(/Gallery/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Made with Fateboard.');
    await expect(cards(page)).toHaveCount(18);

    for (const img of await section(page).getByRole('img').all()) {
        await img.scrollIntoViewIfNeeded();
        await expect
            .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth))
            .toBeGreaterThan(0);
    }
});

test('the landing teaser opens the gallery page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Browse the gallery' }).click();
    await expect(page).toHaveURL(/\/gallery$/);
    await expect(cards(page)).toHaveCount(18);
});

test('a card opens its tutorial; the stage builds the piece step by step', async ({ page }) => {
    await page.goto('/gallery');
    await section(page)
        .getByRole('button', { name: /^Manga \d/ })
        .click();
    await expect(cards(page)).toHaveCount(4);
    await page.getByRole('link', { name: 'How to make Ronin at Dusk' }).click();

    await expect(page).toHaveURL(/\/gallery\/manga-ronin$/);
    await expect(page).toHaveTitle(/How to Make Ronin at Dusk/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('How to make Ronin at Dusk');
    await expect(board(page)).toHaveAccessibleName(/step 1 of 8/);

    // step 1 shows only the first group; the katana (step 4) is hidden until its step
    const katana = board(page).locator('#step-4');
    await expect(katana).toHaveCSS('opacity', '0');
    await page.getByRole('button', { name: 'Show step 4 on the board' }).click();
    await expect(board(page)).toHaveAccessibleName(/step 4 of 8: Katana/);
    await expect(katana).toHaveCSS('opacity', '1');

    await page.getByRole('button', { name: /Ghost next steps/ }).click();
    await expect(board(page).locator('#step-8')).toHaveCSS('opacity', '0.12');

    await page.getByRole('link', { name: 'All pieces' }).click();
    await expect(page).toHaveURL(/\/gallery$/);
    await expect(cards(page)).toHaveCount(18);
});

test('the gallery page is a real page: a direct visit is HTTP 200', async ({ page }) => {
    const response = await page.goto('/gallery');
    expect(response?.status()).toBe(200);
    await expect(cards(page)).toHaveCount(18);
});

test('a tutorial page is a real page: direct visit, download, next piece', async ({ page }) => {
    const response = await page.goto('/gallery/flow-signup');
    expect(response?.status()).toBe(200);
    await expect(board(page).locator('svg')).toBeVisible();

    const download = page.getByRole('link', { name: 'Download SVG' });
    await expect(download).toHaveAttribute('href', '/gallery/flow-signup.svg');

    await page
        .getByRole('navigation', { name: 'More pieces' })
        .getByRole('link', { name: /CI\/CD Pipeline/ })
        .click();
    await expect(page).toHaveURL(/\/gallery\/flow-cicd$/);
    await expect(board(page)).toHaveAccessibleName(/CI\/CD Pipeline, step 1 of 5/);
});
