/**
 * Busy boards: work must scale with what is on screen, not with how many objects exist.
 *   - the Layers panel mounts only the rows near its viewport
 *   - the hover outline is painted on the top canvas, in the right place, on a retina screen
 */
import type { Page } from '@playwright/test';

import { test, expect } from './fixtures';

const COPIES = 40;

/** Opaque pixels of the top canvas in a box around a canvas-space point. */
const topCanvasInk = (page: Page, box?: { x: number; y: number; r: number }) =>
    page.evaluate((b) => {
        const el = document.querySelector('canvas.upper-canvas') as HTMLCanvasElement;
        const ctx = el.getContext('2d')!;
        const hook = window.__fateboard!.bounds(0);
        const k = el.width / hook.canvasWidth;
        const x = b ? Math.max(0, Math.round((b.x - b.r) * k)) : 0;
        const y = b ? Math.max(0, Math.round((b.y - b.r) * k)) : 0;
        const w = b ? Math.ceil(b.r * 2 * k) : el.width;
        const h = b ? Math.ceil(b.r * 2 * k) : el.height;
        const data = ctx.getImageData(x, y, w, h).data;
        let ink = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i]! > 0) ink++;
        return ink;
    }, box);

test.describe('hover outline on a retina screen', () => {
    test.use({ deviceScaleFactor: 2 });

    test('follows the shape on the top canvas and leaves nothing behind', async ({
        editor,
        page,
    }) => {
        await editor.addShape('Rectangle');
        await editor.clickEmptyCanvas();
        await expect.poll(async () => (await editor.selection()).length).toBe(0);
        expect(await topCanvasInk(page)).toBe(0);

        const b = await page.evaluate(() => window.__fateboard!.bounds(0));
        const box = await editor.settledCanvasBox();
        const k = box.width / b.canvasWidth;
        await page.mouse.move(
            box.x + (b.left + b.width / 2) * k,
            box.y + (b.top + b.height / 2) * k,
        );

        // on the shape's edges...
        const r = 4;
        await expect
            .poll(() => topCanvasInk(page, { x: b.left + b.width / 2, y: b.top, r }))
            .toBeGreaterThan(0);
        expect(
            await topCanvasInk(page, { x: b.left + b.width, y: b.top + b.height / 2, r }),
        ).toBeGreaterThan(0);
        // ...and not in its middle
        expect(
            await topCanvasInk(page, { x: b.left + b.width / 2, y: b.top + b.height / 2, r }),
        ).toBe(0);

        await page.mouse.move(box.x + 12, box.y + 12);
        await expect.poll(() => topCanvasInk(page)).toBe(0);
    });
});

test('Layers panel keeps a long list usable while mounting only part of it', async ({
    editor,
    page,
}) => {
    await editor.addShape('Rectangle');
    for (let i = 0; i < COPIES; i++) await page.keyboard.press('ControlOrMeta+d');
    await expect.poll(async () => (await editor.objects()).length).toBe(COPIES + 1);

    await editor.openPanel('Layers');
    const list = page.getByRole('listbox', { name: 'Layers' });
    const rows = list.getByRole('option');
    await expect(rows.first()).toBeVisible();

    // the whole list is reported and scrollable; the DOM holds only the part near the viewport
    await expect(rows.first()).toHaveAttribute('aria-setsize', String(COPIES + 1));
    expect(await rows.count()).toBeLessThan(COPIES + 1);

    // the oldest layer sits at the bottom of the stack: scroll to it and select it
    await list.evaluate((el) => (el.scrollTop = el.scrollHeight));
    const last = list.locator(`[aria-posinset="${COPIES + 1}"]`);
    await expect(last).toBeVisible();
    await last.click();
    await expect(last).toHaveAttribute('aria-selected', 'true');
    await expect.poll(async () => (await editor.selection()).length).toBe(1);

    // scrolling back brings the top rows back, in order and without overlap
    await list.evaluate((el) => (el.scrollTop = 0));
    const first = list.locator('[aria-posinset="1"]');
    const second = list.locator('[aria-posinset="2"]');
    await expect(first).toBeVisible();
    const [a, b] = [await first.boundingBox(), await second.boundingBox()];
    expect(b!.y - a!.y).toBeCloseTo(a!.height, 0);
});
