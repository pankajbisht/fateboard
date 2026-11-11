/**
 * Data safety (BUG-154, BUG-155, BUG-156): a file that cannot be read never replaces the board, a
 * new board has a working history, and undo history shares one copy of a photo.
 */
import { test, expect, type Editor } from './fixtures';
import type { Page } from '@playwright/test';

const count = async (editor: Editor) => (await editor.objects()).length;
const settle = (page: Page) => page.waitForTimeout(350); // history is debounced

const openFile = async (page: Page, file: { name: string; mimeType: string; buffer: Buffer }) => {
    const [chooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: 'Open Board' }).first().click(),
    ]);
    await chooser.setFiles(file);
};

test('New board: the first change can be undone (BUG-156)', async ({ editor, page }) => {
    await editor.addShape('Rectangle');
    await page.getByRole('button', { name: 'Create New Board' }).first().click();
    await page.getByRole('button', { name: 'Clear board' }).click();
    await expect.poll(() => count(editor)).toBe(0);

    const undo = page.getByRole('button', { name: 'Undo' }).first();
    await expect(undo).toBeDisabled();
    await editor.addShape('Circle');
    await settle(page);
    await expect(undo).toBeEnabled();

    await undo.click();
    await expect.poll(() => count(editor)).toBe(0);
});

test('a project file with a page that cannot be read does not replace the board (BUG-154)', async ({
    editor,
    page,
    consoleErrors,
}) => {
    await editor.addShape('Rectangle');
    const project = {
        app: 'fateboard',
        version: 1,
        pages: [
            { id: 'p1', name: 'From the future', canvasJSON: { objects: [{ type: 'hologram' }] } },
        ],
    };
    await openFile(page, {
        name: 'future.fateboard',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(project)),
    });

    const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
    await expect(dialog.getByText("Can't open project")).toBeVisible();
    await dialog.getByRole('button', { name: 'OK' }).click();

    // the board is as it was, on screen and in the autosave
    expect((await editor.objects()).map((o) => o.type)).toEqual(['rect']);
    expect(
        await page.evaluate(() => (window.__fateboard!.state('pages') as unknown[]).length),
    ).toBe(1);
    await page.waitForTimeout(1500); // autosave debounce
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect.poll(async () => (await editor.objects()).map((o) => o.type)).toEqual(['rect']);

    // the failed load is logged once per try; nothing else may be logged
    expect(consoleErrors.every((text) => text.includes('[pages] failed to load page'))).toBe(true);
    consoleErrors.length = 0;
});

test('undo history keeps one copy of a photo, and undo brings the photo back whole (BUG-155)', async ({
    editor,
    page,
}) => {
    // a noisy PNG, so the file is big enough to matter
    const dataUrl = await page.evaluate(() => {
        const c = document.createElement('canvas');
        c.width = c.height = 160;
        const ctx = c.getContext('2d')!;
        const img = ctx.createImageData(160, 160);
        for (let i = 0; i < img.data.length; i++) img.data[i] = (i * 2654435761) >>> 24;
        ctx.putImageData(img, 0, 0);
        return c.toDataURL('image/png');
    });
    await openFile(page, {
        name: 'photo.png',
        mimeType: 'image/png',
        buffer: Buffer.from(dataUrl.split(',')[1], 'base64'),
    });
    await expect.poll(() => count(editor)).toBe(1);
    await settle(page);
    const srcLength = await page.evaluate(
        () => (window.__fateboard!.state('canvas') as any).getObjects()[0].getSrc().length,
    );
    expect(srcLength).toBeGreaterThan(20_000);

    for (const shape of ['Rectangle', 'Circle', 'Rectangle', 'Circle']) {
        await editor.addShape(shape);
        await settle(page);
    }
    const history = await page.evaluate(() => {
        const stack = window.__fateboard!.state('undoStack') as string[];
        return { steps: stack.length, chars: stack.reduce((n, s) => n + s.length, 0) };
    });
    expect(history.steps).toBeGreaterThanOrEqual(5);
    expect(history.chars).toBeLessThan(srcLength);

    // back to the photo alone: it is still the whole picture
    for (let i = 0; i < 4; i++) {
        await page.keyboard.press('ControlOrMeta+z');
        await expect.poll(() => count(editor)).toBe(4 - i);
    }
    const restored = await page.evaluate(() => {
        const image = (window.__fateboard!.state('canvas') as any).getObjects()[0];
        return { type: image.type, length: image.getSrc().length, width: image.width };
    });
    expect(restored).toEqual({ type: 'image', length: srcLength, width: 160 });
});

// BUG-162: a failed autosave is shown to the user once, with a way to keep a copy
test('when the browser refuses to save, the user is told once', async ({
    editor,
    page,
    consoleErrors,
}) => {
    await page.evaluate(() => {
        IDBObjectStore.prototype.put = () => {
            throw new DOMException('storage is full', 'QuotaExceededError');
        };
    });
    await editor.addShape('Rectangle');
    const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
    await expect(dialog.getByText("Your board isn't being saved")).toBeVisible();
    await dialog.getByRole('button', { name: 'Not now' }).click();

    await editor.addShape('Circle');
    await page.waitForTimeout(1500); // a second failed autosave: no second dialog
    await expect(dialog).toHaveCount(0);

    expect(consoleErrors.every((t) => t.includes('[canvas] failed to save the project'))).toBe(
        true,
    );
    consoleErrors.length = 0;
});

// BUG-173: a saved board that cannot be READ at startup is never written over
test('a saved board the browser cannot read is kept, not replaced by the empty board', async ({
    editor,
    page,
    consoleErrors,
}) => {
    await page.addInitScript(() => {
        if (sessionStorage.getItem('e2e-fail-reads') !== '1') return;
        IDBObjectStore.prototype.get = () => {
            throw new DOMException('disk error', 'UnknownError');
        };
    });
    await editor.addShape('Rectangle');
    await page.waitForTimeout(1500); // autosave debounce

    await page.evaluate(() => sessionStorage.setItem('e2e-fail-reads', '1'));
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
    await expect(dialog.getByText("Your saved board couldn't be read")).toBeVisible();
    await dialog.getByRole('button', { name: 'OK' }).click();
    await editor.addShape('Circle');
    await page.waitForTimeout(1500); // an autosave would happen here

    await page.evaluate(() => sessionStorage.removeItem('e2e-fail-reads'));
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect.poll(async () => (await editor.objects()).map((o) => o.type)).toEqual(['rect']);

    expect(
        consoleErrors.every((t) => t.includes('[canvas] the saved board could not be read')),
    ).toBe(true);
    consoleErrors.length = 0;
});
