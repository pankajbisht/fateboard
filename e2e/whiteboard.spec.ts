import { test, expect } from './fixtures';

// BUG-107: with the grid on, the whiteboard draws ONE grid (the notebook grid that follows zoom and
// snap), not also a CSS dot grid with a different spacing.
test('whiteboard grid: one renderer only', async ({ editor, page }) => {
    await page.goto('/setting');
    await page.getByRole('switch', { name: /Freehand/i }).click();
    await page.goto('/draw');
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect
        .poll(() => page.evaluate(() => window.__fateboard!.state('boardMode')))
        .toBe('whiteboard');

    // the whiteboard starts with its dot grid on (like FigJam / Miro); the top bar turns it off
    await expect
        .poll(() => page.evaluate(() => window.__fateboard!.state('gridEnabled')))
        .toBe(true);
    await expect(page.locator('[data-testid="whiteboard-grid"]')).toHaveCount(0);
    void editor;
});

test('whiteboard: the wheel moves the board, Ctrl + wheel zooms; new shapes keep their on-screen size', async ({
    editor,
    page,
}) => {
    await page.goto('/setting');
    await page.getByRole('switch', { name: /Freehand/i }).click();
    await editor.open();
    const view = () =>
        page.evaluate(() => {
            const c = window.__fateboard!.state('canvas') as { viewportTransform: number[] };
            return {
                vpt: [...c.viewportTransform],
                zoom: window.__fateboard!.state('zoom') as number,
            };
        });

    const box = (await editor.canvas.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 200);
    await expect.poll(async () => (await view()).vpt[5]).toBeLessThan(0);
    expect((await view()).zoom).toBe(1);

    await page.keyboard.down('Control');
    await page.mouse.wheel(0, 300); // zoom out
    await page.keyboard.up('Control');
    await expect.poll(async () => (await view()).zoom).toBeLessThan(1);

    // a rectangle added while zoomed out is made bigger, so it looks the usual size on screen
    const zoom = (await view()).zoom;
    await editor.addShape('Rectangle');
    const w = await page.evaluate(() => {
        const c = window.__fateboard!.state('canvas') as {
            getObjects(): { width: number; scaleX: number }[];
        };
        const o = c.getObjects().at(-1)!;
        return o.width * o.scaleX;
    });
    expect(w * zoom).toBeGreaterThan(150);
    expect(w * zoom).toBeLessThan(170);
});
