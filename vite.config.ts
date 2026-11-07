import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { SEO_ROUTES } from './src/app/seo/routes';
import {
    renderNotFoundHtml,
    renderRouteHtml,
    renderSitemap,
    routeFile,
} from './src/app/seo/prerender';

// ESM-compatible dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Static page per public route + 404.html + sitemap.xml from the built index.html (GitHub Pages has no rewrites).
 * See src/app/seo/prerender.ts and docs/ARCHITECTURE.md "SEO".
 */
function prerenderRoutes(): Plugin {
    return {
        name: 'fateboard-prerender-routes',
        apply: 'build',
        writeBundle(options) {
            const outDir = options.dir ?? path.resolve(__dirname, 'dist');
            const indexHtml = readFileSync(path.join(outDir, 'index.html'), 'utf8');
            for (const route of SEO_ROUTES) {
                const file = routeFile(route);
                if (!file) continue;
                const target = path.join(outDir, file);
                mkdirSync(path.dirname(target), { recursive: true });
                writeFileSync(target, renderRouteHtml(indexHtml, route));
            }
            writeFileSync(path.join(outDir, '404.html'), renderNotFoundHtml(indexHtml));
            writeFileSync(path.join(outDir, 'sitemap.xml'), renderSitemap(SEO_ROUTES));
        },
    };
}

// https://vite.dev/config/
export default defineConfig({
    base: '/',
    plugins: [react(), tailwindcss(), prerenderRoutes()],

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
                        { name: 'icons', test: /node_modules[\\/]lucide-react[\\/]/, priority: 20 },
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
});
