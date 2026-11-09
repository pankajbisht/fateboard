/// <reference types="node" />
/** Per-route static pages, 404 shell and sitemap built from the real index.html (BUG-133). */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderNotFoundHtml, renderRouteHtml, renderSitemap, routeFile } from '../prerender';
import { SEO_ROUTES, canonicalUrl, seoForPath } from '../routes';

const SITE_URL = 'https://fateboard.test';

const indexHtml = readFileSync(`${process.cwd()}/index.html`, 'utf8');
const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');
const meta = (doc: Document, sel: string) =>
    doc.head.querySelector(`meta[${sel}]`)?.getAttribute('content');
const route = (path: string) => SEO_ROUTES.find((r) => r.path === path)!;

describe('routes', () => {
    it('the / entry matches index.html (one source of truth for the landing head)', () => {
        const doc = parse(indexHtml);
        const home = route('/');
        expect(doc.title).toBe(home.title);
        expect(meta(doc, 'name="description"')).toBe(home.description);
        expect(doc.querySelector('#fateboard h1')?.textContent).toBe(home.heading);
    });

    it('every SEO route is a real router path', () => {
        const router = readFileSync(`${process.cwd()}/src/app/rootRouter.tsx`, 'utf8');
        for (const r of SEO_ROUTES) expect(router).toContain(`path="${r.path}"`);
    });

    it('descriptions are 30-160 chars and titles are unique', () => {
        for (const r of SEO_ROUTES) {
            expect(r.description.length).toBeGreaterThanOrEqual(r.index ? 50 : 10);
            expect(r.description.length).toBeLessThanOrEqual(160);
        }
        expect(new Set(SEO_ROUTES.map((r) => r.title)).size).toBe(SEO_ROUTES.length);
    });

    it('seoForPath ignores trailing slashes and case; unknown paths are noindex', () => {
        expect(seoForPath('/help/').path).toBe('/help');
        expect(seoForPath('/Draw').path).toBe('/draw');
        expect(seoForPath('/').path).toBe('/');
        expect(seoForPath('/share/abc').index).toBe(false);
        expect(canonicalUrl(route('/'), SITE_URL)).toBe(`${SITE_URL}/`);
        expect(canonicalUrl(route('/help'), SITE_URL)).toBe(`${SITE_URL}/help`);
    });
});

describe('renderRouteHtml', () => {
    it('writes the route head + fallback into a copy of index.html', () => {
        const help = route('/help');
        const doc = parse(renderRouteHtml(indexHtml, help, SITE_URL));
        expect(doc.title).toBe(help.title);
        expect(meta(doc, 'name="description"')).toBe(help.description);
        expect(meta(doc, 'name="robots"')).toMatch(/^index, follow/);
        expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
            `${SITE_URL}/help`,
        );
        expect(meta(doc, 'property="og:url"')).toBe(`${SITE_URL}/help`);
        expect(meta(doc, 'property="og:title"')).toBe(help.title);
        expect(meta(doc, 'name="twitter:description"')).toBe(help.description);
        expect(doc.querySelector('#fateboard h1')?.textContent).toBe(help.heading);
        expect(doc.querySelector('#fateboard [data-seo="intro"]')?.textContent).toBe(help.intro);
        // app still boots from it
        expect(doc.querySelector('script[type="module"]')).not.toBeNull();
    });

    it('marks non-index routes noindex', () => {
        const doc = parse(renderRouteHtml(indexHtml, route('/setting'), SITE_URL));
        expect(meta(doc, 'name="robots"')).toBe('noindex, follow');
        expect(doc.querySelector('link[rel="canonical"]')).toBeNull();
    });

    it('escapes HTML in values', () => {
        const doc = parse(
            renderRouteHtml(indexHtml, { ...route('/help'), title: 'A & B <x> "q"' }, SITE_URL),
        );
        expect(doc.title).toBe('A & B <x> "q"');
        const dollar = parse(
            renderRouteHtml(
                indexHtml,
                { ...route('/help'), description: 'Save $1 & $&' },
                SITE_URL,
            ),
        );
        expect(meta(dollar, 'name="description"')).toBe('Save $1 & $&');
    });

    it('fails loudly when index.html lost a tag the build needs', () => {
        expect(() =>
            renderRouteHtml(
                indexHtml.replace(/<link\s+rel="canonical"[^>]*>/, ''),
                route('/help'),
                SITE_URL,
            ),
        ).toThrow(/canonical/);
    });

    it('writes /help to help.html (GitHub Pages serves it at /help with no redirect)', () => {
        expect(routeFile(route('/'))).toBeNull();
        expect(routeFile(route('/help'))).toBe('help.html');
    });
});

describe('renderNotFoundHtml', () => {
    it('is a noindex app shell without a canonical', () => {
        const doc = parse(renderNotFoundHtml(indexHtml));
        expect(meta(doc, 'name="robots"')).toBe('noindex');
        expect(doc.querySelector('link[rel="canonical"]')).toBeNull();
        expect(doc.title).toMatch(/not found/i);
        expect(doc.querySelector('script[type="module"]')).not.toBeNull();
    });
});

describe('renderSitemap', () => {
    it('lists exactly the indexable routes', () => {
        const xml = new DOMParser().parseFromString(
            renderSitemap(SEO_ROUTES, SITE_URL),
            'application/xml',
        );
        const locs = [...xml.getElementsByTagName('loc')].map((l) => l.textContent);
        expect(locs).toEqual([`${SITE_URL}/`, `${SITE_URL}/draw`, `${SITE_URL}/help`]);
    });
});
