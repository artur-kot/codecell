import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { Launcher } from "./components/Launcher";
import { WebEditor } from "./components/WebEditor";
import { CompiledEditor } from "./components/CompiledEditor";
import { SettingsPage } from "./components/Settings";
import { AboutPage } from "./components/About";
import { useSettingsStore } from "./stores/settingsStore";

function App() {
  const initTheme = useSettingsStore((state) => state.initTheme);

  useEffect(() => {
    initTheme();

    // Listen for theme changes from other windows
    const unlisten = listen<{ mode: string; resolved: "light" | "dark" }>(
      "theme:changed",
      (event) => {
        document.documentElement.setAttribute("data-theme", event.payload.resolved);
      }
    );

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [initTheme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Launcher />} />
        <Route path="/editor" element={<EditorRouter />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/about" element={<AboutPage />} />
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
