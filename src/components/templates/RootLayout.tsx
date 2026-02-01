import { useStore } from '@/store';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import db from 'opendb-store';

function RootLayout() {
    const [store, setStore] = useState(false);

    useEffect(() => {
        const data = db.local.get('fateboard-settings', {});
        useStore.getState().hydrate(data);
        setStore(true);
    }, []);

    return store && <Outlet />;
}

export default RootLayout;
