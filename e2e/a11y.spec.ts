import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';

/*
 * Accessibility (production readiness P1): no WCAG 2.1 A / AA (+ best-practice landmark) violations axe detects on the
 * main routes, in light and dark mode. Failures print rule id, impact and the offending nodes.
 */
const ROUTES = ['/', '/draw', '/setting', '/help', '/help?topic=shortcuts', '/help?topic=node'];

for (const scheme of ['light', 'dark'] as const) {
    for (const route of ROUTES) {
        test(`${route} has no axe violations (${scheme})`, async ({ page }) => {
            // reduced motion: entrance fades finish at once, so contrast is measured on final colours
            await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
            await page.goto(route);
            if (route === '/draw') await page.waitForFunction(() => !!window.__fateboard?.ready());
            await page.waitForLoadState('networkidle');
            const { violations } = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
                .analyze();
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
