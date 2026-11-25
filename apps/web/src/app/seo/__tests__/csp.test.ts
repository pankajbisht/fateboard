/// <reference types="node" />
/**
 * BUG-165: GitHub Pages cannot send headers, so the Content Security Policy ships as a <meta> tag that
 * the build writes into index.html (and so into every prerendered page). Inline scripts are allowed by
 * hash only: no 'unsafe-inline' / 'unsafe-eval' for scripts.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { buildCsp, injectCsp, inlineScripts } from '../csp';

const indexHtml = readFileSync(`${process.cwd()}/index.html`, 'utf8');
const sha256 = (s: string) => `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`;
const directive = (csp: string, name: string) =>
    csp
        .split(';')
        .map((d) => d.trim())
        .find((d) => d.startsWith(`${name} `)) ?? '';

describe('inlineScripts', () => {
    it('finds the executable inline scripts of index.html, not JSON-LD or src scripts', () => {
        const scripts = inlineScripts(indexHtml);
        expect(scripts).toHaveLength(1);
        expect(scripts[0]).toContain("classList.add('js')");
    });
});

describe('buildCsp', () => {
    const csp = buildCsp({ scriptHashes: ["'sha256-abc='"], analytics: false });

    it('locks scripts to the site and hashed inline scripts', () => {
        expect(directive(csp, 'script-src')).toBe("script-src 'self' 'sha256-abc='");
        expect(csp).not.toMatch(/unsafe-eval/);
        expect(directive(csp, 'script-src')).not.toMatch(/unsafe-inline/);
    });

    it('allows what the app really loads: fonts, data / blob images and media, same-origin fetch', () => {
        expect(directive(csp, 'default-src')).toBe("default-src 'self'");
        expect(directive(csp, 'style-src')).toContain('https://fonts.googleapis.com');
        expect(directive(csp, 'font-src')).toContain('https://fonts.gstatic.com');
        expect(directive(csp, 'img-src')).toBe("img-src 'self' data: blob:");
        expect(directive(csp, 'media-src')).toBe("media-src 'self' blob:");
        expect(directive(csp, 'connect-src')).toBe(
            "connect-src 'self' https://fonts.googleapis.com",
        );
    });

    it('blocks plugins, base hijacking and foreign form posts', () => {
        expect(directive(csp, 'object-src')).toBe("object-src 'none'");
        expect(directive(csp, 'base-uri')).toBe("base-uri 'self'");
        expect(directive(csp, 'form-action')).toBe("form-action 'self'");
    });

    it('has no header-only directives a <meta> CSP ignores', () => {
        expect(csp).not.toMatch(/frame-ancestors|report-uri|sandbox/);
    });

    it('adds the Google Analytics hosts only when analytics is built in', () => {
        expect(csp).not.toMatch(/googletagmanager|google-analytics/);
        const ga = buildCsp({ scriptHashes: [], analytics: true });
        expect(directive(ga, 'script-src')).toContain('https://*.googletagmanager.com');
        expect(directive(ga, 'connect-src')).toContain('https://*.google-analytics.com');
        expect(directive(ga, 'img-src')).toContain('https://*.google-analytics.com');
    });
});

describe('injectCsp', () => {
    const html = injectCsp(indexHtml, { analytics: false, hash: sha256 });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const meta = doc.head.querySelector('meta[http-equiv="Content-Security-Policy"]');

    it('writes one CSP meta tag before any script or stylesheet', () => {
        expect(meta).not.toBeNull();
        expect(
            doc.head.querySelectorAll('meta[http-equiv="Content-Security-Policy"]'),
        ).toHaveLength(1);
        const first = doc.head.querySelector('script, link[rel="stylesheet"], style');
        expect(
            meta!.compareDocumentPosition(first!) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });

    it('allows exactly the hash of the inline script it found', () => {
        const [script] = inlineScripts(indexHtml);
        expect(directive(meta!.getAttribute('content')!, 'script-src')).toBe(
            `script-src 'self' ${sha256(script!)}`,
        );
    });

    it('is idempotent (a second pass replaces, never duplicates)', () => {
        const twice = injectCsp(html, { analytics: false, hash: sha256 });
        expect(twice.match(/Content-Security-Policy/g)).toHaveLength(1);
    });
});

describe('docker/nginx.conf security headers (header-only protections)', () => {
    const conf = readFileSync(`${process.cwd()}/docker/nginx.conf`, 'utf8');
    // add_header in a location replaces the server-level list, so every location must repeat them
    const locations = [...conf.matchAll(/location [^{]+\{([^}]*)\}/g)].map((m) => m[1]!);

    it.each([
        ['X-Content-Type-Options', '"nosniff"'],
        ['Referrer-Policy', '"strict-origin-when-cross-origin"'],
        ['X-Frame-Options', '"DENY"'],
        ['Content-Security-Policy', `"frame-ancestors 'none'"`],
    ])('%s is sent from every location', (name, value) => {
        expect(locations.length).toBeGreaterThan(0);
        for (const block of locations)
            expect(block).toContain(`add_header ${name} ${value} always;`);
    });
});
