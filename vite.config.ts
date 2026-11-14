import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { SEO_ROUTES } from './src/app/seo/routes';
import {
    renderNotFoundHtml,
    renderRobots,
    renderRouteHtml,
    renderSitemap,
    routeFile,
} from './src/app/seo/prerender';
import { SITE_URL_ENV, normalizeSiteUrl } from './src/app/seo/siteUrl';
import { injectCsp } from './src/app/seo/csp';

// ESM-compatible dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Static page per public route + 404.html + sitemap.xml from the built index.html (GitHub Pages has no rewrites).
 * See src/app/seo/prerender.ts and docs/ARCHITECTURE.md "SEO".
 */
function prerenderRoutes(siteUrl: string | null): Plugin {
    return {
        name: 'fateboard-prerender-routes',
        apply: 'build',
        writeBundle(options) {
            if (!siteUrl) return; // the config already refused to build without it
            const outDir = options.dir ?? path.resolve(__dirname, 'dist');
            const indexHtml = readFileSync(path.join(outDir, 'index.html'), 'utf8');
            for (const route of SEO_ROUTES) {
                const file = routeFile(route);
                if (!file) continue;
                const target = path.join(outDir, file);
                mkdirSync(path.dirname(target), { recursive: true });
                writeFileSync(target, renderRouteHtml(indexHtml, route, siteUrl));
            }
            writeFileSync(path.join(outDir, '404.html'), renderNotFoundHtml(indexHtml));
            writeFileSync(path.join(outDir, 'sitemap.xml'), renderSitemap(SEO_ROUTES, siteUrl));
            writeFileSync(path.join(outDir, 'robots.txt'), renderRobots(siteUrl));
        },
    };
}

/**
 * Content-Security-Policy <meta> in the built index.html (and so in every prerendered page), BUG-165.
 * Build only: the dev server injects inline HMR scripts. See src/app/seo/csp.ts.
 */
function contentSecurityPolicy(analytics: boolean): Plugin {
    const hash = (script: string) =>
        `'sha256-${createHash('sha256').update(script, 'utf8').digest('base64')}'`;
    return {
        name: 'fateboard-csp',
        apply: 'build',
        transformIndexHtml: {
            order: 'post',
            handler: (html) => injectCsp(html, { analytics, hash }),
        },
    };
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
    // The public site URL is configuration (.env / CI variable), never code. See .env.example.
    const env = loadEnv(mode, process.cwd(), 'VITE_');
    const siteUrl = normalizeSiteUrl(env[SITE_URL_ENV]);
    if (!siteUrl) {
        const message = `${SITE_URL_ENV} is missing or not an http(s) origin (got "${env[SITE_URL_ENV] ?? ''}"). Add e.g. ${SITE_URL_ENV}=https://www.example.com to .env (see .env.example) or the CI variables.`;
        if (command === 'build') throw new Error(`[config] ${message}`);
        console.warn(`[config] ${message} Canonical / Open Graph URLs stay unset in dev.`);
    } else {
        // index.html uses %VITE_SITE_URL%: inject the normalized value (no trailing slash)
        process.env[SITE_URL_ENV] = siteUrl;
    }

    return {
        base: '/',
        plugins: [
            react(),
            tailwindcss(),
            // gtag hosts only in the bundle that can load gtag (main.tsx: production + VITE_GA_ID)
            contentSecurityPolicy(mode === 'production' && !!env.VITE_GA_ID),
            prerenderRoutes(siteUrl),
        ],

        build: {
            rolldownOptions: {
                output: {
                    // Big libraries in their own long-cached chunks (pages are split by lazy routes).
                    codeSplitting: {
                        groups: [
                            { name: 'fabric', test: /node_modules[\\/]fabric[\\/]/, priority: 30 },
                            { name: 'paper', test: /node_modules[\\/]paper[\\/]/, priority: 30 },
                            {
                                name: 'react',
                                test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/,
                                priority: 20,
                            },
                            {
                                name: 'icons',
                                test: /node_modules[\\/]lucide-react[\\/]/,
                                priority: 20,
                            },
                        ],
                    },
                },
            },
        },

        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
                '@components': path.resolve(__dirname, './src/components'),
                '@animation': path.resolve(__dirname, './src/animation'),
                '@store': path.resolve(__dirname, './src/store'),
                '@lib': path.resolve(__dirname, './src/lib'),
                '@hooks': path.resolve(__dirname, './src/hooks'),
            },
        },
    };
});
