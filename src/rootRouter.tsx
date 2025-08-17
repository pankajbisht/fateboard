import { BrowserRouter, Routes, Route } from "react-router-dom";
import EditorPage from "./components/pages/EditorPage";
import NotFound from "./components/pages/NotFoundPage.tsx";

export function RootRouter() {
  return (
    <BrowserRouter basename="/">
      <Routes>
        <Route path="/" element={<EditorPage />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
