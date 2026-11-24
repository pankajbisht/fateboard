import { test, expect } from './fixtures';

test.describe('one text float for text, shapes and sticky notes', () => {
    test('text box: Font | Size | Style | Alignment, all apply', async ({ editor, page }) => {
        await editor.openPanel('Text');
        await page.getByRole('button', { name: /Add body text/ }).click(); // regular weight
        const float = editor.textFloat;
        await expect(float).toBeVisible();
        await expect(float.getByRole('combobox', { name: 'Font' })).toBeVisible();
        await expect(float.getByRole('spinbutton', { name: 'Font size' })).toBeVisible();
        await expect(float.getByRole('group', { name: 'Text style' })).toBeVisible();
        await expect(float.getByRole('radiogroup', { name: 'Text alignment' })).toBeVisible();

        const size = (await editor.objects()).at(-1)!.fontSize!;
        await float.getByRole('button', { name: 'Bigger text' }).click();
        await float.getByRole('button', { name: 'Bold' }).click();
        await float.getByRole('radio', { name: 'Align center' }).click();
        await expect
            .poll(async () => (await editor.objects()).at(-1))
            .toMatchObject({ fontSize: size + 1, textAlign: 'center' });
        await expect(float.getByRole('button', { name: 'Bold' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });

    test('sticky note gets the very same float and its text follows', async ({ editor }) => {
        await editor.addShape('Sticky Note');
        const float = editor.textFloat;
        await expect(float).toBeVisible();
        await expect(float.getByRole('spinbutton', { name: 'Font size' })).toBeVisible();
        const size = float.getByRole('spinbutton', { name: 'Font size' });
        await size.fill('40');
        await size.press('Enter');
        await float.getByRole('radio', { name: 'Align right' }).click();
        await expect
            .poll(async () => (await editor.objects()).at(-1))
            .toMatchObject({ isTextShape: true, fontSize: 40, textAlign: 'right' });
    });

    test('no second set of text tools in the header', async ({ editor, page }) => {
        await editor.openPanel('Text');
        await page.getByRole('button', { name: /Add a heading/ }).click();
        await expect(page.locator('header [aria-label="Font size"]')).toHaveCount(0);
    });
});
