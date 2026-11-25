import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures';

test('Export tab downloads a real PNG', async ({ editor, page }) => {
    await editor.addShape('Rectangle');
    await editor.openDockTab('Export');
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: /^Export PNG$/ }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.png$/);
    const bytes = readFileSync(await download.path());
    expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]); // PNG signature
});

test('a filtered photo exports (filters made export wait forever)', async ({ editor, page }) => {
    // a real JPEG, imported like a user does (top bar Open)
    const jpeg = await page.evaluate(() => {
        const c = document.createElement('canvas');
        c.width = 1600;
        c.height = 1200;
        const g = c.getContext('2d')!;
        g.fillStyle = '#3a6ea5';
        g.fillRect(0, 0, 1600, 1200);
        g.fillStyle = '#f4a261';
        g.fillRect(400, 300, 800, 600);
        return c.toDataURL('image/jpeg', 0.9).split(',')[1]!;
    });
    await page
        .locator('input[type=file]')
        .first()
        .setInputFiles({
            name: 'photo.jpg',
            mimeType: 'image/jpeg',
            buffer: Buffer.from(jpeg, 'base64'),
        });
    await expect.poll(async () => (await editor.objects()).length).toBe(1);

    await editor.openDockTab('Filter Tools');
    await page.getByTitle('Vintage').first().click();

    await editor.openDockTab('Export');
    const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15_000 }),
        page.getByRole('button', { name: /^Export PNG$/ }).click(),
    ]);
    const bytes = readFileSync(await download.path());
    expect([...bytes.subarray(0, 4)]).toEqual([137, 80, 78, 71]);
});
