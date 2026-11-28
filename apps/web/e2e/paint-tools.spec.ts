/**
 * Paint tools (2026-11-16): layer blur (BUG-220), Paint bucket (G), Lasso (L), Geometry (D: Drafter, Scale, Set square, Protractor, Compass), Spray
 * (Shift + B), the stamp brush library, symmetry + Reflect selection, the colour wheel and deep zoom
 * (BUG-221), with a real mouse and keyboard on the design board.
 */
import { test, expect, type Editor } from './fixtures';

const count = async (editor: Editor) => (await editor.objects()).length;
const tool = (editor: Editor) => editor.state<string>('activeTool');

async function at(editor: Editor) {
    const box = await editor.settledCanvasBox();
    return (fx: number, fy: number) => [box.x + box.width * fx, box.y + box.height * fy] as const;
}

async function drag(
    editor: Editor,
    from: readonly [number, number],
    to: readonly [number, number],
) {
    const { mouse } = editor.page;
    await mouse.move(...from);
    await mouse.down();
    await mouse.move(...to, { steps: 8 });
    await mouse.up();
}

test('Layer blur blurs the object itself and exports as an SVG blur filter', async ({
    editor,
    page,
}) => {
    await editor.addShape('Rectangle');
    await editor.openDockTab('Fill & Shadow');
    const slider = page.getByRole('slider', { name: 'Layer blur' });
    await slider.focus();
    for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowRight');
    await expect
        .poll(() =>
            page.evaluate(
                () => (window.__fateboard!.state('canvas') as any).getActiveObject()?.layerBlur,
            ),
        )
        .toBeGreaterThan(0);
    const svg = await page.evaluate(() => (window.__fateboard!.state('canvas') as any).toSVG());
    expect(svg).toContain('feGaussianBlur');
    // the shadow keeps its own, clearly named blur
    await page.getByRole('switch', { name: 'Shadow' }).click();
    await expect(page.getByRole('slider', { name: 'Shadow blur' })).toBeVisible();
});

test('Geometry › Drafter draws snapped lines and a measured dimension; Escape returns to Select', async ({
    editor,
    page,
}) => {
    const p = await at(editor);
    await page.keyboard.press('d');
    await expect.poll(() => tool(editor)).toBe('geometry');
    await expect(page.getByRole('toolbar', { name: 'Geometry options' })).toBeVisible();
    await drag(editor, p(0.2, 0.3), p(0.6, 0.32)); // snaps to 0°
    await expect.poll(() => count(editor)).toBe(1);
    const line = (await editor.objects())[0];
    expect(line.height).toBeLessThan(3); // horizontal after the snap

    await page.getByRole('combobox', { name: 'Drafter mode' }).click();
    await page.getByRole('option', { name: 'Dimension' }).click();
    await drag(editor, p(0.2, 0.6), p(0.6, 0.6));
    await expect.poll(() => count(editor)).toBe(2);
    expect((await editor.objects())[1].type).toBe('group');

    await page.keyboard.press('Escape');
    await expect.poll(() => tool(editor)).toBe('select');
});

test('Geometry › Protractor draws an angle; Compass a circle and an arc; Escape cancels a stroke', async ({
    editor,
    page,
}) => {
    const p = await at(editor);
    await page.keyboard.press('d');
    const mode = page.getByRole('combobox', { name: 'Geometry mode' });
    await mode.click();
    await page.getByRole('option', { name: 'Protractor' }).click();
    await drag(editor, p(0.3, 0.6), p(0.7, 0.6)); // first arm
    await expect.poll(() => count(editor)).toBe(0); // waits for the second arm
    await page.mouse.move(...p(0.3, 0.2));
    await page.mouse.click(...p(0.3, 0.2)); // second arm, straight up
    await expect.poll(() => count(editor)).toBe(1);
    const angle = (await editor.objects())[0];
    expect(angle.type).toBe('group');

    await mode.click();
    await page.getByRole('option', { name: 'Compass' }).click();
    await drag(editor, p(0.5, 0.5), p(0.6, 0.5));
    await expect.poll(() => count(editor)).toBe(2);
    expect((await editor.objects())[1].type).toBe('circle');

    await page.getByRole('combobox', { name: 'Compass draws' }).click();
    await page.getByRole('option', { name: 'Arc' }).click();
    await drag(editor, p(0.5, 0.5), p(0.6, 0.5));
    await page.keyboard.press('Escape'); // cancels the half-done arc, keeps the tool
    await expect.poll(() => tool(editor)).toBe('geometry');
    await drag(editor, p(0.5, 0.5), p(0.6, 0.5));
    await page.mouse.move(...p(0.5, 0.65));
    await page.mouse.click(...p(0.5, 0.65));
    await expect.poll(() => count(editor)).toBe(3);
    expect((await editor.objects())[2].type).toBe('path');
});

test('Paint bucket fills the area enclosed by drawn lines, under the lines', async ({
    editor,
    page,
}) => {
    const p = await at(editor);
    await page.keyboard.press('d');
    const corners = [p(0.3, 0.3), p(0.6, 0.3), p(0.6, 0.6), p(0.3, 0.6)];
    for (let i = 0; i < 4; i++) await drag(editor, corners[i], corners[(i + 1) % 4]);
    await expect.poll(() => count(editor)).toBe(4);
    await page.waitForTimeout(350); // history is debounced: the lines are one step, the fill the next

    await page.keyboard.press('g');
    await expect.poll(() => tool(editor)).toBe('bucket');
    await page.mouse.click(...p(0.45, 0.45));
    await expect.poll(() => count(editor)).toBe(5);
    const objects = await editor.objects();
    expect(objects[0].type).toBe('path'); // the fill went under the four lines
    expect(objects[0].fill).not.toBeNull();
    await page.waitForTimeout(350); // history is debounced
    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(() => count(editor)).toBe(4);
});

test('Paint bucket recolours a closed shape', async ({ editor, page }) => {
    await editor.addShape('Rectangle');
    const before = (await editor.objects())[0].fill;
    const b = await page.evaluate(() => window.__fateboard!.bounds(0));
    const box = await editor.settledCanvasBox();
    const k = box.width / b.canvasWidth;
    await page.keyboard.press('Escape');
    await page.keyboard.press('g');
    await page.mouse.click(box.x + (b.left + b.width / 2) * k, box.y + (b.top + b.height / 2) * k);
    await expect.poll(async () => (await editor.objects())[0].fill).not.toEqual(before);
    expect(await count(editor)).toBe(1);
});

test('Lasso selects what the loop touches, then Select is back', async ({ editor, page }) => {
    const p = await at(editor);
    await page.keyboard.press('d');
    await drag(editor, p(0.2, 0.2), p(0.3, 0.2));
    await drag(editor, p(0.7, 0.7), p(0.8, 0.7));
    await page.keyboard.press('l');
    await expect.poll(() => tool(editor)).toBe('lasso');
    const { mouse } = page;
    await mouse.move(...p(0.15, 0.15));
    await mouse.down();
    for (const pt of [p(0.4, 0.15), p(0.4, 0.3), p(0.15, 0.3), p(0.15, 0.16)])
        await mouse.move(...pt, { steps: 6 });
    await mouse.up();
    await expect.poll(() => tool(editor)).toBe('select');
    expect((await editor.selection()).length).toBe(1);
});

test('Spray builds up paint while held still; a library brush paints a stamp stroke', async ({
    editor,
    page,
}) => {
    const p = await at(editor);
    await page.keyboard.press('Shift+B');
    await expect.poll(() => tool(editor)).toBe('spray');
    await expect(page.getByRole('toolbar', { name: 'Spray options' })).toBeVisible();
    await page.mouse.move(...p(0.4, 0.4));
    await page.mouse.down();
    await page.waitForTimeout(400); // hold still: the can keeps spraying
    await page.mouse.up();
    await expect.poll(() => count(editor)).toBe(1);
    const spray = await page.evaluate(() => {
        const o = (window.__fateboard!.state('canvas') as any).getObjects()[0];
        return { type: o.type, samples: o.stampPoints.length / 4, brush: o.brushId };
    });
    expect(spray.type).toBe('stampstroke'); // Fabric's runtime type is lower case
    expect(spray.brush).toBe('spray-paint');
    expect(spray.samples).toBeGreaterThan(5); // time samples while still

    await editor.openPanel('Brush');
    const q = await at(editor); // the panel moved the canvas
    await page.getByRole('button', { name: 'Fire & light' }).click();
    await page.getByRole('radio', { name: 'Fire', exact: true }).click();
    await expect.poll(() => editor.state<string>('brush')).toBe('fire-flame');
    await drag(editor, q(0.3, 0.7), q(0.7, 0.7));
    await expect.poll(() => count(editor)).toBe(2);
    expect((await editor.objects())[1].type).toBe('stampstroke');
});

test('Radial symmetry copies each stroke; Reflect selection mirrors a shape', async ({
    editor,
    page,
}) => {
    await editor.openDockTab('Symmetry');
    await page
        .getByRole('group', { name: 'Drawing symmetry' })
        .getByRole('button', { name: 'Radial' })
        .click();
    const p = await at(editor);
    await page.keyboard.press('b');
    await drag(editor, p(0.5, 0.3), p(0.55, 0.2));
    await expect.poll(() => count(editor)).toBe(6); // 1 + 5 copies (6-fold)
    await page
        .getByRole('group', { name: 'Drawing symmetry' })
        .getByRole('button', { name: 'Off' })
        .click();

    await page.keyboard.press('v'); // select all works in the Select tool
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    await expect.poll(() => count(editor)).toBe(0);
    await editor.addShape('Rectangle');
    await page
        .getByRole('group', { name: 'Reflection type' })
        .getByRole('button', { name: 'Left-right' })
        .click();
    await page.getByRole('button', { name: 'Reflect selection' }).click();
    await expect.poll(() => count(editor)).toBe(2);
    expect((await editor.selection()).length).toBe(2);
});

test('Custom color: the Wheel view turns the hue from the keyboard', async ({ editor, page }) => {
    await editor.addShape('Rectangle');
    await page.getByRole('button', { name: 'Custom color' }).click();
    const dialog = page.getByRole('dialog', { name: 'Custom color' });
    await dialog.getByRole('radio', { name: /Wheel/ }).click();
    const ring = dialog.getByRole('slider', { name: 'Hue wheel' });
    await expect(ring).toBeVisible();
    const before = await ring.getAttribute('aria-valuenow');
    await ring.focus();
    await page.keyboard.press('Shift+ArrowRight');
    await expect(ring).not.toHaveAttribute('aria-valuenow', before ?? '');
    await expect(dialog.getByRole('group', { name: 'Harmony on the wheel' })).toBeVisible();
});

test('Deep zoom: 3200 % draws only the visible window, sharp, and clicks still hit objects', async ({
    editor,
    page,
}) => {
    await editor.addShape('Rectangle');
    await page.keyboard.press('Escape');
    await page.evaluate(() => (window.__fateboard!.state('setZoom') as (z: number) => void)(32));
    await expect.poll(() => editor.state<number>('zoom')).toBe(32);
    const buffer = await page.evaluate(() => {
        const c = window.__fateboard!.state('canvas') as any;
        return {
            el: c.lowerCanvasEl.width,
            page: c.getWidth(),
            window: !!c.__fbWindow,
            ratio: c.getRetinaScaling(),
        };
    });
    expect(buffer.window).toBe(true);
    expect(buffer.ratio).toBeGreaterThan(8); // full screen density at 3200 %
    expect(buffer.el).toBeLessThan(buffer.page * buffer.ratio); // not the whole page

    // scroll the rectangle's centre into view and click it: pointer maths include the window
    const target = await page.evaluate(() => {
        const c = window.__fateboard!.state('canvas') as any;
        const o = c.getObjects().find((x: any) => !x.excludeFromExport);
        const center = o.getCenterPoint();
        const scroller = c.wrapperEl.closest('[data-board-scroll]') as HTMLElement;
        const host = c.wrapperEl.parentElement.getBoundingClientRect();
        const s = (window.__fateboard!.state('scale') as number) * 32;
        scroller.scrollBy(
            host.left +
                center.x * s -
                (scroller.getBoundingClientRect().left + scroller.clientWidth / 2),
            host.top +
                center.y * s -
                (scroller.getBoundingClientRect().top + scroller.clientHeight / 2),
        );
        const r = scroller.getBoundingClientRect();
        return { x: r.left + scroller.clientWidth / 2, y: r.top + scroller.clientHeight / 2 };
    });
    await page.waitForTimeout(100); // the window follows the scroll on the next frame
    await page.mouse.click(target.x, target.y);
    await expect.poll(async () => (await editor.selection()).length).toBe(1);

    await page.evaluate(() => (window.__fateboard!.state('setZoom') as (z: number) => void)(1));
    await expect
        .poll(() => page.evaluate(() => !!(window.__fateboard!.state('canvas') as any).__fbWindow))
        .toBe(false);
});

test('Spray in Copy mode sprays the selection along a drag as one group; one undo removes it', async ({
    editor,
    page,
}) => {
    await editor.addShape('Rectangle');
    expect((await editor.selection()).length).toBe(1);
    await page.keyboard.press('Shift+B');
    await expect.poll(() => tool(editor)).toBe('spray');
    const bar = page.getByRole('toolbar', { name: 'Spray options' });
    await bar.getByRole('combobox', { name: 'Spray mode' }).click();
    await page.getByRole('option', { name: /Copy/ }).click();
    await expect.poll(() => tool(editor)).toBe('copySpray');
    await expect(bar.getByRole('slider', { name: 'Spread' })).toBeVisible();
    const p = await at(editor);
    await drag(editor, p(0.1, 0.85), p(0.9, 0.85));
    await expect.poll(() => count(editor)).toBe(2);
    expect((await editor.objects())[1].type).toBe('group');
    expect(await tool(editor)).toBe('copySpray'); // keeps spraying
    await page.keyboard.press('Escape');
    await expect.poll(() => tool(editor)).toBe('select');
    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(() => count(editor)).toBe(1);
    // Spray reopens in the mode used last
    await page.keyboard.press('Shift+B');
    await expect.poll(() => tool(editor)).toBe('copySpray');
});

test('Spray in Copy mode without a selection: click a shape to pick it, then drag to spray it', async ({
    editor,
    page,
}) => {
    await editor.addShape('Rectangle');
    await editor.clickEmptyCanvas(); // nothing selected
    expect((await editor.selection()).length).toBe(0);
    await page.keyboard.press('Shift+B');
    const bar = page.getByRole('toolbar', { name: 'Spray options' });
    await bar.getByRole('combobox', { name: 'Spray mode' }).click();
    await page.getByRole('option', { name: /Copy/ }).click();
    await expect(bar.getByRole('status')).toHaveText('Click an object to spray copies of it');
    // measured after the switch: a tool change closes the Shapes panel, the board moves (BUG-286)
    const box = await editor.settledCanvasBox();
    const b = await page.evaluate(() => window.__fateboard!.bounds(0));
    const k = box.width / b.canvasWidth;
    await page.mouse.click(box.x + (b.left + b.width / 2) * k, box.y + (b.top + b.height / 2) * k);
    await expect(bar.getByRole('status')).toContainText('Spraying');
    expect(await count(editor)).toBe(1); // picking adds nothing
    const p = await at(editor);
    const [cx, cy] = p(0.7, 0.8);
    await page.mouse.click(cx, cy); // a click places one copy, centred under the pointer
    await expect.poll(() => count(editor)).toBe(2);
    const c = await page.evaluate(() => window.__fateboard!.bounds(1));
    expect(Math.abs(box.x + (c.left + c.width / 2) * k - cx)).toBeLessThan(3);
    expect(Math.abs(box.y + (c.top + c.height / 2) * k - cy)).toBeLessThan(3);
    await drag(editor, p(0.1, 0.9), p(0.9, 0.9));
    await expect.poll(() => count(editor)).toBe(3);
});
