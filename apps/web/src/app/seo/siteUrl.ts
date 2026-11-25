/**
 * The public site URL (canonical links, Open Graph, JSON-LD, sitemap, robots.txt) is configuration:
 * `VITE_SITE_URL` in `.env` locally, a GitHub repository variable in CI (see `.env.example`).
 * Pure function (runs in Node for the build and in the browser).
 */
export const SITE_URL_ENV = 'VITE_SITE_URL';

/**
 * `https://www.example.com` (an http(s) origin, no path / query / hash; a trailing slash is dropped),
 * or null when the value is missing or malformed.
 */
export function normalizeSiteUrl(raw: unknown): string | null {
    if (typeof raw !== 'string' || !raw.trim()) return null;
    let url: URL;
    try {
        url = new URL(raw.trim());
    } catch {
        return null;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
}
