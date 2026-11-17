/**
 * Document + comic tools (2026-11-17) in a real browser: a master page drawn under another page with its page
 * number, and comic panels whose Art layer is clipped to the panels (real pixels).
 */
import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

type FCanvas = {
    getObjects: () => { set: (o: object) => void; setCoords: () => void; text?: string }[];
    viewportTransform: number[];
    getRetinaScaling: () => number;
    renderAll: () => void;
    getContext: () => CanvasRenderingContext2D;
};

const pixelAt = (page: Page, x: number, y: number) =>
    page.evaluate(
        ([sx, sy]) => {
            const c = window.__fateboard!.state('canvas') as FCanvas;
            c.renderAll();
            const v = c.viewportTransform;
            const r = c.getRetinaScaling();
            const px = Math.round((sx * v[0] + v[4]) * r);
            const py = Math.round((sy * v[3] + v[5]) * r);
            return Array.from(c.getContext().getImageData(px, py, 1, 1).data).slice(0, 3);
        },
        [x, y],
    );

/** Size and colour the selected object (the shape just added). */
const placeSelected = (
    page: Page,
    box: { left: number; top: number; w: number; h: number },
    fill: string,
) =>
    page.evaluate(
        ([b, f]) => {
            const c = window.__fateboard!.state('canvas') as FCanvas;
            type O = ReturnType<FCanvas['getObjects']>[number];
            const o = (c as unknown as { getActiveObject: () => O }).getActiveObject();
            const { left, top, w, h } = b as { left: number; top: number; w: number; h: number };
            o.set({
                originX: 'left',
                originY: 'top',
                left,
                top,
                width: w,
                height: h,
                scaleX: 1,
                scaleY: 1,
                angle: 0,
                fill: f,
                strokeWidth: 0,
            });
            o.setCoords();
        },
        [box, fill] as const,
    );

const RED = [255, 0, 0];

test('a master page is drawn under the pages that use it, with their page numbers', async ({
    editor,
    page,
}) => {
    await editor.openPanel('Pages');
    await page.getByRole('button', { name: /Page setup/ }).click();
    await page.getByRole('switch', { name: /This page is a master page/ }).click();
    await editor.addShape('Rectangle');
    await placeSelected(page, { left: 100, top: 100, w: 200, h: 120 }, '#ff0000');
    await editor.openPanel('Pages');
    await page.getByRole('button', { name: /Page setup/ }).click(); // the panel was closed: open again
    await page.getByRole('button', { name: 'Insert page number' }).click();

    await page.getByRole('button', { name: 'Add page' }).click();
    await expect.poll(() => editor.state<string>('pageRole')).toBe('page');
    await page.getByRole('combobox', { name: 'Master page' }).click();
    await page.getByRole('option', { name: 'Page 1' }).click();

    // page 2 is empty, but shows the master's red box (not selectable: no objects here)
    await expect.poll(() => pixelAt(page, 200, 160)).toEqual(RED);
    expect((await editor.objects()).length).toBe(0);
    // the master's page number field shows this page's number: 1 (the master is not counted)
    const masterText = await page.evaluate(() => {
        const under = (window.__fateboard!.state('pageUnderlay') as () => { text?: string }[])();
        return under.map((o) => o.text).filter(Boolean);
    });
    expect(masterText).toEqual(['1']);
});

test('comic panels: art on the Art layer stays inside the panels', async ({ editor, page }) => {
    await editor.openPanel('Comic');
    await page.getByRole('button', { name: 'Panel layout 2 columns' }).click();
    await expect
        .poll(() =>
            page.evaluate(() =>
                (window.__fateboard!.state('pageLayers') as { name: string }[]).map((l) => l.name),
            ),
        )
        .toEqual(['Layer 1', 'Comic panels', 'Panel area', 'Art', 'Panel borders']);

    // a red box across the whole page, drawn on the (active) Art layer
    await editor.addShape('Rectangle');
    const size = await page.evaluate(() => [
        window.__fateboard!.state('pageWidth') as number,
        window.__fateboard!.state('pageHeight') as number,
    ]);
    await placeSelected(page, { left: 0, top: 0, w: size[0], h: size[1] }, '#ff0000');
    const midY = size[1] / 2;
    await expect.poll(() => pixelAt(page, size[0] / 4, midY)).toEqual(RED); // inside the left panel
    await expect.poll(() => pixelAt(page, size[0] / 2, midY)).not.toEqual(RED); // the gutter
    await expect.poll(() => pixelAt(page, 10, midY)).not.toEqual(RED); // the margin
});
