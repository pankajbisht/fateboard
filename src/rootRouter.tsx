import { HashRouter, Routes, Route, Outlet } from 'react-router-dom';
import EditorPage from './components/pages/Editor/Editor.tsx';
import NotFound from './components/pages/NotFound/NotFoundPage.tsx';
import EditorSettingPage from './components/pages/Setting/EditorSettingPage.tsx';
import CommandPalette from './components/pages/Command/CommandPalette.tsx';
import WhiteboardMarketingSite from './components/pages/web/WhiteboardMarketingSite.tsx';
import { useStore } from './store/index.ts';
import { useEffect, useState } from 'react';
import db from 'opendb-store';

function RootLayout() {
    const [store, setStore] = useState(false);

    useEffect(() => {
        const data = db.local.get('fateboard-settings', {});
        // useStore.getState().hydrate(data.setting);

        console.log(data);

        //   const data = useStore.getState().load();

        //   console.log(data);
        //
        // if (data.settings) {
        useStore.getState().hydrate(data);
        // } else {
        // useStore.getState().hydrate({});
        // }

        setStore(true);

        // useStore.getState().hydrate(data);
        // hydrate other stores here
    }, []);

    return store && <Outlet />;
}

export function RootRouter() {
    return (
        <HashRouter basename="/">
            <Routes>
                <Route element={<RootLayout />}>
                    <Route path="/" element={<WhiteboardMarketingSite />} />
                    <Route path="/draw" element={<EditorPage />} />
                    <Route path="/setting" element={<EditorSettingPage />} />
                    <Route path="/command-palette" element={<CommandPalette />} />
                </Route>

                <Route path="*" element={<NotFound />} />
            </Routes>
        </HashRouter>
    );
}
