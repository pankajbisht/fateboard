import { test, expect } from './fixtures';

/* One place per feature (docs/COMPONENTS.md "Feature placement"), checked in the real UI. */

test('zoom only in the footer', async ({ editor, page }) => {
    await expect(editor.footerView.getByRole('button', { name: 'Zoom in' })).toBeVisible();
    await expect(
        page.locator('header').getByRole('button', { name: /Zoom In|Fit to Screen/ }),
    ).toHaveCount(0);
});

test('Pages panel: no size, zoom, export or save / open copies', async ({ editor, page }) => {
    await editor.openPanel('Pages');
    await expect(page.getByRole('button', { name: 'Clear page' })).toBeVisible();
    for (const name of [
        'Export PNG',
        'Save project',
        'Open project',
        'Fit page',
        'Use this size on all pages',
    ])
        await expect(page.getByRole('button', { name })).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'Page size' })).toHaveCount(0);
});

test('canvas size is set in Settings, not in the left rail', async ({ editor, page }) => {
    const rail = page.getByRole('navigation', { name: 'Editor tools and panels' });
    await expect(rail.getByRole('button', { name: 'Shapes', exact: true })).toBeVisible();
    await expect(rail.getByRole('button', { name: 'Canvas Size', exact: true })).toHaveCount(0);
    await expect(editor.footerView).toContainText('×');
});
