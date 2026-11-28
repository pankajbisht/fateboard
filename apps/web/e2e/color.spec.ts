import { test, expect } from './fixtures';

test.describe('colour palette (right dock)', () => {
    test('a strip swatch paints the selection and is ringed as current', async ({
        editor,
        page,
    }) => {
        await editor.addShape('Rectangle');
        const swatch = page
            .getByRole('group', { name: 'Color palette' })
            .getByRole('button', { name: /^Blue 500 · #/ });
        await swatch.click();
        await expect.poll(async () => (await editor.objects())[0].fill).toBe('#2b7fff');
        await expect(swatch).toHaveAttribute('aria-pressed', 'true');
    });

    test('All colors grid: pick a shade; Escape closes', async ({ editor, page }) => {
        await editor.addShape('Rectangle');
        await page.getByRole('button', { name: 'All colors' }).click();
        const grid = page.getByRole('dialog', { name: 'All colors' });
        await grid.getByRole('button', { name: /^Red 300 · #/ }).click();
        await expect.poll(async () => (await editor.objects())[0].fill).toBe('#ffa2a2');
        await page.keyboard.press('Escape');
        await expect(grid).toBeHidden();
    });

    test('custom picker: typed hex applies live; Recent gets it on close', async ({
        editor,
        page,
    }) => {
        await editor.addShape('Rectangle');
        await page.getByRole('button', { name: 'Custom color' }).click();
        const hex = page.getByRole('textbox', { name: 'Hex' });
        await hex.fill('0a60d6');
        await hex.press('Enter');
        await expect.poll(async () => (await editor.objects())[0].fill).toBe('#0a60d6');
        await page.keyboard.press('Escape');
        await expect(page.getByRole('button', { name: 'Use recent color #0a60d6' })).toBeVisible();
    });
    test('custom picker: CMYK fields and a harmony swatch paint the selection', async ({
        editor,
        page,
    }) => {
        await editor.addShape('Rectangle');
        await page.getByRole('button', { name: 'Custom color' }).click();
        const dialog = page.getByRole('dialog', { name: 'Custom color' });
        const hex = dialog.getByRole('textbox', { name: 'Hex' });
        await hex.fill('ff0000');
        await hex.press('Enter');

        await dialog.getByRole('radio', { name: 'CMYK' }).click();
        await expect(
            dialog.getByRole('button', { name: 'Copy cmyk(0%, 100%, 100%, 0%)' }),
        ).toBeVisible();
        const black = dialog.getByRole('spinbutton', { name: 'Black' });
        await black.fill('50');
        await black.press('Enter');
        await expect.poll(async () => (await editor.objects())[0].fill).toBe('#800000');

        await dialog.getByRole('button', { name: 'Complementary color #008080' }).click();
        await expect.poll(async () => (await editor.objects())[0].fill).toBe('#008080');
    });
    test('Fill & Shadow color harmony: a swatch fills, Gradient makes a gradient', async ({
        editor,
        page,
    }) => {
        await editor.addShape('Rectangle');
        await page.getByRole('button', { name: 'Custom color' }).click();
        const hex = page.getByRole('dialog', { name: 'Custom color' }).getByRole('textbox', {
            name: 'Hex',
        });
        await hex.fill('ff0000');
        await hex.press('Enter');
        await page.keyboard.press('Escape');

        await editor.openDockTab('Fill & Shadow');
        const harmony = page.getByRole('group', { name: 'Color harmony' });
        await harmony.getByRole('button', { name: 'Triad color #00ff00' }).click();
        // green (the corner click lands within a step or two of 100 % / 100 %)
        await expect
            .poll(async () => (await editor.objects())[0].fill)
            .toMatch(/^#0[0-9a-f]f[0-9a-f]0[0-9a-f]$/);

        await harmony.getByRole('button', { name: 'Gradient from Complementary' }).click();
        // the bridge reports gradients as 'gradient'; the stops are checked in FillShadowPanel.test
        await expect.poll(async () => (await editor.objects())[0].fill).toBe('gradient');
    });

    test('Fill & Shadow color wheel: dragging the ring repaints the shape, no flicker', async ({
        editor,
        page,
    }) => {
        await editor.addShape('Rectangle');
        await editor.openDockTab('Fill & Shadow');
        const wheel = page.getByRole('group', { name: 'Fill color wheel' });
        const ring = wheel.getByRole('slider', { name: 'Hue wheel' });
        // full saturation and brightness first (the new shape's fill may be a gray)
        const sv = (await wheel
            .getByRole('slider', { name: 'Saturation and brightness' })
            .boundingBox())!;
        // 3 px in from the corner, not 1: the square has rounded corners and Firefox hit-tests the curve exactly
        // (1 px in lands outside it, on the ring behind), where Chromium accepts the whole box
        await page.mouse.click(sv.x + sv.width - 3, sv.y + 3);
        const box = (await ring.boundingBox())!;
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        const r = box.width / 2 - 8; // on the ring
        // press at 12 o'clock (red), drag round to 4 o'clock (~120°, green) and off the ring into the hole
        await page.mouse.move(cx, cy - r);
        await page.mouse.down();
        await page.mouse.move(cx + r * 0.87, cy + r * 0.5, { steps: 8 });
        await page.mouse.move(cx + 20, cy + 11.5, { steps: 4 }); // same angle, inside the ring
        await page.mouse.up();
        await expect(ring).toHaveAttribute('aria-valuenow', '120');
        // the ring stayed where it was during the drag (the panel did not move under the pointer)
        expect((await ring.boundingBox())!.y).toBeCloseTo(box.y, 0);
        await expect.poll(async () => (await editor.objects())[0].fill).toMatch(/^#[0-9a-f]{6}$/);
        // green (the click near the corner lands at about 98 % / 98 %)
        await expect
            .poll(async () => (await editor.objects())[0].fill)
            .toMatch(/^#0[0-9a-f]f[0-9a-f]0[0-9a-f]$/);
        await page.screenshot({ path: process.env.SHOT ?? 'test-results/wheel.png' });
    });
});
