import { test, expect } from './fixtures';

test.describe('shapes', () => {
    test('add a rectangle from the Shapes panel; it is selected', async ({ editor }) => {
        await editor.addShape('Rectangle');
        const sel = await editor.selection();
        expect(sel).toHaveLength(1);
        expect(sel[0].type).toBe('rect');
    });

    test('type a width, click the canvas: the shape gets it (commit before deselect)', async ({
        editor,
        page,
    }) => {
        await editor.addShape('Rectangle');
        const w = page.getByRole('spinbutton', { name: 'Width', exact: true });
        await w.click();
        await w.fill('250');
        await editor.clickEmptyCanvas();
        await expect.poll(async () => (await editor.objects())[0].width).toBe(250);
    });

    test('number field counter: + / − step, Shift ×10', async ({ editor, page }) => {
        await editor.addShape('Rectangle');
        const start = (await editor.objects())[0].width;
        await page.getByRole('button', { name: 'Increase Width' }).click();
        await expect.poll(async () => (await editor.objects())[0].width).toBe(start + 1);
        await page.getByRole('button', { name: 'Decrease Width' }).click({ modifiers: ['Shift'] });
        await expect.poll(async () => (await editor.objects())[0].width).toBe(start - 9);
    });

    test('footer Fill / Stroke toggles remove and re-add with defaults', async ({
        editor,
        page,
    }) => {
        await editor.addShape('Rectangle');
        const stroke = page.locator('[data-tile-row] [data-paint="stroke"]');
        const fill = page.locator('[data-tile-row] [data-paint="fill"]');
        await expect(stroke).toHaveAttribute('aria-label', 'Remove stroke');
        await stroke.click();
        await expect(stroke).toHaveAttribute('aria-label', 'Add stroke');
        expect((await editor.objects())[0].strokeWidth).toBe(0);
        await stroke.click();
        expect((await editor.objects())[0]).toMatchObject({ stroke: '#000000', strokeWidth: 2 });

        await fill.click();
        await expect(fill).toHaveAttribute('aria-label', 'Add fill');
        expect((await editor.objects())[0].fill).toBe('rgba(0,0,0,0)');
        await fill.click();
        expect((await editor.objects())[0].fill).toBe('#ffffff');
    });

    test('fill / stroke toggles are disabled with nothing selected', async ({ editor, page }) => {
        await editor.addShape('Rectangle');
        await editor.clickEmptyCanvas();
        await expect(page.locator('[data-tile-row] [data-paint="fill"]')).toBeDisabled();
        await expect(page.locator('[data-tile-row] [data-paint="stroke"]')).toBeDisabled();
    });

    test('Backspace removes the selected shape', async ({ editor, page }) => {
        await editor.addShape('Rectangle');
        await page.keyboard.press('Backspace');
        await expect.poll(async () => (await editor.objects()).length).toBe(0);
    });
});

test('a design page gives new shapes and text a size that fits the page (1920 × 1080: 1.8 ×)', async ({
    editor,
    page,
}) => {
    await editor.addShape('Rectangle');
    await editor.openPanel('Text');
    await page.getByRole('button', { name: 'Add a heading' }).click();
    const sizes = await page.evaluate(() => {
        const c = window.__fateboard!.state('canvas') as {
            getObjects(): { type: string; width: number; scaleX: number; fontSize?: number }[];
        };
        const objects = c.getObjects();
        const rect = objects[0];
        const heading = objects.filter((o) => o.type === 'textbox').at(-1)!; // the one just added
        return { rect: Math.round(rect.width * rect.scaleX), heading: heading.fontSize };
    });
    expect(sizes.rect).toBe(288); // 160 × 1.8
    expect(sizes.heading).toBeCloseTo(115.2); // 64 × 1.8
});
