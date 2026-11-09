/// <reference types="node" />
/**
 * The site URL is configuration, not code: it comes from `VITE_SITE_URL` (.env locally, a GitHub
 * repository variable in CI). The build refuses a missing or malformed value, and no source file may
 * hard-code the production domain.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { normalizeSiteUrl } from '../siteUrl';
import { renderRobots } from '../prerender';

describe('normalizeSiteUrl', () => {
    it('accepts an absolute http(s) origin and drops a trailing slash', () => {
        expect(normalizeSiteUrl('https://www.example.com')).toBe('https://www.example.com');
        expect(normalizeSiteUrl('https://www.example.com/')).toBe('https://www.example.com');
        expect(normalizeSiteUrl('  https://example.com  ')).toBe('https://example.com');
        expect(normalizeSiteUrl('http://localhost:4173')).toBe('http://localhost:4173');
    });

    it('rejects missing, relative, non-http or path / query / hash values', () => {
        for (const bad of [
            undefined,
            '',
            'www.example.com',
            '/draw',
            'ftp://example.com',
            'https://example.com/app',
            'https://example.com?x=1',
            'https://example.com#top',
        ]) {
            expect(normalizeSiteUrl(bad), String(bad)).toBeNull();
        }
    });
});

describe('robots.txt', () => {
    it('is generated from the configured site URL', () => {
        expect(renderRobots('https://site.example')).toBe(
            'User-agent: *\nAllow: /\n\nSitemap: https://site.example/sitemap.xml\n',
        );
    });
});

describe('no hard-coded production domain', () => {
    const ROOT = process.cwd();
    const walk = (dir: string): string[] =>
        readdirSync(dir).flatMap((name) => {
            const path = join(dir, name);
            return statSync(path).isDirectory() ? walk(path) : [path];
        });
    const TEXT = /\.(ts|tsx|js|html|txt|json|webmanifest|xml|css)$/;

    it('index.html, public/, src/, e2e/ and vite.config.ts read it from VITE_SITE_URL', () => {
        const files = [
            join(ROOT, 'index.html'),
            join(ROOT, 'vite.config.ts'),
            ...walk(join(ROOT, 'public')),
            ...walk(join(ROOT, 'src')),
            ...walk(join(ROOT, 'e2e')),
        ].filter((f) => TEXT.test(f) && !/__tests__|\.test\./.test(f));
        const offenders = files
            .filter((f) => /fateboard\.com/i.test(readFileSync(f, 'utf8')))
            .map((f) => relative(ROOT, f));
        expect(offenders).toEqual([]);
    });
});
