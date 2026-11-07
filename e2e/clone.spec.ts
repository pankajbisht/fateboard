import { test, expect, type Editor } from './fixtures';

const settle = (editor: Editor) => editor.page.waitForTimeout(350);
type Item = { x: number; y: number; fill: string; link: string | null };
const read = (editor: Editor): Promise<Item[]> =>
    editor.page.evaluate(() => {
        const canvas: any = window.__fateboard!.state('canvas');
        return canvas
            .getObjects()
            .filter((o: any) => !o.excludeFromExport)
            .map((o: any) => {
                const c = o.getCenterPoint();
                return {
                    x: Math.round(c.x),
                    y: Math.round(c.y),
                    fill: o.fill,
                    link: o.linkId ?? null,
                };
            });
    });

async function clickObject(editor: Editor, i: number, button: 'left' | 'right' = 'left') {
    const box = (await editor.canvas.boundingBox())!;
    const b = await editor.page.evaluate((n) => window.__fateboard!.bounds(n), i);
    const k = box.width / b.canvasWidth;
    await editor.page.mouse.click(
        box.x + (b.left + b.width / 2) * k,
        box.y + (b.top + b.height / 2) * k,
        {
            button,
        },
    );
}

async function dragObject(editor: Editor, i: number, dx: number) {
    const box = (await editor.canvas.boundingBox())!;
    const b = await editor.page.evaluate((n) => window.__fateboard!.bounds(n), i);
    const k = box.width / b.canvasWidth;
    const x = box.x + (b.left + b.width / 2) * k;
    const y = box.y + (b.top + b.height / 2) * k;
    await editor.page.mouse.move(x, y);
    await editor.page.mouse.down();
    await editor.page.mouse.move(x + dx, y, { steps: 6 });
    await editor.page.mouse.up();
}

test.describe('duplicate and linked clones', () => {
    test('⌘D duplicates exactly on top of the original, as an independent copy', async ({
        editor,
        page,
    }) => {
        await editor.addShape('Rectangle');
        await settle(editor);
        await page.keyboard.press('ControlOrMeta+d');
        await expect.poll(async () => (await read(editor)).length).toBe(2);
        const [a, b] = await read(editor);
        expect(b!.x).toBe(a!.x);
        expect(b!.y).toBe(a!.y);
        expect(b!.link).toBeNull();
    });

    test('⌥D clone is linked: recolor either copy and both change; undo / redo keep them together', async ({
        editor,
        page,
    }) => {
        await editor.addShape('Rectangle');
        await settle(editor);
        await page.keyboard.press('Alt+d');
        await expect.poll(async () => (await read(editor)).length).toBe(2);
        await dragObject(editor, 1, 220);
        await settle(editor);

        await page
            .getByRole('button', { name: /^Red 500/ })
            .first()
            .click(); // the clone is selected
        await expect
            .poll(async () => (await read(editor)).map((o) => o.fill))
            .toEqual(['#fb2c36', '#fb2c36']);
        const [a, b] = await read(editor);
        expect(b!.link).toBe(a!.link);
        expect(b!.x).not.toBe(a!.x); // each keeps its own place

        await settle(editor);
        await page.keyboard.press('ControlOrMeta+z');
        await expect
            .poll(async () => new Set((await read(editor)).map((o) => o.fill)).size)
            .toBe(1);
        expect((await read(editor))[0]!.fill).not.toBe('#fb2c36');
        await page.keyboard.press('ControlOrMeta+Shift+z');
        await expect
            .poll(async () => (await read(editor)).map((o) => o.fill))
            .toEqual(['#fb2c36', '#fb2c36']);
    });

    test('right-click: Unlink clone makes the copy independent', async ({ editor, page }) => {
        await editor.addShape('Rectangle');
        await settle(editor);
        await page.keyboard.press('Alt+d');
        await expect.poll(async () => (await read(editor)).length).toBe(2);
        await dragObject(editor, 1, 220);

        await clickObject(editor, 1, 'right');
        await expect(page.getByRole('button', { name: /Select linked copies/ })).toBeVisible();
        await page.getByRole('button', { name: /Unlink clone/ }).click();
        await expect
            .poll(async () => (await read(editor)).every((o) => o.link === null))
            .toBe(true);

        await clickObject(editor, 1);
        await page
            .getByRole('button', { name: /^Blue 500/ })
            .first()
            .click();
        await expect.poll(async () => (await read(editor)).map((o) => o.fill)[1]).toBe('#2b7fff');
        expect((await read(editor))[0]!.fill).not.toBe('#2b7fff');
    });

    test('copy + paste still pastes an offset, independent copy', async ({ editor, page }) => {
        await editor.addShape('Rectangle');
        await settle(editor);
        await page.keyboard.press('ControlOrMeta+c');
        await page.keyboard.press('ControlOrMeta+v');
        await expect.poll(async () => (await read(editor)).length).toBe(2);
        const [a, b] = await read(editor);
        expect(b!.x - a!.x).toBe(12);
        expect(b!.link).toBeNull();
    });
});
