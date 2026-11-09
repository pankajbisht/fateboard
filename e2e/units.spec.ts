import { test, expect } from './fixtures';

// BUG-082: Settings > Units applies to the size fields and labels, not only the rulers.
test('millimetres in Settings show up in the editor size fields', async ({ editor, page }) => {
    await page.goto('/setting');
    await page
        .getByRole('radiogroup', { name: 'Units' })
        .getByRole('radio', { name: /mm/ })
        .click();
    await page.goto('/draw');
    await page.waitForFunction(() => !!window.__fateboard?.ready());

    await expect(editor.footerView).toContainText('mm'); // page size label
    await editor.addShape('Rectangle');
    const width = page.getByRole('banner').getByRole('spinbutton', { name: 'Width' });
    // 160 px wide = 42.3 mm
    await expect.poll(async () => Number(await width.inputValue())).toBeCloseTo(42.3, 1);
});
