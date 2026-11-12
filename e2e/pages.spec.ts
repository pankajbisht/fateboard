import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';

test.describe('pages', () => {
    test('add a page and move between pages', async ({ editor, page }) => {
        await editor.openPanel('Pages');
        await expect(page.getByText('1 of 1')).toBeVisible();
        await page.getByRole('button', { name: 'Add page' }).click();
        await expect(page.getByText('2 of 2')).toBeVisible();
        await page.getByRole('button', { name: /Previous page/ }).click();
        await expect(page.getByText('1 of 2')).toBeVisible();
    });

    test('each page keeps its own objects', async ({ editor, page }) => {
        await editor.addShape('Rectangle');
        await editor.openPanel('Pages');
        await page.getByRole('button', { name: 'Add page' }).click();
        await expect.poll(async () => (await editor.objects()).length).toBe(0);
        await page.getByRole('button', { name: /Previous page/ }).click();
        await expect.poll(async () => (await editor.objects()).length).toBe(1);
    });

    test('Clear page asks first, then empties the page', async ({ editor, page }) => {
        await editor.addShape('Rectangle');
        await editor.openPanel('Pages');
        await page.getByRole('button', { name: 'Clear page' }).click();
        await page.getByRole('button', { name: 'Clear page' }).last().click(); // dialog confirm
        await expect.poll(async () => (await editor.objects()).length).toBe(0);
    });

    test('rename a page from its card; the open page is marked', async ({ editor, page }) => {
        await editor.openPanel('Pages');
        await page.getByRole('button', { name: 'Add page' }).click();
        const first = page.getByRole('listitem', { name: 'Page 1' });
        await first.hover(); // other pages show their actions on hover / focus
        await first.getByRole('button', { name: 'Rename Page 1' }).click();
        await page.getByRole('textbox', { name: 'Page name' }).fill('Cover');
        await page.keyboard.press('Enter');
        await expect(page.getByRole('button', { name: 'Open Cover' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Open Page 2' })).toHaveAttribute(
            'aria-current',
            'page',
        );
        await page.getByRole('button', { name: 'Open Cover' }).click();
        await expect(page.getByText('1 of 2')).toBeVisible();
    });

    for (const scheme of ['light', 'dark'] as const) {
        test(`the open Pages panel has no axe violations (${scheme})`, async ({ editor, page }) => {
            await page.emulateMedia({ reducedMotion: 'reduce' });
            if (scheme === 'dark') {
                // the app default is Light (not System): switch the way a user does
                await page.goto('/setting');
                await page.getByRole('radio', { name: 'Dark' }).click();
                await editor.open();
                await expect(page.locator('html')).toHaveClass(/\bdark\b/);
            }
            await editor.openPanel('Pages');
            await page.getByRole('button', { name: 'Add page' }).click();
            await expect(page.getByText('2 of 2')).toBeVisible();
            const { violations } = await new AxeBuilder({ page })
                .include('section[aria-label="Pages panel"]')
                // shared styles, open in every panel: BUG-200 section titles, BUG-201 danger
                // text in dark mode (expected failures in known-bugs.spec.ts)
                .exclude('section[aria-label="Pages panel"] .text-label')
                .exclude('section[aria-label="Pages panel"] .text-danger')
                .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
                .analyze();
            expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
        });
    }
});
