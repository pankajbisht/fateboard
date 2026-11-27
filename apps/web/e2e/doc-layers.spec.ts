/**
 * Page layers (2026-11-17) in a real browser: real pixels for hide / clip, new shapes on the active layer,
 * layers saved with the board.
 */
import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

type FCanvas = {
    getObjects: () => {
        set: (o: object) => void;
        setCoords: () => void;
        layerId?: string;
    }[];
    viewportTransform: number[];
    getRetinaScaling: () => number;
    renderAll: () => void;
    getContext: () => CanvasRenderingContext2D;
};

/** RGBA of the lower canvas at a scene point. */
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

/** Put object `i` at an exact box with a solid fill and no border. */
const place = (
    page: Page,
    i: number,
    box: { left: number; top: number; w: number; h: number },
    fill: string,
) =>
    page.evaluate(
        ([idx, b, f]) => {
            const c = window.__fateboard!.state('canvas') as FCanvas;
            const o = c.getObjects()[idx as number];
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
        [i, box, fill] as const,
    );

const RED = [255, 0, 0];
const GREEN = [0, 128, 0];

test('hide a layer: its shapes leave the canvas; new shapes go to the active layer', async ({
    editor,
    page,
}) => {
    await editor.addShape('Rectangle');
    await place(page, 0, { left: 100, top: 100, w: 200, h: 200 }, '#ff0000');
    await expect.poll(() => pixelAt(page, 200, 200)).toEqual(RED);

    await editor.openDockTab('Layers');
    const list = page.getByRole('list', { name: 'Page layers' });
    await page.getByRole('button', { name: 'Hide Layer 1' }).click();
    await expect.poll(() => pixelAt(page, 200, 200)).not.toEqual(RED);
    await page.getByRole('button', { name: 'Show Layer 1' }).click();
    await expect.poll(() => pixelAt(page, 200, 200)).toEqual(RED);

    await page.getByRole('button', { name: 'New layer' }).click();
    await expect(list.getByRole('button', { name: /^Layer 2/ })).toHaveAttribute(
        'aria-current',
        'true',
    );
    await editor.addShape('Rectangle');
    const layer2 = (await editor.state<{ id: string }[]>('pageLayers'))[1].id;
    await expect.poll(() => editor.state<string>('activeLayerId')).toBe(layer2); // still Layer 2
    const active = layer2;
    await expect
        .poll(() =>
            page.evaluate(
                () => (window.__fateboard!.state('canvas') as FCanvas).getObjects()[1].layerId,
            ),
        )
        .toBe(active);
});

test('clipping in real pixels, and layers survive a reload', async ({ editor, page }) => {
    await editor.addShape('Rectangle');
    await place(page, 0, { left: 100, top: 100, w: 200, h: 200 }, '#ff0000');
    await editor.openDockTab('Layers');
    await page.getByRole('button', { name: 'New layer' }).click();
    await editor.addShape('Rectangle');
    // half over the red square, half outside it
    await place(page, 1, { left: 200, top: 100, w: 300, h: 200 }, '#008000');
    await expect.poll(() => pixelAt(page, 400, 200)).toEqual(GREEN);

    await editor.openDockTab('Layers');
    await page.getByRole('switch', { name: 'Clip to layer below' }).click();
    await expect.poll(() => pixelAt(page, 250, 200)).toEqual(GREEN); // inside the base: shown
    await expect.poll(() => pixelAt(page, 400, 200)).not.toEqual(GREEN); // outside: clipped away

    await page.getByRole('button', { name: /^Layer 2/ }).dblclick();
    await page.getByRole('textbox', { name: 'Layer name' }).fill('Ink');
    await page.keyboard.press('Enter');
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect
        .poll(() =>
            page.evaluate(() =>
                (window.__fateboard!.state('pageLayers') as { name: string; clip: boolean }[]).map(
                    (l) => `${l.name}${l.clip ? ' (clip)' : ''}`,
                ),
            ),
        )
        .toEqual(['Layer 1', 'Ink (clip)']);
    await expect.poll(() => pixelAt(page, 400, 200)).not.toEqual(GREEN);
});
