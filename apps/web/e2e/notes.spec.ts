/**
 * Notes (2026-11-17) in a real browser: the Note tool (N) drops a pin, the pop-over edits it, undo / redo and
 * a reload keep it, the Notes panel finds and resolves it, a pin on an object follows the object, and a free
 * pin can be dragged.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Editor } from './fixtures';

type Note = { id: string; x: number; y: number; objectId: string | null; text: string };
const notes = (editor: Editor) => editor.state<Note[]>('pageNotes');

/** Client px of a scene point on the (identity-viewport) design board. */
async function clientOf(editor: Editor, x: number, y: number) {
    const r = await editor.page.evaluate(() => window.__fateboard!.pageRect());
    const w = await editor.page.evaluate(() => window.__fateboard!.bounds(0).canvasWidth);
    const k = r!.width / w;
    return { x: r!.left + x * k, y: r!.top + y * k };
}

async function dropNote(editor: Editor, at: { x: number; y: number }, text: string) {
    await editor.page.keyboard.press('n');
    await expect.poll(() => editor.state('activeTool')).toBe('note');
    await editor.page.mouse.click(at.x, at.y);
    const field = editor.page.getByRole('textbox', { name: 'Note text' });
    await expect(field).toBeFocused();
    await field.fill(text);
    await field.press('Escape');
    await expect(editor.page.getByRole('dialog', { name: /^Note \d+$/ })).toHaveCount(0);
}

test('N drops a note; it survives undo / redo and a reload; the panel finds and resolves it', async ({
    editor,
    page,
}) => {
    await editor.addShape('Rectangle'); // bounds(0) needs an object; the note goes on empty board
    await editor.clickEmptyCanvas();
    const box = await editor.settledCanvasBox();
    await dropNote(editor, { x: box.x + 40, y: box.y + box.height - 40 }, 'Check the margin');

    const pin = page.getByRole('button', { name: 'Note 1: Check the margin' });
    await expect(pin).toBeVisible();

    // the note is one undo step
    await page.keyboard.press('ControlOrMeta+z');
    await expect(pin).toHaveCount(0);
    await page.keyboard.press('ControlOrMeta+Shift+z');
    await expect(pin).toBeVisible();

    await page.waitForTimeout(1500); // autosave debounce (same as persistence.spec)
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect(pin).toBeVisible();

    await editor.openPanel('Notes');
    const list = page.getByRole('list', { name: 'Notes' });
    await expect(list.getByRole('button', { name: /Check the margin/ })).toBeVisible();
    await page.getByRole('textbox', { name: 'Search notes' }).fill('nothing like it');
    await expect(page.getByText('No notes match')).toBeVisible();
    await page.getByRole('textbox', { name: 'Search notes' }).fill('');
    await page.getByRole('button', { name: 'Resolve note 1' }).click();
    await expect(pin).toHaveCount(0); // resolved pins hide under the Open filter
    await page.getByRole('radio', { name: 'Resolved' }).click();
    await expect(
        page.getByRole('button', { name: 'Note 1: Check the margin (resolved)' }),
    ).toBeVisible();
});

test('a note on an object follows it; a free pin can be dragged', async ({ editor, page }) => {
    await editor.addShape('Rectangle');
    const b = await page.evaluate(() => window.__fateboard!.bounds(0));
    const centre = await clientOf(editor, b.left + b.width / 2, b.top + b.height / 2);
    await dropNote(editor, centre, 'Make it red');
    const [linked] = await notes(editor);
    expect(linked!.objectId).toBeTruthy();

    const pin = page.getByRole('button', { name: 'Note 1: Make it red' });
    const before = (await pin.boundingBox())!;
    await page.evaluate(() => {
        type O = { left: number; set: (o: object) => void; setCoords: () => void };
        const c = window.__fateboard!.state('canvas') as {
            getObjects: () => O[];
            requestRenderAll: () => void;
        };
        const o = c.getObjects()[0]!;
        o.set({ left: o.left + 100 });
        o.setCoords();
        c.requestRenderAll();
    });
    const scale = (await clientOf(editor, 100, 0)).x - (await clientOf(editor, 0, 0)).x;
    // pins sit on whole pixels: the move matches the object's to within 1 px
    await expect
        .poll(async () => Math.abs((await pin.boundingBox())!.x - before.x - scale))
        .toBeLessThanOrEqual(1);

    // a free note on empty board (the Note tool is still on), dragged 60 px right
    const box = await editor.settledCanvasBox();
    await dropNote(editor, { x: box.x + 40, y: box.y + box.height - 40 }, 'Free');
    const free = page.getByRole('button', { name: 'Note 2: Free' });
    // measured with the pointer off the pin: a hovered pin is scaled to 110% about its centre, so its box starts
    // 1.4 px further left (failed on CI Firefox by exactly that when the hover had applied at one measurement only)
    const away = async () => page.mouse.move(box.x + box.width / 2, box.y + 10);
    await away();
    const start = (await free.boundingBox())!;
    await page.mouse.move(start.x + 10, start.y + 10);
    await page.mouse.down();
    await page.mouse.move(start.x + 40, start.y + 10, { steps: 4 });
    await page.mouse.move(start.x + 70, start.y + 10, { steps: 4 });
    await page.mouse.up();
    await away();
    // pins sit on whole pixels (useNotePins rounds): a 60 px drag lands within 1 px of it; exactly 60
    // failed on CI Firefox (61) when the board's offset was a fraction of a pixel
    await expect
        .poll(async () => Math.abs((await free.boundingBox())!.x - start.x - 60))
        .toBeLessThanOrEqual(1);
    await expect(page.getByRole('dialog', { name: 'Note 2' })).toHaveCount(0); // a drag does not open it
});

for (const scheme of ['light', 'dark'] as const) {
    test(`the Notes panel, a pin and its pop-over have no axe violations (${scheme})`, async ({
        editor,
        page,
    }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        if (scheme === 'dark') {
            // the app default is Light (not System): switch the way a user does
            await page.goto('/setting');
            await page.getByRole('radio', { name: 'Dark' }).click();
            await editor.open();
            await expect(page.locator('html')).toHaveClass(/\bdark\b/);
        }
        await editor.openPanel('Notes');
        const box = await editor.settledCanvasBox();
        await dropNote(editor, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, 'Axe me');
        await page.getByRole('button', { name: 'Note 1: Axe me' }).click();
        const dialog = page.getByRole('dialog', { name: 'Note 1' });
        await dialog.getByRole('textbox', { name: 'Add checklist item' }).fill('An item');
        await dialog.getByRole('textbox', { name: 'Add checklist item' }).press('Enter');
        await expect(dialog.getByRole('checkbox', { name: 'An item' })).toBeVisible();
        const { violations } = await new AxeBuilder({ page })
            .include('[data-note-pins]')
            .include('section[aria-label="Notes panel"]')
            // shared styles, open in every panel: BUG-200 section titles, BUG-201 danger
            // text in dark mode (expected failures in known-bugs.spec.ts)
            .exclude('section[aria-label="Notes panel"] .text-label')
            .exclude('section[aria-label="Notes panel"] .text-danger')
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
            .analyze();
        expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
    });
}
