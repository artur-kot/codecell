import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Launcher } from "./components/Launcher";
import { WebEditor } from "./components/WebEditor";
import { CompiledEditor } from "./components/CompiledEditor";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Launcher />} />
        <Route path="/editor" element={<EditorRouter />} />
      </Routes>
    </BrowserRouter>
  );
}

// Determine which editor to show based on URL params
function EditorRouter() {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");

  if (type === "web") {
    return <WebEditor />;
  }

  return <CompiledEditor />;
}

export default App;
