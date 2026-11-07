/**
 * Build-time static pages for GitHub Pages (no server, no rewrites). From the built `index.html`, `vite.config.ts`
 * writes `<route>.html` per public route (GitHub Pages serves `/help` from `help.html` with HTTP 200, no redirect),
 * `404.html` (app shell, `noindex`: unknown URLs get a real 404 status, the app still renders share links / Not Found)
 * and `sitemap.xml`. Pure string functions so they run in Node and in Vitest. Throws if `index.html` lost a tag the
 * build relies on, so a broken head fails the build instead of shipping.
 */
import { canonicalUrl, type SeoRoute } from './routes';

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

/** Replacement is a function so `$&` / `$1` in route text stay literal. */
function replaceOnce(
    html: string,
    pattern: RegExp,
    replacement: (...groups: string[]) => string,
    what: string,
): string {
    if (!pattern.test(html)) throw new Error(`[prerender] index.html has no ${what}`);
    return html.replace(pattern, (...m: string[]) => replacement(...m));
}

const setMeta = (html: string, attr: string, value: string) =>
    replaceOnce(
        html,
        new RegExp(`(<meta\\s+${attr}\\s+content=")[^"]*(")`),
        (_, a, b) => `${a}${escapeHtml(value)}${b}`,
        `<meta ${attr}>`,
    );

function setFallback(html: string, heading: string, intro: string): string {
    let out = replaceOnce(
        html,
        /(<h1\b[^>]*>)[\s\S]*?(<\/h1>)/,
        (_, a, b) => `${a}${escapeHtml(heading)}${b}`,
        'fallback <h1>',
    );
    out = replaceOnce(
        out,
        /(<p\b[^>]*data-seo="intro"[^>]*>)[\s\S]*?(<\/p>)/,
        (_, a, b) => `${a}${escapeHtml(intro)}${b}`,
        'fallback <p data-seo="intro">',
    );
    return out;
}

export function renderRouteHtml(indexHtml: string, route: SeoRoute): string {
    const url = canonicalUrl(route);
    let html = replaceOnce(
        indexHtml,
        /<title>[\s\S]*?<\/title>/,
        () => `<title>${escapeHtml(route.title)}</title>`,
        '<title>',
    );
    html = setMeta(html, 'name="description"', route.description);
    html = setMeta(
        html,
        'name="robots"',
        route.index ? 'index, follow, max-image-preview:large' : 'noindex, follow',
    );
    html = setMeta(html, 'property="og:url"', url);
    html = setMeta(html, 'property="og:title"', route.title);
    html = setMeta(html, 'property="og:description"', route.description);
    html = setMeta(html, 'name="twitter:title"', route.title);
    html = setMeta(html, 'name="twitter:description"', route.description);
    html = replaceOnce(
        html,
        /(<link\s+rel="canonical"\s+href=")[^"]*(")/,
        (_, a, b) => `${a}${url}${b}`,
        '<link rel="canonical">',
    );
    // noindex pages are not a copy of another URL: no canonical (same rule as RouteSeo at runtime)
    if (!route.index) html = html.replace(/\s*<link\s+rel="canonical"[^>]*>/, '');
    return setFallback(html, route.heading, route.intro);
}

/** App shell for every non-route URL: `noindex`, no canonical (it is not a copy of `/`). */
export function renderNotFoundHtml(indexHtml: string): string {
    let html = replaceOnce(
        indexHtml,
        /<title>[\s\S]*?<\/title>/,
        () => '<title>Page not found | Fateboard</title>',
        '<title>',
    );
    html = setMeta(html, 'name="robots"', 'noindex');
    html = replaceOnce(
        html,
        /\s*<link\s+rel="canonical"[^>]*>/,
        () => '',
        '<link rel="canonical">',
    );
    return setFallback(
        html,
        'Page not found',
        'This page does not exist. Open the Fateboard online whiteboard from the link below.',
    );
}

export function renderSitemap(routes: readonly SeoRoute[]): string {
    const urls = routes
        .filter((r) => r.index)
        .map((r) => `    <url>\n        <loc>${canonicalUrl(r)}</loc>\n    </url>`)
        .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** File each route is written to, relative to the build output (`/` is index.html itself). */
export const routeFile = (route: SeoRoute) =>
    route.path === '/' ? null : `${route.path.slice(1)}.html`;
