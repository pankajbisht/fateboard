/** The Help page: search reaches inside topics, and its links open the right place in the editor. */
import { expect, test } from '@playwright/test';

import { test as editorTest } from './fixtures';

const search = (page: import('@playwright/test').Page) =>
    page.getByRole('searchbox', { name: 'Search help' });

test.beforeEach(async ({ page }) => {
    page.on('pageerror', (error) => {
        throw error;
    });
});

test('search finds a line inside a topic and scrolls to it', async ({ page }) => {
    await page.goto('/help');
    await expect(search(page)).toBeVisible();
    await page.keyboard.press('/');
    await expect(search(page)).toBeFocused();

    await page.keyboard.type('stagger');
    await page.getByRole('list', { name: 'Search results' }).getByRole('link').first().click();

    await expect(page).toHaveURL(/topic=animate&section=presets/);
    await expect(page.getByRole('heading', { level: 1, name: 'Animate' })).toBeVisible();
    await expect(page.locator('#section-presets')).toBeInViewport();
});

test('a topic has its own address, and Back returns to it', async ({ page }) => {
    await page.goto('/help?topic=layers');
    await expect(page.getByRole('heading', { level: 1, name: 'Layers' })).toBeVisible();

    await page.getByRole('link', { name: /next:/i }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Templates' })).toBeVisible();

    await page.goBack();
    await expect(page.getByRole('heading', { level: 1, name: 'Layers' })).toBeVisible();
});

test('the shortcut finder hears a key the browser would otherwise take', async ({ page }) => {
    await page.goto('/help?topic=shortcuts');
    await page.getByRole('button', { name: 'Press keys to find' }).click();

    await page.keyboard.press('ControlOrMeta+d');
    await expect(page.getByRole('status')).toContainText('Duplicate');

    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Practice' })).toBeVisible();
});

test('the node demo moves a handle by keyboard', async ({ page }) => {
    await page.goto('/help?topic=node');
    const handle = page.getByRole('button', { name: /curve handle of the start node/i });
    const before = await handle.getAttribute('cx');

    await handle.focus();
    await page.keyboard.press('ArrowRight');

    expect(await handle.getAttribute('cx')).not.toBe(before);
});

test('Open Layers lands in the editor with that panel open', async ({ page }) => {
    await page.goto('/help?topic=layers');
    await page.getByRole('link', { name: 'Open Layers' }).click();

    await expect(page).toHaveURL(/\/draw\?panel=layers/);
    await expect(page.locator('canvas.upper-canvas')).toBeVisible();
    await expect(page.getByRole('listbox', { name: 'Layers' })).toBeVisible();
});

test('a dock tab opens from its link too', async ({ page }) => {
    await page.goto('/help?topic=export');
    await page.getByRole('link', { name: 'Open Export' }).click();

    await expect(page).toHaveURL(/\/draw\?tab=export/);
    await expect(page.getByRole('textbox', { name: 'File name' })).toBeVisible();
});

test('an unknown panel in the link is ignored', async ({ page }) => {
    await page.goto('/draw?panel=nope&tab=nope');
    await expect(page.locator('canvas.upper-canvas')).toBeVisible();
    await expect(page.getByRole('listbox', { name: 'Layers' })).toBeHidden();
});

editorTest(
    'opening the Text panel from Help adds nothing to the board',
    async ({ editor, page }) => {
        await page.goto('/draw?panel=text');
        await page.waitForFunction(() => !!window.__fateboard?.ready());
        await expect(page.getByRole('button', { name: 'Add a heading' })).toBeVisible();
        expect(await editor.objects()).toEqual([]);
    },
);

editorTest('the Draw link arrives ready to draw', async ({ editor, page }) => {
    await page.goto('/draw?panel=draw');
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect.poll(() => editor.state('activeTool')).toBe('draw');
});
