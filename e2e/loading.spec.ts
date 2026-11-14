/**
 * BUG-209: the landing and gallery pages do not download the editor's store or Fabric; the editor
 * still gets both. BUG-165: every built page carries the CSP meta, and real use triggers no violation
 * (the shared fixture also turns any `securitypolicyviolation` into a failing console error).
 */
import { expect, test } from './fixtures';

const HEAVY = /\/assets\/(fabric|store)-[^/]+\.js$/;

for (const path of ['/', '/gallery', '/gallery/manga-ronin']) {
    test(`${path} loads without the store or Fabric chunks`, async ({ page }) => {
        const heavy: string[] = [];
        page.on('request', (r) => {
            if (HEAVY.test(new URL(r.url()).pathname)) heavy.push(r.url());
        });
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
        await page.waitForLoadState('networkidle');
        expect(heavy).toEqual([]);
    });
}

test('the editor still loads Fabric and is ready', async ({ editor, page }) => {
    const fabric: string[] = [];
    page.on('request', (r) => {
        if (/\/assets\/fabric-[^/]+\.js$/.test(new URL(r.url()).pathname)) fabric.push(r.url());
    });
    await editor.open();
    expect(fabric.length).toBeGreaterThan(0);
});

test('from the landing page, Start Drawing opens a working editor', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation').getByRole('button', { name: 'Start Drawing' }).click();
    await expect(page).toHaveURL(/\/draw$/);
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect(page.locator('canvas.upper-canvas')).toBeVisible();
});

for (const path of ['/', '/draw', '/help', '/gallery', '/gallery/manga-ronin', '/setting']) {
    test(`${path} ships a strict Content-Security-Policy`, async ({ request }) => {
        const html = await (await request.get(path)).text();
        const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/)?.[1];
        expect(csp, 'CSP meta').toBeTruthy();
        const scriptSrc = csp!.split(';').find((d) => d.trim().startsWith('script-src'))!;
        expect(scriptSrc).not.toMatch(/unsafe-inline|unsafe-eval/);
        expect(csp).toMatch(/object-src 'none'/);
    });
}

// GitHub Pages answers unknown URLs with 404.html (status 404); vite preview falls back to the app
test('the 404 page ships the CSP too', async ({ request }) => {
    const response = await request.get('/404.html');
    expect(response.ok()).toBe(true);
    expect(await response.text()).toContain('http-equiv="Content-Security-Policy"');
});
