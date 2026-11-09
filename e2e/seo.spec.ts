import { test, expect } from '@playwright/test';

/* Real URLs per route (BUG-133): old hash links redirect, each route has its own head, build files exist. */

test('old /#/ links redirect to the real path', async ({ page }) => {
    await page.goto('/#/setting');
    await expect(page).toHaveURL(/\/setting$/);
    await expect(page.locator('body')).toContainText(/Settings/);
});

test('direct load of /help has its own title, canonical and robots', async ({ page }) => {
    await page.goto('/help');
    await expect(page).toHaveTitle(/Help/);
    // absolute URL on the configured origin (VITE_SITE_URL), never a leftover placeholder
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        /^https?:\/\/[^/%]+\/help$/,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /^index/);
});

test('client-side navigation updates the head', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Free Online Whiteboard/);
    await page.getByRole('button', { name: /Start Now/i }).click();
    await expect(page).toHaveURL(/\/draw$/);
    await expect(page).toHaveTitle(/Draw Online/);
});

test('build ships per-route HTML, 404 shell and sitemap', async ({ request }) => {
    const help = await (await request.get('/help.html')).text();
    expect(help).toContain('<title>Help &amp; Keyboard Shortcuts | Fateboard</title>');
    expect(help).toContain('Fateboard help and keyboard shortcuts');

    const notFound = await (await request.get('/404.html')).text();
    expect(notFound).toMatch(/<meta\s+name="robots"\s+content="noindex"/);

    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toMatch(/<loc>https?:\/\/[^/<]+\/help<\/loc>/);

    // generated from VITE_SITE_URL; no env placeholder survives the build
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toMatch(/^Sitemap: https?:\/\/[^/\s]+\/sitemap\.xml$/m);
    for (const file of ['/', '/help.html', '/404.html']) {
        expect(await (await request.get(file)).text(), file).not.toMatch(/%VITE_/);
    }
});

// The static SEO fallback must never flash for real visitors while the app loads (refresh showed
// "Fateboard: free online whiteboard and design canvas" for a moment). Crawlers / no-JS still get it.
test('the SEO fallback is hidden while the app loads, shown without JavaScript', async ({
    page,
    browser,
}) => {
    // app bundle held back = the moment between first paint and React mounting
    await page.route(/\/assets\/.*\.js$/, (route) => route.abort());
    await page.goto('/draw');
    const heading = page.locator('#fateboard h1');
    await expect(heading).toHaveCount(1);
    await expect(heading).toBeHidden();

    const noJs = await browser.newContext({ javaScriptEnabled: false });
    const plain = await noJs.newPage();
    await plain.goto('/draw');
    await expect(plain.locator('#fateboard h1')).toBeVisible();
    await noJs.close();
});
