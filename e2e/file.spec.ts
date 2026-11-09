import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures';

test.describe('Save / Open (top bar, whole project)', () => {
    test('Save downloads all pages; Open restores them', async ({ editor, page }) => {
        // two pages: a rectangle on page 1, a circle on page 2
        await editor.addShape('Rectangle');
        await editor.openPanel('Pages');
        await page.getByRole('button', { name: 'Add page' }).click();
        await editor.addShape('Circle');

        const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.getByRole('button', { name: 'Save Board' }).first().click(),
        ]);
        expect(download.suggestedFilename()).toMatch(/\.fateboard$/);
        const file = await download.path();
        const project = JSON.parse(readFileSync(file, 'utf8'));
        expect(project.app).toBe('fateboard');
        expect(project.pages).toHaveLength(2);

        // start over in a fresh tab, then open the saved project
        const fresh = await page.context().newPage();
        await fresh.goto('/draw');
        await fresh.waitForFunction(() => !!window.__fateboard?.ready());
        const [chooser] = await Promise.all([
            fresh.waitForEvent('filechooser'),
            fresh.getByRole('button', { name: 'Open Board' }).first().click(),
        ]);
        // downloads are stored without an extension: upload under the saved name
        await chooser.setFiles({
            name: download.suggestedFilename(),
            mimeType: 'application/json',
            buffer: readFileSync(file),
        });
        await expect
            .poll(() =>
                fresh.evaluate(() => (window.__fateboard!.state('pages') as unknown[]).length),
            )
            .toBe(2);
    });
});
