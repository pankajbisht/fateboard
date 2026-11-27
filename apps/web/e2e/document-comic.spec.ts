/**
 * Document + comic tools (2026-11-17) in a real browser: a master page drawn under another page with its page
 * number, and comic panels whose Art layer is clipped to the panels (real pixels).
 */
import { expect, test, type Editor } from './fixtures';
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

/** page point → screen point (for real mouse drags), like the other specs: the settled canvas box */
const toScreen = async (editor: Editor, x: number, y: number) => {
    const box = await editor.settledCanvasBox();
    const [cx, cy, cw] = await editor.page.evaluate(
        ([sx, sy]) => {
            const c = window.__fateboard!.state('canvas') as FCanvas & { getWidth: () => number };
            const v = c.viewportTransform;
            return [sx * v[0] + v[4], sy * v[3] + v[5], c.getWidth()];
        },
        [x, y],
    );
    const k = box.width / cw;
    return { x: box.x + cx * k, y: box.y + cy * k };
};

const drag = async (page: Page, from: { x: number; y: number }, dx: number, dy: number) => {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (let i = 1; i <= 5; i++)
        await page.mouse.move(from.x + (dx * i) / 5, from.y + (dy * i) / 5);
    await page.mouse.up();
};

test('a scene filled into a panel shows only in that panel, also after a drag; panels stay put', async ({
    editor,
    page,
}) => {
    await editor.openPanel('Comic');
    await page.getByRole('button', { name: 'Panel layout 2 columns' }).click();
    const size = await page.evaluate(() => [
        window.__fateboard!.state('pageWidth') as number,
        window.__fateboard!.state('pageHeight') as number,
    ]);
    const [w, h] = size;
    // a big red "scene" over the left panel (and well into the right one)
    await editor.addShape('Rectangle');
    await placeSelected(page, { left: 0, top: 0, w: w * 0.7, h }, '#ff0000');
    await editor.openPanel('Comic');
    await page.getByRole('button', { name: 'Fill panel' }).click();
    const midY = h / 2;
    await expect.poll(() => pixelAt(page, w / 4, midY)).toEqual(RED); // its panel
    await expect.poll(() => pixelAt(page, (w * 3) / 4, midY)).not.toEqual(RED); // the next panel

    // dragged right inside its panel (the scene moves, not the panel over it): still cut to it
    const sceneLeft = () =>
        page.evaluate(() => {
            const c = window.__fateboard!.state('canvas') as {
                getObjects: () => { fill?: unknown; left: number }[];
            };
            return c.getObjects().find((o) => o.fill === '#ff0000')!.left;
        });
    const was = await sceneLeft();
    await drag(page, await toScreen(editor, w / 4, midY), 40, 0);
    await expect.poll(sceneLeft).toBeGreaterThan(was + 20);
    await expect.poll(() => pixelAt(page, w / 4, midY)).toEqual(RED);
    await expect.poll(() => pixelAt(page, (w * 3) / 4, midY)).not.toEqual(RED);

    // a locked panel frame does not move when dragged by its border
    const frameLeft = () =>
        page.evaluate(() => {
            const c = window.__fateboard!.state('canvas') as {
                getObjects: () => { comicPanel?: boolean; left: number }[];
            };
            return c
                .getObjects()
                .filter((o) => o.comicPanel)
                .map((o) => Math.round(o.left));
        });
    const before = await frameLeft();
    const edge = await page.evaluate(() => {
        const c = window.__fateboard!.state('canvas') as {
            getObjects: () => {
                comicPanel?: boolean;
                getBoundingRect: () => { left: number; top: number; height: number };
            }[];
        };
        const f = c
            .getObjects()
            .filter((o) => o.comicPanel)[1]
            .getBoundingRect();
        return { x: f.left + 1, y: f.top + f.height / 2 };
    });
    await drag(page, await toScreen(editor, edge.x, edge.y), 60, 30);
    expect(await frameLeft()).toEqual(before);
});
