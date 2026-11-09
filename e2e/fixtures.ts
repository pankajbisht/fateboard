/**
 * Shared Playwright fixture: a fresh editor per test, console-error guard, and small helpers that
 * drive the real UI. Canvas content is READ through the e2e-only `window.__fateboard` hook
 * (src/test/e2eHook.ts); everything else is clicked like a user would.
 */
import { test as base, expect, type Locator, type Page } from '@playwright/test';

export type E2EObject = {
    type: string;
    fill: string | null;
    stroke: string | null;
    strokeWidth: number;
    width: number;
    height: number;
    text?: string;
    fontSize?: number;
    fontWeight?: string | number;
    fontStyle?: string;
    underline?: boolean;
    textAlign?: string;
    isTextShape?: boolean;
};

type Hook = {
    objects: () => E2EObject[];
    selection: () => E2EObject[];
    state: (key: string) => unknown;
    bounds: (index: number) => {
        left: number;
        top: number;
        width: number;
        height: number;
        canvasWidth: number;
    };
    ready: () => boolean;
};

declare global {
    interface Window {
        __fateboard?: Hook;
    }
}

/** Messages that are not app bugs (browser / dev noise). Keep this list short. */
const IGNORED_CONSOLE = [/Download the React DevTools/i];

export class Editor {
    constructor(readonly page: Page) {}

    async open() {
        await this.page.goto('/draw');
        await this.page.waitForFunction(() => !!window.__fateboard?.ready());
        await expect(this.canvas).toBeVisible();
    }

    get canvas(): Locator {
        return this.page.locator('canvas.upper-canvas');
    }
    get footerView(): Locator {
        return this.page.getByTestId('footer-view');
    }
    /** The editor's bottom bar (the page has an outer layout <footer> too). */
    get footer(): Locator {
        return this.page.getByTestId('footer-view').locator('xpath=ancestor::footer[1]');
    }
    get textFloat(): Locator {
        return this.page.locator('[data-text-float]');
    }

    objects() {
        return this.page.evaluate(() => window.__fateboard!.objects());
    }
    selection() {
        return this.page.evaluate(() => window.__fateboard!.selection());
    }
    state<T = unknown>(key: string) {
        return this.page.evaluate((k) => window.__fateboard!.state(k), key) as Promise<T>;
    }

    /** Left rail: open a panel (Shapes, Text, Canvas Size, Pages, Layers, …). */
    async openPanel(label: string) {
        const rail = this.page.getByRole('navigation', { name: 'Editor tools and panels' });
        const button = rail.getByRole('button', { name: label, exact: true });
        // the rail toggles: clicking the open panel's button would close it
        if ((await button.getAttribute('aria-pressed')) !== 'true') await button.click();
    }

    /** Right dock: open a tab (Fill & Shadow, Export, …). */
    async openDockTab(label: string) {
        await this.page
            .getByRole('toolbar', { name: 'Dock panels' })
            .getByRole('button', { name: label, exact: true })
            .click();
    }

    /** Shapes panel: add a catalog shape by its label (Rectangle, Circle, Sticky Note, …). */
    async addShape(label: string) {
        await this.openPanel('Shapes');
        const before = (await this.objects()).length;
        await this.page.getByRole('button', { name: label, exact: true }).first().click();
        await expect.poll(async () => (await this.objects()).length).toBe(before + 1);
    }

    /** The canvas box once it has stopped moving (side panels animate open / closed). */
    async settledCanvasBox() {
        let prev = await this.canvas.boundingBox();
        for (let i = 0; i < 40; i++) {
            await this.page.waitForTimeout(50);
            const next = await this.canvas.boundingBox();
            if (
                prev &&
                next &&
                prev.x === next.x &&
                prev.y === next.y &&
                prev.width === next.width &&
                prev.height === next.height
            )
                return next;
            prev = next;
        }
        throw new Error('canvas never settled');
    }

    /** Click an empty spot of the canvas (top-left corner area) to deselect. */
    async clickEmptyCanvas() {
        const box = await this.settledCanvasBox();
        await this.page.mouse.click(box.x + 12, box.y + 12);
    }
}

export const test = base.extend<{ editor: Editor; consoleErrors: string[] }>({
    consoleErrors: [
        async ({ page }, use) => {
            const errors: string[] = [];
            page.on('console', (m) => {
                if (m.type() !== 'error') return;
                const text = m.text();
                if (!IGNORED_CONSOLE.some((re) => re.test(text))) errors.push(text);
            });
            page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
            await use(errors);
            // every test fails on an unexpected console error or uncaught exception
            expect(errors, 'console errors during the test').toEqual([]);
        },
        { auto: true },
    ],
    editor: async ({ page }, use) => {
        const editor = new Editor(page);
        await editor.open();
        await use(editor);
    },
});

export { expect };
