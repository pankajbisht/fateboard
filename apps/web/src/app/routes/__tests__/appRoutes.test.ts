/**
 * The route registry is the one list of app routes (docs/ARCHITECTURE.md "Routing"): every named path
 * is routed once, every page is lazy, and the catch-all comes last.
 */
import { describe, expect, it } from 'vitest';

import { APP_ROUTES, preloadRoute } from '../appRoutes';
import { PATHS } from '../paths';

describe('APP_ROUTES', () => {
    it('routes every named path exactly once', () => {
        const paths = APP_ROUTES.map((r) => r.path);
        expect(new Set(paths).size).toBe(paths.length);
        for (const path of Object.values(PATHS)) expect(paths, path).toContain(path);
    });

    it('has a gallery index page next to the per-piece tutorials', () => {
        expect(PATHS.gallery).toBe('/gallery');
        expect(PATHS.galleryPiece).toBe('/gallery/:id');
        expect(APP_ROUTES.find((r) => r.path === PATHS.gallery)?.layout).toBe('site');
    });

    it('marketing pages use the light site layout; the editor pages the store-backed one (BUG-209)', () => {
        const layout = (path: string) => APP_ROUTES.find((r) => r.path === path)?.layout;
        for (const path of [PATHS.home, PATHS.gallery, PATHS.galleryPiece])
            expect(layout(path), path).toBe('site');
        for (const path of [PATHS.draw, PATHS.setting, PATHS.help, PATHS.commandPalette])
            expect(layout(path), path).toBe('root');
    });

    it('preloadRoute starts the layout and page chunks together for an editor route', () => {
        const calls: string[] = [];
        const routes = [
            { path: '/', layout: 'site', load: () => (calls.push('home'), Promise.resolve()) },
            { path: '/draw', layout: 'root', load: () => (calls.push('draw'), Promise.resolve()) },
            {
                path: '/gallery/:id',
                layout: 'site',
                load: () => (calls.push('piece'), Promise.resolve()),
            },
            { path: '*', layout: 'none', load: () => (calls.push('404'), Promise.resolve()) },
        ] as const;
        const layout = () => (calls.push('RootLayout'), Promise.resolve());

        preloadRoute('/draw', routes, layout);
        expect(calls).toEqual(['RootLayout', 'draw']);
        calls.length = 0;
        preloadRoute('/gallery/manga-ronin/', routes, layout);
        expect(calls).toEqual(['piece']);
        calls.length = 0;
        preloadRoute('/nope', routes, layout);
        expect(calls).toEqual([]);
    });

    it('every page is a lazy component', () => {
        const LAZY = Symbol.for('react.lazy');
        for (const r of APP_ROUTES)
            expect((r.Page as unknown as { $$typeof: symbol }).$$typeof, r.path).toBe(LAZY);
    });

    it('the catch-all is the last route and outside the root layout', () => {
        const last = APP_ROUTES[APP_ROUTES.length - 1]!;
        expect(last.path).toBe(PATHS.notFound);
        expect(last.layout).toBe('none');
        expect(APP_ROUTES.filter((r) => r.path === '*')).toHaveLength(1);
    });
});
