import { BrowserRouter, Route, Routes } from "react-router-dom";
import EditorPage from "./components/pages/EditorPage.tsx";

function App() {
  return <>
    <BrowserRouter basename="/">
      <Routes>
        <Route path="/" element={<EditorPage />}>
        </Route>
      </Routes>
    </BrowserRouter>
  </>
}

export default App
