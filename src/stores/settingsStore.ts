import { create } from "zustand";
import { persist } from "zustand/middleware";
import { emit } from "@tauri-apps/api/event";

export type ThemeMode = "light" | "dark" | "system";

export interface EditorSettings {
  fontFamily: string;
  fontSize: number;
}

interface SettingsState {
  // Theme
  themeMode: ThemeMode;
  resolvedTheme: "light" | "dark";

  // Editor
  editorSettings: EditorSettings;

  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  setEditorSettings: (settings: Partial<EditorSettings>) => void;
  initTheme: () => void;
}

const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontFamily: "JetBrains Mono",
  fontSize: 14,
};

function getSystemTheme(): "light" | "dark" {
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "dark";
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      themeMode: "dark",
      resolvedTheme: "dark",
      editorSettings: DEFAULT_EDITOR_SETTINGS,

      setThemeMode: (mode) => {
        const resolved = mode === "system" ? getSystemTheme() : mode;
        applyTheme(resolved);
        set({ themeMode: mode, resolvedTheme: resolved });
        // Broadcast theme change to all windows
        emit("theme:changed", { mode, resolved });
      },

      setEditorSettings: (settings) => {
        set((state) => ({
          editorSettings: { ...state.editorSettings, ...settings },
        }));
      },

      initTheme: () => {
        const { themeMode } = get();
        const resolved = themeMode === "system" ? getSystemTheme() : themeMode;
        applyTheme(resolved);
        set({ resolvedTheme: resolved });

        // Listen for system theme changes
        if (typeof window !== "undefined") {
          window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
            const { themeMode } = get();
            if (themeMode === "system") {
              const newTheme = e.matches ? "dark" : "light";
              applyTheme(newTheme);
              set({ resolvedTheme: newTheme });
            }
          });
        }
      },
    }),
    {
      name: "codecell-settings",
      partialize: (state) => ({
        themeMode: state.themeMode,
        editorSettings: state.editorSettings,
      }),
    }
  )
);
