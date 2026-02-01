import { HashRouter, Routes, Route } from 'react-router-dom';
import RootLayout from '@/components/templates/RootLayout.tsx';
import WhiteboardMarketingSite from '@/components/pages/web/WhiteboardMarketingSite';
import EditorPage from '@/components/pages/Editor/Editor';
import EditorSettingPage from '@/components/pages/Setting/EditorSettingPage';
import CommandPalette from '@/components/pages/Command/CommandPalette';
import SharePage from '@/components/pages/SharePage/SharePage';
import HelpPage from '@/components/pages/HelpPage/HelpPage';
import NotFound from '@/components/pages/NotFound/NotFoundPage';
import { commandRegistry } from '@/components/config/commandConfig';

export function RootRouter() {
    return (
        <HashRouter basename="/">
            <Routes>
                <Route element={<RootLayout />}>
                    <Route path="/" element={<WhiteboardMarketingSite />} />
                    <Route path="/draw" element={<EditorPage />} />
                    <Route path="/setting" element={<EditorSettingPage />} />
                    <Route
                        path="/command-palette"
                        element={<CommandPalette commands={commandRegistry} />}
                    />
                    <Route path="/share/:docId" element={<SharePage />} />
                    <Route path="/help" element={<HelpPage />} />
                </Route>

                <Route path="*" element={<NotFound />} />
            </Routes>
        </HashRouter>
    );
}
