import { test, expect, type Editor } from './fixtures';

const rail = (editor: Editor) =>
    editor.page.getByRole('navigation', { name: 'Editor tools and panels' });

/** The canvas box once it stops moving (closing a side panel animates the layout). */
async function settledBox(editor: Editor) {
    let prev = await editor.canvas.boundingBox();
    for (let i = 0; i < 40; i++) {
        await editor.page.waitForTimeout(50);
        const next = await editor.canvas.boundingBox();
        if (prev && next && prev.x === next.x && prev.y === next.y && prev.width === next.width)
            return next;
        prev = next;
    }
    throw new Error('canvas never settled');
}

/** Screen position of the canvas point at fraction (fx, fy) of the first object's bounding box. */
async function onObject(editor: Editor, fx: number, fy: number) {
    const box = await settledBox(editor);
    const { left, top, width, height, canvasWidth } = await editor.page.evaluate(() =>
        window.__fateboard!.bounds(0),
    );
    const k = box.width / canvasWidth;
    return { x: box.x + (left + width * fx) * k, y: box.y + (top + height * fy) * k };
}

test('Node tool: pick it, click a shape, drag a node, finish; the shape stays selectable', async ({
    editor,
    page,
}) => {
    await editor.addShape('Rectangle');
    await editor.clickEmptyCanvas();

    // (picking the tool closes the Shapes panel, which moves the page: measure after)
    await rail(editor).getByRole('button', { name: 'Node Tool', exact: true }).click();
    const before = await onObject(editor, 0, 0);
    const centre = await onObject(editor, 0.5, 0.5);
    await page.mouse.click(centre.x, centre.y);
    await expect.poll(() => editor.state('nodeMode')).toBe(true);

    // drag the top-left node up-left
    await page.mouse.move(before.x, before.y);
    await page.mouse.down();
    await page.mouse.move(before.x - 40, before.y - 30, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.press('Enter');
    await expect.poll(() => editor.state('nodeMode')).toBe(false);

    const [shape] = await editor.objects();
    expect(shape!.type.toLowerCase()).toBe('path');

    // back to Select: the edited shape can be selected and moved
    await page.keyboard.press('Escape');
    await expect.poll(() => editor.state('activeTool')).toBe('select');
    const inside = await onObject(editor, 0.6, 0.7);
    await page.mouse.click(inside.x, inside.y);
    await expect.poll(async () => (await editor.selection()).length).toBe(1);
});

test('Node tool on a text shape: reshape the outline, the text stays inside', async ({
    editor,
    page,
}) => {
    await editor.addShape('Text Rectangle');
    await editor.clickEmptyCanvas();
    const [before] = await editor.objects();

    await rail(editor).getByRole('button', { name: 'Node Tool', exact: true }).click();
    const corner = await onObject(editor, 0, 0);
    const centre = await onObject(editor, 0.5, 0.5);
    await page.mouse.click(centre.x, centre.y);
    await expect.poll(() => editor.state('nodeMode')).toBe(true);

    await page.mouse.move(corner.x, corner.y);
    await page.mouse.down();
    await page.mouse.move(corner.x - 50, corner.y - 30, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.press('Enter');
    await expect.poll(() => editor.state('nodeMode')).toBe(false);

    const objects = await editor.objects();
    expect(objects).toHaveLength(1);
    expect(objects[0]!.isTextShape).toBe(true);
    expect(objects[0]!.width).toBeGreaterThan(before!.width + 40);
    expect(objects[0]!.height).toBeGreaterThan(before!.height + 20);
});

test('switching: double-click edits nodes, the node bar works, Done / Esc return to Select; the rail follows', async ({
    editor,
    page,
}) => {
    await editor.addShape('Rectangle');
    await editor.clickEmptyCanvas();
    const tool = (name: string) => rail(editor).getByRole('button', { name, exact: true });
    await tool('Select').click(); // also closes the Shapes panel

    // double-click in Select -> node editing with the floating node bar
    const centre = await onObject(editor, 0.5, 0.5);
    await page.mouse.dblclick(centre.x, centre.y);
    await expect.poll(() => editor.state('nodeMode')).toBe(true);
    await expect(tool('Node Tool')).toHaveAttribute('aria-pressed', 'true');

    const bar = page.getByRole('toolbar', { name: 'Node editing' });
    await expect(bar).toBeVisible();
    await bar.getByRole('button', { name: 'Add node' }).click();
    await expect.poll(async () => ((await editor.state('selectedNode')) as any)?.nodeCount).toBe(5);

    await bar.getByRole('button', { name: 'Done' }).click();
    await expect.poll(() => editor.state('activeTool')).toBe('select');
    await expect(tool('Select')).toHaveAttribute('aria-pressed', 'true');
    await expect(bar).toBeHidden();

    // A = node tool, Escape twice = back to Select, and the rail shows it
    await page.keyboard.press('a');
    await expect(tool('Node Tool')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect.poll(() => editor.state('activeTool')).toBe('select');
    await expect(tool('Select')).toHaveAttribute('aria-pressed', 'true');
    await expect(tool('Node Tool')).toHaveAttribute('aria-pressed', 'false');
});
