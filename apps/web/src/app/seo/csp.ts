/**
 * Content Security Policy (BUG-165). GitHub Pages cannot send headers, so the build writes the policy
 * as a `<meta http-equiv>` tag into index.html (vite.config.ts `contentSecurityPolicy`), which every
 * prerendered page copies. Build-time only: the Vite dev server needs inline scripts for HMR.
 *
 * What the app loads, and so what the policy allows (docs/ARCHITECTURE.md "Security"):
 * - scripts: our own chunks + the one inline `html.js` script in index.html, by sha256 hash. No
 *   'unsafe-inline' / 'unsafe-eval' (the built JS has no eval / new Function). gtag only when built in.
 * - styles: our CSS, Google Fonts CSS (static link + runtime font loader) and inline styles
 *   ('unsafe-inline': React / Fabric style attributes and the landing's <style> element need it).
 * - images / media: same origin + data: / blob: (opened files, exports, video preview). Remote images in
 *   opened files are already dropped (Q13), the policy enforces it in the browser too.
 * - fetch: same origin (gallery artwork, templates) + Google Fonts CSS (public, read-only: axe reads
 *   stylesheets this way, and a service worker caching fonts will too).
 * Header-only directives (frame-ancestors, report-uri, sandbox) are ignored in <meta>; nginx sends
 * frame-ancestors (docker/nginx.conf). Pure functions: also run by Vite in Node.
 */

export interface CspOptions {
    /** `'sha256-…'` sources for the inline scripts (computed by the caller). */
    scriptHashes: string[];
    /** Google Analytics built in (production build with VITE_GA_ID). */
    analytics: boolean;
}

const GA = {
    script: ['https://*.googletagmanager.com'],
    img: ['https://*.google-analytics.com', 'https://*.googletagmanager.com'],
    connect: [
        'https://*.google-analytics.com',
        'https://*.analytics.google.com',
        'https://*.googletagmanager.com',
    ],
};

export function buildCsp({ scriptHashes, analytics }: CspOptions): string {
    const ga = (list: string[]) => (analytics ? list : []);
    const directives: [string, string[]][] = [
        ['default-src', ["'self'"]],
        ['script-src', ["'self'", ...scriptHashes, ...ga(GA.script)]],
        ['style-src', ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']],
        ['font-src', ["'self'", 'https://fonts.gstatic.com']],
        ['img-src', ["'self'", 'data:', 'blob:', ...ga(GA.img)]],
        ['media-src', ["'self'", 'blob:']],
        ['connect-src', ["'self'", 'https://fonts.googleapis.com', ...ga(GA.connect)]],
        ['manifest-src', ["'self'"]],
        ['object-src', ["'none'"]],
        ['base-uri', ["'self'"]],
        ['form-action', ["'self'"]],
    ];
    return directives.map(([name, sources]) => `${name} ${sources.join(' ')}`).join('; ');
}

const JS_TYPES = new Set(['', 'text/javascript', 'application/javascript', 'module']);

/** The text of every inline script the browser would execute (not `src` scripts, not JSON-LD). */
export function inlineScripts(html: string): string[] {
    const out: string[] = [];
    for (const m of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
        const attrs = m[1] ?? '';
        if (/\ssrc\s*=/i.test(attrs)) continue;
        const type = /\stype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1]?.toLowerCase() ?? '';
        if (JS_TYPES.has(type)) out.push(m[2]!);
    }
    return out;
}

const META_RE = /\s*<meta http-equiv="Content-Security-Policy"[^>]*>/i;

/**
 * Write (or replace) the CSP meta right after `<meta charset>`, before any script or stylesheet,
 * allowing exactly the inline scripts in `html`. `hash` returns a `'sha256-…'` source for a script.
 */
export function injectCsp(
    html: string,
    { analytics, hash }: { analytics: boolean; hash: (script: string) => string },
): string {
    const clean = html.replace(META_RE, '');
    const csp = buildCsp({ scriptHashes: inlineScripts(clean).map(hash), analytics });
    const meta = `<meta http-equiv="Content-Security-Policy" content="${csp}" />`;
    const charset = /<meta charset="[^"]*"\s*\/?>/i.exec(clean);
    if (!charset) throw new Error('[csp] index.html has no <meta charset>: cannot place the CSP');
    const at = charset.index + charset[0].length;
    return `${clean.slice(0, at)}\n        ${meta}${clean.slice(at)}`;
}
