import { Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '@/components/organisms/ErrorBoundary';

/**
 * Layout of the light marketing pages (landing, gallery, tutorials): an error boundary and nothing
 * else. No store, no Fabric, no dialogs or toasts (BUG-209): those pages never use them, and the
 * store-backed `RootLayout` would add ≈ 190 KB gzip to their first load. Editor routes use RootLayout.
 */
export default function SiteLayout() {
    const { pathname } = useLocation();
    return (
        // a crash shows a recovery screen instead of a blank page; a new route resets it
        <ErrorBoundary key={pathname}>
            <Outlet />
        </ErrorBoundary>
    );
}
