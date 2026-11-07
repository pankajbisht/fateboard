import { test, expect } from './fixtures';

// BUG-009 / Q11: applying a template replaces the page as ONE undo step and offers Undo in a toast.
test('applying a template can be undone from the toast', async ({ editor, page }) => {
    await editor.addShape('Rectangle');
    const mine = (await editor.objects()).map((o) => o.type);

    await editor.openPanel('Templates');
    await page
        .getByRole('button', { name: /^Preview / })
        .first()
        .click();
    await page.getByRole('button', { name: 'Use this template' }).click();

    const toast = page.getByRole('status').filter({ hasText: /applied/ });
    await expect(toast).toBeVisible();
    await expect.poll(async () => (await editor.objects()).length).toBeGreaterThan(mine.length);

    await toast.getByRole('button', { name: 'Undo' }).click();
    await expect.poll(async () => (await editor.objects()).map((o) => o.type)).toEqual(mine);
    await expect(toast).toBeHidden();
});

// BUG-145: the "Modern Social Post" template's photo (/template/girl.jpg) was missing and never loaded
test('the Modern Social Post template brings its photo', async ({ editor, page }) => {
    await editor.openPanel('Templates');
    await page.getByRole('button', { name: 'Preview Modern Social Post' }).click();
    await page.getByRole('button', { name: 'Use this template' }).click();
    await expect.poll(async () => (await editor.objects()).map((o) => o.type)).toContain('image');
});
