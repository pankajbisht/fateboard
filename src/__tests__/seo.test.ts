/// <reference types="node" />
/**
 * SEO guard for the landing head in `index.html` and the crawl files in `public/`. Per-route pages, 404.html and
 * sitemap.xml are generated at build time: `src/app/seo/__tests__/prerender.test.ts`. See docs/ARCHITECTURE.md "SEO".
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const SITE = 'https://www.fateboard.com/';
const root = (file: string) => readFileSync(`${process.cwd()}/${file}`, 'utf8');
const doc = new DOMParser().parseFromString(root('index.html'), 'text/html');

const meta = (selector: string) =>
    doc.head.querySelector(`meta[${selector}]`)?.getAttribute('content');

describe('index.html SEO', () => {
    it('has a keyword title and a one-line description of 50-160 chars', () => {
        expect(doc.title).toMatch(/whiteboard/i);
        const description = meta('name="description"') ?? '';
        expect(description).not.toMatch(/\n/);
        expect(description.length).toBeGreaterThanOrEqual(50);
        expect(description.length).toBeLessThanOrEqual(160);
    });

    it('points canonical, og:url and JSON-LD at the same absolute site URL', () => {
        expect(doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(SITE);
        expect(meta('property="og:url"')).toBe(SITE);
        const ld = JSON.parse(
            doc.head.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}',
        );
        const graph: Array<Record<string, unknown>> = ld['@graph'] ?? [ld];
        const app = graph.find((n) => n['@type'] === 'WebApplication');
        expect(app?.url).toBe(SITE);
        // schema.org enumerated value (Google rejects free text like "Productivity")
        expect(app?.applicationCategory).toMatch(/Application$/);
    });

    it('has Open Graph + Twitter tags with an absolute raster preview image that exists', () => {
        expect(meta('property="og:title"')).toMatch(/fateboard/i);
        expect(meta('property="og:description"')).toBeTruthy();
        expect(meta('property="og:site_name"')).toBe('Fateboard');
        expect(meta('name="twitter:card"')).toBe('summary_large_image');
        const image = meta('property="og:image"') ?? '';
        expect(image.startsWith(SITE)).toBe(true);
        expect(image).toMatch(/\.(png|jpe?g)$/); // social scrapers do not render SVG
        expect(existsSync(`${process.cwd()}/public/${image.slice(SITE.length)}`)).toBe(true);
        expect(meta('name="twitter:image"')).toBe(image);
    });

    it('links manifest, apple-touch-icon and theme-color', () => {
        expect(doc.head.querySelector('link[rel="manifest"]')).not.toBeNull();
        expect(doc.head.querySelector('link[rel="apple-touch-icon"]')).not.toBeNull();
        expect(meta('name="theme-color"')).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('loads Google Fonts in one request with preconnect', () => {
        const fonts = doc.head.querySelectorAll('link[href^="https://fonts.googleapis.com/css2"]');
        expect(fonts).toHaveLength(1);
        expect(
            doc.head.querySelector('link[rel="preconnect"][href="https://fonts.gstatic.com"]'),
        ).not.toBeNull();
    });

    it('loads the real entry file and has no unreplaced env placeholders', () => {
        // BUG-130: index.html pointed at /src/main.jsx; BUG-131: %VITE_GA_ID% shipped literally
        const entry = doc.querySelector('script[type="module"]')?.getAttribute('src') ?? '';
        expect(entry).toBe('/src/main.tsx');
        expect(existsSync(`${process.cwd()}${entry}`)).toBe(true);
        expect(root('index.html')).not.toMatch(/%VITE_[A-Z_]+%/);
    });

    it('ships crawlable fallback content inside the React root (no-JS crawlers)', () => {
        const fallback = doc.getElementById('fateboard');
        expect(fallback?.querySelector('h1')?.textContent).toMatch(/whiteboard/i);
        expect(fallback?.querySelector('a[href="/draw"]')).not.toBeNull();
    });
});

describe('public/ crawl files', () => {
    it('robots.txt allows crawling and lists the sitemap', () => {
        const robots = root('public/robots.txt');
        expect(robots).toMatch(/^User-agent: \*$/m);
        expect(robots).toMatch(new RegExp(`^Sitemap: ${SITE}sitemap.xml$`, 'm'));
    });

    it('web manifest is valid JSON whose icons exist', () => {
        const manifest = JSON.parse(root('public/site.webmanifest'));
        expect(manifest.name).toMatch(/fateboard/i);
        expect(manifest.start_url).toBe('/');
        for (const icon of manifest.icons) {
            expect(existsSync(`${process.cwd()}/public${icon.src}`)).toBe(true);
        }
    });

    it('no static 404.html / sitemap.xml in public/ (the build generates them; a copy would be overwritten)', () => {
        expect(existsSync(`${process.cwd()}/public/404.html`)).toBe(false);
        expect(existsSync(`${process.cwd()}/public/sitemap.xml`)).toBe(false);
    });
});
