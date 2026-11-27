/*
 * Known open bugs, written as EXPECTED FAILURES (test.fail). They pass while the bug exists and
 * turn red the day it is fixed, so the marker gets removed together with the fix.
 *
 * Fixed and moved to regular specs:
 * BUG-001 / BUG-090 (undo) → undo.spec.ts · BUG-004 (pages lost on reload) → persistence.spec.ts ·
 * BUG-096 (⌘B / ⌘I / ⌘U) and BUG-103 (Delete key) → keyboard.spec.ts · BUG-200 (panel section title contrast) →
 * a11y.spec.ts
 */
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';

const contrastOf = async (page: import('@playwright/test').Page, selector: string) => {
    const { violations } = await new AxeBuilder({ page })
        .include(selector)
        .withRules(['color-contrast'])
        .analyze();
    return violations.flatMap((v) => v.nodes.map((n) => n.target.join(' ')));
};

test.fail(
    'BUG-201: danger-outline button text passes AA contrast in dark mode',
    async ({ editor, page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto('/setting');
        await page.getByRole('radio', { name: 'Dark' }).click();
        await editor.open();
        await editor.openDockTab('Pages');
        expect(await contrastOf(page, '[data-testid="dock-panel"] .text-danger')).toEqual([]);
    },
);
