import { test, expect } from './fixtures';

/*
 * Known open bugs, written as EXPECTED FAILURES (test.fail). They pass while the bug exists and
 * turn red the day it is fixed, so the marker gets removed together with the fix.
 */

// BUG-001 / BUG-090 (undo) fixed: covered by e2e/undo.spec.ts
// BUG-004 (pages lost on reload) fixed: covered by e2e/persistence.spec.ts

test.fail('Ctrl/⌘+B makes text bold while editing (BUG-096)', async ({ editor, page }) => {
    await editor.openPanel('Text');
    await page.getByRole('button', { name: /Add body text/ }).click(); // starts not bold
    await page.keyboard.press('ControlOrMeta+b');
    await expect
        .poll(async () => (await editor.objects()).at(-1)!.fontWeight, { timeout: 2000 })
        .toBe('bold');
});

test.fail(
    'the Delete key removes the selected shape (BUG-103: only Backspace is mapped)',
    async ({ editor, page }) => {
        await editor.addShape('Rectangle');
        await page.keyboard.press('Delete');
        await expect.poll(async () => (await editor.objects()).length, { timeout: 2000 }).toBe(0);
    },
);
