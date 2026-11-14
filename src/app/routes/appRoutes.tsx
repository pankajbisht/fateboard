/**
 * The route registry: one entry per page, rendered in this order by `RootRouter`.
 * Add a page = one `lazy()` import + one entry here (+ an `SEO_ROUTES` entry if it is public,
 * `prerender.test.ts`). Every page is its own chunk (performance, production readiness P1): the
 * landing page does not download the editor and the editor does not download the marketing site.
 * `src/__tests__/codeSplitting.test.ts` fails on a static page import here.
 */
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { matchPath } from 'react-router-dom';

import { PATHS, type AppPath } from './paths';

type PageModule = { default: ComponentType };

export interface AppRoute {
    path: AppPath;
    Page: LazyExoticComponent<ComponentType>;
    /** The same `import()` that `Page` runs: `preloadRoute` starts it early. */
    load: () => Promise<unknown>;
    /**
     * `site` = inside `SiteLayout` (error boundary only: light marketing pages, no store, BUG-209);
     * `root` = inside the lazy `RootLayout` (store + settings hydration, error boundary, dialogs,
     * toasts); `none` = rendered on its own (the 404 game).
     */
    layout: 'site' | 'root' | 'none';
}

/** A lazy page and its loader (one `import()`; the module cache makes a second call free). */
const page = (load: () => Promise<PageModule>) => ({ load, Page: lazy(load) });

/** The store-backed editor layout (BUG-209: lazy, so the site pages never load the store). */
export const loadRootLayout = () => import('@/components/templates/RootLayout');

const commandPalette = page(() =>
    Promise.all([
        import('@/components/pages/Command/CommandPalette'),
        import('@/components/config/commandConfig'),
    ]).then(([mod, config]) => ({
        default: () => <mod.default commands={config.commandRegistry} />,
    })),
);

export const APP_ROUTES: readonly AppRoute[] = [
    {
        path: PATHS.home,
        ...page(() => import('@/components/pages/web/WhiteboardMarketingSite')),
        layout: 'site',
    },
    {
        path: PATHS.draw,
        ...page(() => import('@/components/pages/Editor/Editor')),
        layout: 'root',
    },
    {
        path: PATHS.setting,
        ...page(() => import('@/components/pages/Setting/EditorSettingPage')),
        layout: 'root',
    },
    { path: PATHS.commandPalette, ...commandPalette, layout: 'root' },
    {
        path: PATHS.help,
        ...page(() => import('@/components/pages/HelpPage/HelpPage')),
        layout: 'root',
    },
    {
        path: PATHS.gallery,
        ...page(() => import('@/components/pages/Gallery/GalleryPage')),
        layout: 'site',
    },
    {
        path: PATHS.galleryPiece,
        ...page(() => import('@/components/pages/GalleryTutorial/GalleryTutorialPage')),
        layout: 'site',
    },
    // last: matches anything the routes above do not
    {
        path: PATHS.notFound,
        ...page(() => import('@/components/pages/NotFound/NotFoundPage')),
        layout: 'none',
    },
];

type Preloadable = Pick<AppRoute, 'layout' | 'load'> & { path: string };

/**
 * Start the chunks of the route being visited before React renders it, so a direct visit to an editor
 * route loads the RootLayout (store + Fabric) and the page in parallel instead of one after the other.
 * Called once from main.tsx; unknown paths load nothing.
 */
export function preloadRoute(
    pathname: string,
    routes: readonly Preloadable[] = APP_ROUTES,
    loadLayout: () => Promise<unknown> = loadRootLayout,
): void {
    const route = routes.find((r) => r.path !== PATHS.notFound && matchPath(r.path, pathname));
    if (!route) return;
    if (route.layout === 'root') void loadLayout().catch(() => {}); // a failure shows when it renders
    void route.load().catch(() => {});
}
