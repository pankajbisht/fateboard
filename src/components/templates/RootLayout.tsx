import { useStore } from '@/store';
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { settingsStorage } from '@/lib/storage';
import { DialogHost } from '@/components/organisms/DialogHost';
import { ErrorBoundary } from '@/components/organisms/ErrorBoundary';
import { ToastHost } from '@/components/organisms/ToastHost';
import { applyFabricChrome } from '@/lib/fabricChrome';

/*
 * Layout of the editor routes (store-backed). Loaded as its own lazy chunk (BUG-209) so the store and
 * Fabric never reach the marketing pages (`SiteLayout`). Fabric's selection chrome is applied here,
 * when this chunk loads, which is before any editor route can create a Fabric object.
 */
applyFabricChrome(); // selection handles readable in light and dark mode

// Playwright hook (read-only canvas view): only in `vite build --mode e2e`, never in production.
// Loaded here, not in main.tsx, because it imports the store (BUG-209: site pages stay store-free).
if (import.meta.env.MODE === 'e2e') void import('@/test/e2eHook');

function RootLayout() {
    const [store, setStore] = useState(false);
    const { pathname } = useLocation();

    useEffect(() => {
        const data = settingsStorage.load() ?? {};
        useStore.getState().hydrate(data);
        setStore(true);
    }, []);

    return (
        <>
            {store && (
                // a crash shows a recovery screen instead of a blank page; a new route resets it
                <ErrorBoundary key={pathname}>
                    <Outlet />
                </ErrorBoundary>
            )}
            <DialogHost />
            <ToastHost />
        </>
    );
}

export default RootLayout;
