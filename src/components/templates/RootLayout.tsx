import { useStore } from '@/store';
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import db from 'opendb-store';
import { DialogHost } from '@/components/organisms/DialogHost';
import { ErrorBoundary } from '@/components/organisms/ErrorBoundary';
import { ToastHost } from '@/components/organisms/ToastHost';

function RootLayout() {
    const [store, setStore] = useState(false);
    const { pathname } = useLocation();

    useEffect(() => {
        const data = db.local.get('fateboard-settings', {});
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
