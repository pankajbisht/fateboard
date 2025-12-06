import { BrowserRouter, Routes, Route } from "react-router-dom";
import EditorPage from "./components/pages/EditorPage";
import NotFound from "./components/pages/NotFoundPage.tsx";
import EditorSettingPage from "./components/pages/EditorSettingPage.tsx";
import CommandPalette from "./components/pages/CommandPalette.tsx";

export function RootRouter() {
  return (
    <BrowserRouter basename="/">
      <Routes>
        <Route path="/" element={<EditorPage />} />
        <Route path="/setting" element={<EditorSettingPage />} />
        <Route path="/command-palette" element={<CommandPalette />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
