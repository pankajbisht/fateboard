import { test, expect, type Editor } from './fixtures';

/*
 * Must-have editing features, each checked through the real UI AND with undo / redo:
 * duplicate, copy + paste, group / ungroup, lock, layer order, delete, freehand drawing.
 */
const count = async (editor: Editor) => (await editor.objects()).length;
const settle = (editor: Editor) => editor.page.waitForTimeout(350);
const key = (editor: Editor, combo: string) => editor.page.keyboard.press(combo);

/** The canvas box once it stops moving (opening / closing a side panel animates the layout). */
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

/** Click object `i` (undo / redo leave nothing selected, like design tools). */
async function clickObject(editor: Editor, i: number) {
    const box = (await editor.canvas.boundingBox())!;
    const b = await editor.page.evaluate((n) => window.__fateboard!.bounds(n), i);
    const k = box.width / b.canvasWidth;
    await editor.page.mouse.click(
        box.x + (b.left + b.width / 2) * k,
        box.y + (b.top + b.height / 2) * k,
    );
}

async function undoRedoRoundTrip(editor: Editor, before: number, after: number) {
    await settle(editor);
    await key(editor, 'ControlOrMeta+z');
    await expect.poll(() => count(editor)).toBe(before);
    await key(editor, 'ControlOrMeta+Shift+z');
    await expect.poll(() => count(editor)).toBe(after);
}

test.describe('core editing', () => {
    test('duplicate (⌘D) and copy + paste (⌘C ⌘V), each undoable', async ({ editor }) => {
        await editor.addShape('Rectangle');
        await settle(editor);
        await key(editor, 'ControlOrMeta+d');
        await expect.poll(() => count(editor)).toBe(2);
        await undoRedoRoundTrip(editor, 1, 2);

        await clickObject(editor, 0);
        await key(editor, 'ControlOrMeta+c');
        await key(editor, 'ControlOrMeta+v');
        await expect.poll(() => count(editor)).toBe(3);
        await undoRedoRoundTrip(editor, 2, 3);
    });

    test('group (⌘G) and ungroup (⌘⇧U), each undoable', async ({ editor, page }) => {
        await editor.addShape('Rectangle');
        await editor.addShape('Circle');
        await settle(editor);
        // select both: drag a box around everything
        const box = (await editor.canvas.boundingBox())!;
        await page.mouse.move(box.x + 4, box.y + 4);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width - 4, box.y + box.height - 4, { steps: 8 });
        await page.mouse.up();
        await expect.poll(async () => (await editor.selection()).length).toBe(2);

        await key(editor, 'ControlOrMeta+g');
        await expect.poll(() => count(editor)).toBe(1);
        await undoRedoRoundTrip(editor, 2, 1);

        await editor.canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
        await key(editor, 'ControlOrMeta+Shift+u');
        await expect.poll(() => count(editor)).toBe(2);
        await undoRedoRoundTrip(editor, 1, 2);
    });

    test('delete (⌫) is undoable', async ({ editor }) => {
        await editor.addShape('Rectangle');
        await settle(editor);
        await key(editor, 'Backspace');
        await expect.poll(() => count(editor)).toBe(0);
        await undoRedoRoundTrip(editor, 1, 0);
    });

    test('freehand drawing adds a stroke; undo removes it', async ({ editor, page }) => {
        await editor.openPanel('Draw');
        const box = await settledBox(editor); // opening the panel animates the layout
        await page.mouse.move(box.x + 60, box.y + 60);
        await page.mouse.down();
        for (let i = 1; i <= 12; i++)
            await page.mouse.move(box.x + 60 + i * 12, box.y + 60 + (i % 2) * 20);
        await page.mouse.up();
        await expect.poll(() => count(editor)).toBe(1);
        await undoRedoRoundTrip(editor, 0, 1);
    });

    test('lock (⌘L) and layer order are recorded', async ({ editor, page }) => {
        await editor.addShape('Rectangle');
        await editor.addShape('Circle'); // on top, selected
        await settle(editor);
        await page
            .getByRole('button', { name: /send to back/i })
            .first()
            .click();
        await expect
            .poll(async () => (await editor.objects())[0]!.type.toLowerCase())
            .toBe('circle');
        await settle(editor);
        await key(editor, 'ControlOrMeta+z');
        await expect.poll(async () => (await editor.objects())[0]!.type.toLowerCase()).toBe('rect');

        await clickObject(editor, 0);
        await key(editor, 'ControlOrMeta+l');
        await expect
            .poll(() =>
                page.evaluate(
                    () => (window.__fateboard!.state('canvas') as any).getActiveObject()?._locked,
                ),
            )
            .toBe(true);
    });
});
