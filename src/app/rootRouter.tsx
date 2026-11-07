import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RootLayout from '@/components/templates/RootLayout.tsx';
import { RouteSeo } from '@/app/seo/RouteSeo';

/*
 * Every page is its own chunk (performance, production readiness P1): the landing page does not
 * download the editor and the editor does not download the marketing site. A failed chunk load
 * (e.g. after a deploy) is caught by the ErrorBoundary in RootLayout, which offers Reload.
 * `src/__tests__/codeSplitting.test.ts` fails on a static page import here.
 */
const WhiteboardMarketingSite = lazy(
    () => import('@/components/pages/web/WhiteboardMarketingSite'),
);
const EditorPage = lazy(() => import('@/components/pages/Editor/Editor'));
const EditorSettingPage = lazy(() => import('@/components/pages/Setting/EditorSettingPage'));
const HelpPage = lazy(() => import('@/components/pages/HelpPage/HelpPage'));
const NotFound = lazy(() => import('@/components/pages/NotFound/NotFoundPage'));
const CommandPalettePage = lazy(() =>
    Promise.all([
        import('@/components/pages/Command/CommandPalette'),
        import('@/components/config/commandConfig'),
    ]).then(([page, config]) => ({
        default: () => <page.default commands={config.commandRegistry} />,
    })),
);

/** Shown for the moment a page chunk loads: the plain app background, no text to flash. */
function PageLoading() {
    return <div className="min-h-screen bg-surface" aria-busy="true" />;
}

export function RootRouter() {
    return (
        <BrowserRouter>
            <RouteSeo />
            <Suspense fallback={<PageLoading />}>
                <Routes>
                    <Route element={<RootLayout />}>
                        <Route path="/" element={<WhiteboardMarketingSite />} />
                        <Route path="/draw" element={<EditorPage />} />
                        <Route path="/setting" element={<EditorSettingPage />} />
                        <Route path="/command-palette" element={<CommandPalettePage />} />
                        <Route path="/help" element={<HelpPage />} />
                    </Route>

                    <Route path="*" element={<NotFound />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}
