import { test, expect } from './fixtures';

const trackCount = (page: import('@playwright/test').Page) =>
    page.evaluate(
        () => Object.keys(window.__fateboard!.state('tracks') as Record<string, unknown>).length,
    );

// BUG-010 / Q12: animation tracks are saved with their page and survive a reload
test('a keyframe survives a reload and stays on its page', async ({ editor, page }) => {
    await editor.addShape('Rectangle'); // added shapes are selected
    await editor.openDockTab('Animate');
    await page.getByRole('button', { name: 'Keyframe at playhead' }).click();
    await expect.poll(() => trackCount(page)).toBe(1);

    // a new page has its own (empty) timeline
    await editor.openPanel('Pages');
    await page.getByRole('button', { name: 'Add page' }).click();
    await expect.poll(() => trackCount(page)).toBe(0);
    await page.getByRole('button', { name: /Previous page/ }).click();
    await expect.poll(() => trackCount(page)).toBe(1);

    await page.waitForTimeout(1500); // autosave debounce
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect.poll(() => trackCount(page)).toBe(1);
});
