import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';

/*
 * Accessibility (production readiness P1): no WCAG 2.1 A / AA (+ best-practice landmark) violations axe detects on the
 * main routes, in light and dark mode. Failures print rule id, impact and the offending nodes.
 */
const ROUTES = [
    '/',
    '/draw',
    '/draw?tab=animate', // the editor with the bottom timeline open (2026-11-17)
    '/setting',
    '/help',
    '/help?topic=shortcuts',
    '/help?topic=node',
    '/gallery',
    '/gallery/manga-ronin',
];

for (const scheme of ['light', 'dark'] as const) {
    for (const route of ROUTES) {
        test(`${route} has no axe violations (${scheme})`, async ({ page }) => {
            // reduced motion: entrance fades finish at once, so contrast is measured on final colours
            await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
            await page.goto(route);
            if (route.startsWith('/draw'))
                await page.waitForFunction(() => !!window.__fateboard?.ready());
            await page.waitForLoadState('networkidle');
            const scan = () =>
                new AxeBuilder({ page })
                    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
                    .analyze()
                    .then((r) => r.violations);
            const animate = route.includes('tab=animate');
            // four full scans (one per timeline pane): axe walks the whole page each time, which took over 30 s in
            // Firefox on the 2-vCPU CI runner
            test.slow(animate, 'one axe scan per timeline pane');
            // the timeline is lazy, so its page is scanned pane by pane once it is there (a scan before that was thrown away)
            const violations = animate ? ([] as Awaited<ReturnType<typeof scan>>) : await scan();
            if (animate) {
                await expect(
                    page.getByRole('button', { name: 'Keyframe at playhead' }),
                ).toBeVisible();
                const panes = page.getByRole('radiogroup', { name: 'Timeline panes' });
                for (const pane of ['Animate', 'Keyframe', 'View', 'Export']) {
                    await panes.getByRole('radio', { name: pane }).click();
                    for (const v of await scan())
                        if (!violations.some((seen) => seen.id === v.id)) violations.push(v);
                }
            }
            const report = violations.map(
                (v) =>
                    `${v.id} (${v.impact}): ${v.nodes
                        .slice(0, 4)
                        .map((n) => {
                            const d = n.any[0]?.data as
                                | { fgColor?: string; bgColor?: string; contrastRatio?: number }
                                | undefined;
                            const colours = d?.contrastRatio
                                ? ` [${d.fgColor} on ${d.bgColor} = ${d.contrastRatio}]`
                                : '';
                            return n.target.join(' ') + colours;
                        })
                        .join(' | ')}`,
            );
            expect(report).toEqual([]);
        });
    }
}

// BUG-200 (fixed): PanelSection titles were text-ink-subtle (#8a94a6, below AA on the panel); they are text-ink-muted now
test('BUG-200: panel section titles pass AA contrast', async ({ editor, page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await editor.openPanel('Pages');
    const { violations } = await new AxeBuilder({ page })
        .include('section[aria-label="Pages panel"] .text-label')
        .withRules(['color-contrast'])
        .analyze();
    expect(violations.flatMap((v) => v.nodes.map((n) => n.target.join(' ')))).toEqual([]);
});
