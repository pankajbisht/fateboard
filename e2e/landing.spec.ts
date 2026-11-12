/** Landing page "From thought to visual": the live stage builds a poster (BUG-196 fixed). */
import { expect, test, type Page } from '@playwright/test';

const stage = (page: Page) => page.getByRole('region', { name: 'From thought to visual, live' });
const board = (page: Page) => stage(page).getByRole('img').first();

test.beforeEach(async ({ page }) => {
    page.on('pageerror', (error) => {
        throw error;
    });
});

test('steps, scrubber and keys drive the live board', async ({ page }) => {
    await page.goto('/');
    await stage(page).scrollIntoViewIfNeeded();
    await expect(board(page)).toHaveAccessibleName(/The board at step \d/);

    await page.getByRole('button', { name: /Bring It to Life/ }).click();
    await expect(board(page)).toHaveAccessibleName('The board at step 3');

    // arrows on the page do nothing; on the focused stage they step (BUG-196)
    await page.keyboard.press('ArrowLeft');
    await expect(board(page)).toHaveAccessibleName('The board at step 3');
    await stage(page).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(board(page)).toHaveAccessibleName('The board at step 2');

    // dragging the time-lapse blends two steps, letting go settles on one
    const scrubber = stage(page).getByRole('slider', { name: 'Time-lapse' });
    const box = (await scrubber.boundingBox())!;
    await page.mouse.move(box.x + 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2, { steps: 4 });
    await expect(stage(page).locator('[data-frame="next"]')).toBeVisible();
    await page.mouse.up();
    await expect(stage(page).locator('[data-frame="next"]')).toHaveCount(0);
});

test('compare wipes between the sketch and the poster, and the lens zooms in', async ({ page }) => {
    await page.goto('/');
    await stage(page).scrollIntoViewIfNeeded();
    await stage(page).getByRole('radio', { name: 'Compare' }).click();
    const wipe = stage(page).getByRole('slider', { name: 'Compare thought and visual' });
    await expect(wipe).toHaveAttribute('aria-valuenow', '50');

    const picture = (await stage(page).locator('[data-stage-picture]').boundingBox())!;
    await page.mouse.move(picture.x + picture.width * 0.2, picture.y + picture.height / 2);
    await page.mouse.down();
    await page.mouse.move(picture.x + picture.width * 0.8, picture.y + picture.height / 2, {
        steps: 4,
    });
    await page.mouse.up();
    expect(Number(await wipe.getAttribute('aria-valuenow'))).toBeGreaterThan(70);

    await page.mouse.move(picture.x + picture.width * 0.3, picture.y + picture.height * 0.4);
    await expect(page.getByTestId('stage-lens')).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(page.getByTestId('stage-lens')).toHaveCount(0);
});

test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('the stage waits for the visitor instead of playing (BUG-196)', async ({ page }) => {
        await page.goto('/');
        await stage(page).scrollIntoViewIfNeeded();
        await expect(stage(page).getByRole('button', { name: 'Play' })).toBeVisible();
        await page.waitForTimeout(4000);
        await expect(board(page)).toHaveAccessibleName('The board at step 1');
    });
});
