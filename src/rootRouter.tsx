import { HashRouter, Routes, Route, Outlet } from 'react-router-dom';
import EditorPage from './components/pages/Editor/Editor.tsx';
import NotFound from './components/pages/NotFound/NotFoundPage.tsx';
import EditorSettingPage from './components/pages/Setting/EditorSettingPage.tsx';
import CommandPalette from './components/pages/Command/CommandPalette.tsx';
import WhiteboardMarketingSite from './components/pages/web/WhiteboardMarketingSite.tsx';
import { useStore } from './store/index.ts';
import { useEffect, useState } from 'react';
import db from 'opendb-store';
import SharePage from './components/pages/SharePage/SharePage.tsx';
import HelpPage from './components/pages/HelpPage/HelpPage.tsx';

function RootLayout() {
    const [store, setStore] = useState(false);

    useEffect(() => {
        const data = db.local.get('fateboard-settings', {});
        // console.log(data);
        useStore.getState().hydrate(data);
        setStore(true);
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
                    <Route path="/share/:docId" element={<SharePage />} />
                    <Route path="/help" element={<HelpPage />} />
                </Route>

                <Route path="*" element={<NotFound />} />
            </Routes>
        </HashRouter>
    );
}
