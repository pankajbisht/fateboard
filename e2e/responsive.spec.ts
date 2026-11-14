import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

/*
 * BUG-215: the full editor on every screen, from a phone to a large desktop, with nothing cut off
 * or covered. Every visible button must be on screen (or inside a strip that scrolls to it) and be
 * the element under its own centre (nothing overlaps it).
 */
const SCREENS = [
    { name: 'phone', width: 390, height: 844 },
    { name: 'phone landscape', width: 844, height: 390 },
    { name: 'tablet portrait', width: 820, height: 1180 },
    { name: 'tablet landscape', width: 1180, height: 820 },
    { name: 'laptop', width: 1280, height: 800 },
    { name: 'desktop', width: 1920, height: 1080 },
];

/**
 * Buttons the user cannot reach: off screen with no scrolling parent, or covered by something.
 * `openPanel`: a panel that is open on purpose may cover what is behind it (a phone sheet).
 */
function unreachableButtons(page: Page, openPanel?: string) {
    return page.evaluate((openPanel) => {
        const W = window.innerWidth;
        const H = window.innerHeight;
        const scrollsTo = (el: Element, axis: 'x' | 'y') => {
            for (let p = el.parentElement; p; p = p.parentElement) {
                const s = getComputedStyle(p);
                const o = axis === 'x' ? s.overflowX : s.overflowY;
                const more =
                    axis === 'x' ? p.scrollWidth > p.clientWidth : p.scrollHeight > p.clientHeight;
                if ((o === 'auto' || o === 'scroll') && more) return p;
            }
            return null;
        };
        const label = (b: Element) =>
            b.getAttribute('aria-label') ||
            b.textContent?.trim().slice(0, 30) ||
            b.outerHTML.slice(0, 60);
        const out: string[] = [];
        for (const b of document.querySelectorAll('button')) {
            if (b.closest('[inert], [aria-hidden="true"]')) continue;
            const r = b.getBoundingClientRect();
            // not rendered: display none, visibility hidden, or inside a closed <details>
            if (!r.width || !r.height || !b.checkVisibility({ visibilityProperty: true })) continue;
            const offX = r.left < -1 || r.right > W + 1;
            const offY = r.top < -1 || r.bottom > H + 1;
            if (offX || offY) {
                const scroller = scrollsTo(b, offX ? 'x' : 'y');
                if (!scroller) out.push(`off screen: ${label(b)}`);
                continue;
            }
            // only check the part a parent scroller shows
            const clip = scrollsTo(b, 'x') ?? scrollsTo(b, 'y');
            if (clip) {
                const c = clip.getBoundingClientRect();
                if (r.left < c.left || r.right > c.right || r.top < c.top || r.bottom > c.bottom)
                    continue;
            }
            const x = r.left + r.width / 2;
            const y = r.top + r.height / 2;
            const hit = document.elementFromPoint(x, y);
            if (openPanel && hit?.closest(openPanel) && !b.closest(openPanel)) continue;
            if (hit && hit !== b && !b.contains(hit) && !hit.contains(b))
                out.push(
                    `covered: ${label(b)} by ${hit.tagName.toLowerCase()}.${String((hit as HTMLElement).className).slice(0, 40)}`,
                );
        }
        return out;
    }, openPanel);
}

for (const screen of SCREENS) {
    test.describe(`${screen.name} ${screen.width}×${screen.height}`, () => {
        test.use({ viewport: { width: screen.width, height: screen.height }, hasTouch: true });

        test('the editor opens straight away; nothing is cut off or covered', async ({
            editor,
            page,
        }) => {
            await expect(page.getByRole('dialog')).toHaveCount(0); // no "use a larger screen"
            const overflow = await page.evaluate(
                () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
            );
            expect(overflow).toBeLessThanOrEqual(0);

            const box = await editor.settledCanvasBox();
            // the page gets a usable share of the screen; an upright phone gives it the full width
            // (tools and colors move into bars under the board)
            expect(box.width).toBeGreaterThan(screen.width * (screen.width < 640 ? 0.85 : 0.4));

            expect(await unreachableButtons(page)).toEqual([]);
        });

        test('side panels fit on screen and keep the canvas reachable', async ({
            editor,
            page,
        }) => {
            await editor.openPanel('Shapes');
            const panel = page.getByRole('region', { name: 'Shapes panel' });
            await expect(panel).toBeVisible();
            await editor.settledCanvasBox(); // the panel animates open
            const p = (await panel.boundingBox())!;
            expect(p.x).toBeGreaterThanOrEqual(0);
            expect(p.x + p.width).toBeLessThanOrEqual(screen.width + 1);
            expect(await unreachableButtons(page, '[aria-label="Shapes panel"]')).toEqual([]);
            await panel.getByRole('button', { name: /close/i }).first().click();

            // short screens: the dock rail moves the last tabs into its "More tabs" menu
            const rail = page.getByRole('toolbar', { name: 'Dock panels' });
            const exportTab = rail.getByRole('button', { name: 'Export', exact: true });
            if (await exportTab.isVisible()) await exportTab.click();
            else {
                await rail.getByLabel('More tabs').click();
                await rail.getByRole('button', { name: 'Export', exact: true }).click();
            }
            const dock = page.getByTestId('dock-panel');
            await expect(dock).toBeVisible();
            await editor.settledCanvasBox();
            const d = (await dock.boundingBox())!;
            expect(d.x).toBeGreaterThanOrEqual(0);
            expect(d.x + d.width).toBeLessThanOrEqual(screen.width + 1);
            expect(await unreachableButtons(page, '[data-testid="dock-panel"]')).toEqual([]);
        });
    });
}
