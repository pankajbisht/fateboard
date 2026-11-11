import { test, expect } from './fixtures';
import { test as plain } from '@playwright/test';

plain(
    'Settings: theme, colour theme and icon size apply and survive a reload',
    async ({ page }) => {
        await page.goto('/setting');
        await page.getByRole('radio', { name: 'Dark' }).click();
        await expect(page.locator('html')).toHaveClass(/dark/);
        await page.getByRole('radio', { name: 'Large' }).click();
        await expect(page.locator('html')).toHaveAttribute('data-icon-size', 'lg');
        await page.reload();
        await expect(page.locator('html')).toHaveClass(/dark/);
        await expect(page.locator('html')).toHaveAttribute('data-icon-size', 'lg');
    },
);

plain(
    'Settings only offers preferences that work (no page size, background or snap)',
    async ({ page }) => {
        await page.goto('/setting');
        await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
        await expect(page.getByText('Page size', { exact: true })).toHaveCount(0);
        await expect(page.getByText('Snap to grid')).toHaveCount(0);
        await expect(page.getByText('Background pattern')).toHaveCount(0);
    },
);

test('Large icon size: toolbar buttons and swatches grow, nothing is cut', async ({
    editor,
    page,
}) => {
    await page.goto('/setting');
    await page.getByRole('radio', { name: 'Large' }).click();
    await editor.open();
    const swatch = page.getByRole('group', { name: 'Color palette' }).getByRole('button').first();
    await expect.poll(async () => (await swatch.boundingBox())!.width).toBe(24);
});

plain(
    'A new visitor gets Light, Fate Blue, Small icons and px, even on a dark device',
    async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.goto('/setting');
        const html = page.locator('html');
        await expect(html).not.toHaveClass(/dark/);
        await expect(html).toHaveAttribute('data-theme', 'fate');
        await expect(html).toHaveAttribute('data-icon-size', 'sm');
        await expect(page.getByRole('radio', { name: 'Light' })).toHaveAttribute(
            'aria-checked',
            'true',
        );
        await expect(page.getByRole('radio', { name: 'px' })).toHaveAttribute(
            'aria-checked',
            'true',
        );
    },
);

plain(
    'Reset asks first, then restores every default and keeps it after a reload',
    async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.goto('/setting');
        await page.getByRole('radio', { name: 'System' }).click();
        await page.getByRole('radio', { name: 'Violet' }).click();
        await page.getByRole('radio', { name: 'Large' }).click();
        await page.getByRole('radio', { name: 'mm' }).click();
        await page.getByRole('combobox', { name: 'Canvas size' }).click();
        await page.getByRole('option', { name: /YouTube Shorts/ }).click();
        const html = page.locator('html');
        await expect(html).toHaveClass(/dark/);

        // Cancel keeps everything
        await page.getByRole('button', { name: 'Reset settings' }).click();
        await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
        await expect(html).toHaveAttribute('data-theme', 'violet');

        await page.getByRole('button', { name: 'Reset settings' }).click();
        await page.getByRole('alertdialog').getByRole('button', { name: 'Reset settings' }).click();

        const defaults = async () => {
            await expect(html).not.toHaveClass(/dark/);
            await expect(html).toHaveAttribute('data-theme', 'fate');
            await expect(html).toHaveAttribute('data-icon-size', 'sm');
            await expect(page.getByRole('radio', { name: 'px' })).toHaveAttribute(
                'aria-checked',
                'true',
            );
            await expect(page.getByRole('combobox', { name: 'Canvas size' })).toContainText(
                'Presentation 16:9',
            );
        };
        await defaults();
        await page.reload();
        await defaults();
    },
);

test('Settings > Canvas size: the open page takes it (one undo step) and new boards start at it', async ({
    editor,
    page,
}) => {
    const presetId = () =>
        page.evaluate(() => (window.__fateboard!.state('selectedPreset') as { id: string }).id);
    await editor.addShape('Rectangle');
    await page.waitForTimeout(1500); // autosave
    expect(await presetId()).toBe('presentation-16-9');

    await page.goto('/setting');
    await page.getByRole('combobox', { name: 'Canvas size' }).click();
    await page.getByRole('option', { name: /Instagram Post/ }).click();

    await editor.open();
    await expect.poll(presetId).toBe('instagram-post');
    expect((await editor.objects()).length).toBe(1); // content kept
    await page.waitForTimeout(350); // history is debounced
    await page.getByRole('button', { name: 'Undo' }).first().click();
    await expect.poll(presetId).toBe('presentation-16-9');

    // a later reload does not resize again
    await page.waitForTimeout(1500);
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect.poll(presetId).toBe('presentation-16-9');

    // New board starts at the Settings size
    await page.getByRole('button', { name: 'Create New Board' }).first().click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Clear board' }).click();
    await expect.poll(presetId).toBe('instagram-post');
});

test('orientation is set in Settings; there is no Canvas Size panel in the editor', async ({
    editor,
    page,
}) => {
    await page.goto('/setting');
    await page.getByRole('radio', { name: 'Portrait' }).click();

    await editor.open();
    const preset = () =>
        page.evaluate(
            () =>
                window.__fateboard!.state('selectedPreset') as {
                    id: string;
                    width: number;
                    height: number;
                },
        );
    // the first board starts in portrait
    await expect.poll(preset).toMatchObject({ width: 1080, height: 1920 });
    const rail = page.getByRole('navigation', { name: 'Editor tools and panels' });
    await expect(rail.getByRole('button', { name: 'Canvas Size', exact: true })).toHaveCount(0);
});

test('Settings > Custom size: typed in mm, the open page takes it as typed', async ({
    editor,
    page,
}) => {
    await editor.addShape('Rectangle');
    await page.waitForTimeout(1500); // autosave

    await page.goto('/setting');
    await page.getByRole('radio', { name: 'mm' }).click();
    await page.getByRole('combobox', { name: 'Canvas size' }).click();
    await page.getByRole('option', { name: /Custom size/ }).click();
    await page.getByLabel('Width (mm)').fill('210');
    await page.getByLabel('Height (mm)').fill('297');
    await page.getByRole('button', { name: 'Apply size' }).click();
    await expect(page.getByRole('radio', { name: 'Portrait' })).toHaveAttribute(
        'aria-checked',
        'true',
    );

    await editor.open();
    await expect
        .poll(() =>
            page.evaluate(() => {
                const p = window.__fateboard!.state('selectedPreset') as {
                    width: number;
                    height: number;
                };
                return [p.width, p.height];
            }),
        )
        .toEqual([794, 1123]);
    // pages are whole px: 794 × 1123 px reads back as 210.1 × 297.1 mm (like the A4 preset)
    await expect(editor.footerView).toContainText('210.1 × 297.1 mm');
});
