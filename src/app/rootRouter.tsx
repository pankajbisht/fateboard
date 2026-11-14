import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SiteLayout from '@/components/templates/SiteLayout';
import { ErrorBoundary } from '@/components/organisms/ErrorBoundary';
import { RouteSeo } from '@/app/seo/RouteSeo';
import { APP_ROUTES, loadRootLayout, type AppRoute } from '@/app/routes/appRoutes';

// lazy: it imports the store (and so Fabric); only editor routes need it (BUG-209)
const RootLayout = lazy(loadRootLayout);

/*
 * Renders the route registry (`routes/appRoutes.tsx`); add pages there, not here. A failed chunk
 * load (e.g. after a deploy) is caught by an ErrorBoundary (in SiteLayout, around RootLayout, and in
 * RootLayout), which offers Reload.
 */

/** Shown for the moment a page chunk loads: the plain app background, no text to flash. */
function PageLoading() {
    return <div className="min-h-screen bg-surface" aria-busy="true" />;
}

const renderRoute = ({ path, Page }: AppRoute) => (
    <Route key={path} path={path} element={<Page />} />
);

export function RootRouter() {
    return (
        <BrowserRouter>
            <RouteSeo />
            <Suspense fallback={<PageLoading />}>
                <Routes>
                    <Route element={<SiteLayout />}>
                        {APP_ROUTES.filter((r) => r.layout === 'site').map(renderRoute)}
                    </Route>
                    {/* the boundary catches a failed RootLayout chunk; RootLayout has its own inside */}
                    <Route
                        element={
                            <ErrorBoundary>
                                <RootLayout />
                            </ErrorBoundary>
                        }
                    >
                        {APP_ROUTES.filter((r) => r.layout === 'root').map(renderRoute)}
                    </Route>
                    {APP_ROUTES.filter((r) => r.layout === 'none').map(renderRoute)}
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}
