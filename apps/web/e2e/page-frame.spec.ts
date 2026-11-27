/**
 * Page frame (2026-11-17, InDesign / Clip Studio style): a portrait page fills the board height, bleed / slug
 * frames and crop marks around it, Fit width, and crop marks in an exported file.
 */
import { readFileSync } from 'node:fs';
import { expect, test } from './fixtures';

const pageRect = (editor: { page: import('@playwright/test').Page }) =>
    editor.page.evaluate(() => window.__fateboard!.pageRect()!);
const view = (editor: { page: import('@playwright/test').Page }) =>
    editor.page.evaluate(() => {
        const el = document.querySelector('[data-board-scroll]') as HTMLElement;
        return { w: el.clientWidth, h: el.clientHeight };
    });

async function setLength(page: import('@playwright/test').Page, name: string, value: string) {
    const field = page.getByRole('spinbutton', { name });
    await field.fill(value);
    await field.press('Enter');
}

test('portrait page opens taller than the board (top first); frames, crop marks; Fit width', async ({
    editor,
    page,
}) => {
    await page.goto('/setting');
    await page.getByRole('radio', { name: 'Portrait' }).click();
    await editor.open();
    await editor.settledCanvasBox();
    // opens at 1.3 × the fit: longer than the board, scrolled to the top of the page
    const v = await view(editor);
    await expect
        .poll(async () => Math.round((await pageRect(editor)).height))
        .toBeGreaterThan(v.h * 1.2);
    const scrollTop = () =>
        page.evaluate(
            () => (document.querySelector('[data-board-scroll]') as HTMLElement).scrollTop,
        );
    await expect.poll(scrollTop).toBe(0);
    // Fit to screen: the whole page, as tall as the board minus a 16 px gap (was 48 px)
    await page.getByRole('button', { name: 'Fit to screen' }).click();
    await expect
        .poll(async () => Math.round((await pageRect(editor)).height))
        .toBeGreaterThanOrEqual(v.h - 2 * 16 - 2);
    expect((await pageRect(editor)).height).toBeLessThanOrEqual(v.h);

    await editor.openDockTab('Pages');
    await page.getByRole('button', { name: /Page setup/ }).click();
    await expect(page.getByRole('switch', { name: /Show guides/ })).toHaveAttribute(
        'aria-checked',
        'true',
    );
    await setLength(page, 'Bleed', '20');
    await setLength(page, 'Slug', '40');
    await page.getByRole('switch', { name: /Show crop marks/ }).click();

    const bleed = page.locator('[data-frame="bleed"]');
    const slug = page.locator('[data-frame="slug"]');
    await expect(bleed).toBeVisible();
    await expect(slug).toBeVisible();
    await expect(page.locator('[data-frame="crop-marks"]')).toBeVisible();
    // the frames sit outside the page edge, bleed inside the slug
    const p = await pageRect(editor);
    const b = (await bleed.boundingBox())!;
    const s = (await slug.boundingBox())!;
    expect(b.x).toBeLessThan(p.left);
    expect(s.x).toBeLessThan(b.x);
    expect(s.y + s.height).toBeGreaterThan(b.y + b.height);
    // the fit left room for them: the slug frame is inside the board
    const board = (await page.locator('[data-board-scroll]').boundingBox())!;
    expect(s.y).toBeGreaterThanOrEqual(board.y);
    expect(s.y + s.height).toBeLessThanOrEqual(board.y + board.height + 1);

    // Fit width: the page (+ frames) fills the board width
    const before = (await pageRect(editor)).width;
    await page.getByRole('button', { name: 'Fit width' }).click();
    await expect.poll(async () => (await pageRect(editor)).width).toBeGreaterThan(before * 1.5);
    const after = (await bleed.boundingBox())!;
    expect(Math.abs(after.x - board.x)).toBeLessThan(80); // frames + 16 px gap at the left edge
});

test('Export > Crop marks adds the marks around the page in the file', async ({ editor, page }) => {
    await editor.addShape('Rectangle');
    await editor.openDockTab('Export');
    await expect(page.getByRole('switch', { name: 'Crop marks' })).toHaveCount(0); // page export only
    await page.getByRole('switch', { name: 'Crop to content' }).click();
    await page.getByRole('switch', { name: 'Crop marks' }).click();
    await page.getByRole('combobox', { name: 'Format' }).click();
    await page.getByRole('option', { name: 'SVG' }).click();
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: /^Export SVG$/ }).click(),
    ]);
    const svg = readFileSync(await download.path(), 'utf8');
    // eight trim marks, outside the page (negative scene coordinates on the top / left)
    const marks = svg.match(/<path d="((?:M-?[\d.]+ -?[\d.]+L-?[\d.]+ -?[\d.]+){8})"/);
    expect(marks).not.toBeNull();
    expect(marks![1]).toMatch(/^M-\d/);
});

test('Settings: A4 is one entry; Orientation makes it portrait or landscape', async ({
    editor,
    page,
}) => {
    await page.goto('/setting');
    await page.getByRole('combobox', { name: 'Canvas size' }).click();
    await expect(page.getByRole('option', { name: /A4 (Portrait|Landscape)/ })).toHaveCount(0);
    await page.getByRole('option', { name: /^A4\b/ }).click();
    const preset = () =>
        page.evaluate(
            () => window.__fateboard!.state('selectedPreset') as { width: number; height: number },
        );
    await page.getByRole('radio', { name: 'Portrait' }).click();
    await editor.open();
    await expect.poll(preset).toMatchObject({ width: 794, height: 1123 });
    await page.goto('/setting');
    await page.getByRole('radio', { name: 'Landscape' }).click();
    await editor.open();
    await expect.poll(preset).toMatchObject({ width: 1123, height: 794 });
});

test('Settings: a manga size sets bleed 3 mm and safe-area margins on the page', async ({
    editor,
    page,
}) => {
    await page.goto('/setting');
    await page.getByRole('radio', { name: 'Portrait' }).click();
    await page.getByRole('combobox', { name: 'Canvas size' }).click();
    await page.getByRole('option', { name: /Manga B5/ }).click();
    await editor.open();
    const setup = () =>
        page.evaluate(
            () =>
                window.__fateboard!.state('pageSetup') as {
                    bleed: number;
                    margins: { top: number };
                },
        );
    await expect.poll(async () => Math.round((await setup()).bleed)).toBe(11); // 3 mm
    expect((await setup()).margins.top).toBeGreaterThan(60); // 18.5 mm
    await expect(page.locator('[data-frame="bleed"]')).toBeVisible();
    await expect
        .poll(() => page.evaluate(() => window.__fateboard!.state('selectedPreset')))
        .toMatchObject({ width: 688, height: 971 });
});
