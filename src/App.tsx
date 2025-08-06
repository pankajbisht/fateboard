import { BrowserRouter, Route, Routes } from "react-router-dom";
import EditorPage from "./components/pages/EditorPage.tsx";

function App() {
  return <>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<EditorPage />}>
        </Route>
      </Routes>
    </BrowserRouter>
  </>
}

export default App
