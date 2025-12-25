import { BrowserRouter, Routes, Route } from 'react-router-dom';
import EditorPage from './components/pages/Editor/Editor.tsx';
import NotFound from './components/pages/NotFound/NotFoundPage.tsx';
import EditorSettingPage from './components/pages/Setting/EditorSettingPage.tsx';
import CommandPalette from './components/pages/Command/CommandPalette.tsx';
import WhiteboardMarketingSite from './components/pages/web/WhiteboardMarketingSite.tsx';

export function RootRouter() {
    return (
        <BrowserRouter basename="/">
            <Routes>
                <Route path="/" element={<WhiteboardMarketingSite />} />
                <Route path="/draw" element={<EditorPage />} />
                <Route path="/setting" element={<EditorSettingPage />} />
                <Route path="/command-palette" element={<CommandPalette />} />

                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
}
