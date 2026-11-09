import { test, expect } from './fixtures';
import { test as plain } from '@playwright/test';

/* Every route renders, with no console errors (guarded by the fixture). */

test('editor loads with canvas, rail, dock, header and footer', async ({ editor, page }) => {
    await expect(editor.canvas).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Editor tools and panels' })).toBeVisible();
    await expect(page.getByRole('toolbar', { name: 'Dock panels' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Color palette' })).toBeVisible();
    await expect(editor.footerView.getByRole('slider', { name: 'Zoom' })).toBeVisible();
});

for (const [name, path, check] of [
    ['landing page', '/', /draw|board|start|whiteboard/i],
    ['settings', '/setting', /Settings/],
    ['help', '/help', /help|shortcut/i],
    ['unknown route shows 404', '/no-such-page', /not found|404/i],
] as const) {
    plain(`route: ${name}`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await page.goto(path);
        await expect(page.locator('body')).toContainText(check);
        expect(errors).toEqual([]);
    });
}
