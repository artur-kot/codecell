import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Settings } from "@/components/Settings";
import { CommandPalette, useCommandPalette, type PaletteCommand } from "@/components/CommandPalette";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { CodeEditor } from "@/components/common";
import {
  FileCode,
  Eye,
  EyeOff,
  RefreshCw,
  Maximize2,
  Minimize2,
  Loader2,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Monitor,
  Code,
} from "lucide-react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import type { Project } from "@/types";

// File tab icons and colors
const FILE_CONFIG: Record<string, { icon: string; color: string }> = {
  html: { icon: "HTML", color: "var(--color-template-web)" },
  css: { icon: "CSS", color: "var(--color-accent)" },
  javascript: { icon: "JS", color: "var(--color-template-python)" },
  typescript: { icon: "TS", color: "var(--color-template-react)" },
};

export function WebEditor() {
  const { currentProject, setCurrentProject, updateFile } = useProjectStore();
  const { setThemeMode } = useSettingsStore();
  const [activeTab, setActiveTab] = useState(0);
  const [showPreview, setShowPreview] = useState(true);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const commandPalette = useCommandPalette();

  // Load project from temp storage on mount
  useEffect(() => {
    const loadProject = async () => {
      const params = new URLSearchParams(window.location.search);
      const projectId = params.get("projectId");

      if (projectId && !currentProject) {
        try {
          const project = await invoke<Project>("load_temp_project", {
            id: projectId,
          });
          setCurrentProject(project);
        } catch (error) {
          console.error("Failed to load project:", error);
        }
      }
      setIsLoading(false);
    };

    loadProject();
  }, [currentProject, setCurrentProject]);

  // Listen for menu events
  useEffect(() => {
    const unlistenTogglePreview = listen("menu:toggle-preview", () => {
      setShowPreview((prev) => !prev);
    });

    const unlistenSave = listen("menu:save", () => {
      // TODO: Implement save
      console.log("Save triggered");
    });

    return () => {
      unlistenTogglePreview.then((fn) => fn());
      unlistenSave.then((fn) => fn());
    };
  }, []);

  // Debounced preview refresh
  const refreshPreview = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setPreviewKey((k) => k + 1);
    }, 500);
  }, []);

  // Handle file content changes
  const handleContentChange = useCallback(
    (content: string) => {
      if (!currentProject) return;
      const file = currentProject.files[activeTab];
      if (file) {
        updateFile(file.name, content);
        refreshPreview();
      }
    },
    [currentProject, activeTab, updateFile, refreshPreview]
  );

  // Command palette commands
  const commands: PaletteCommand[] = useMemo(
    () => [
      // View commands
      {
        id: "toggle-preview",
        label: showPreview ? "Hide Preview" : "Show Preview",
        description: "Toggle the live preview panel",
        shortcut: "Ctrl+P",
        icon: showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />,
        action: () => setShowPreview(!showPreview),
        category: "View",
      },
      {
        id: "toggle-fullscreen",
        label: isPreviewFullscreen ? "Exit Fullscreen Preview" : "Fullscreen Preview",
        description: "Toggle fullscreen mode for preview",
        icon: isPreviewFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />,
        action: () => setIsPreviewFullscreen(!isPreviewFullscreen),
        category: "View",
      },
      {
        id: "refresh-preview",
        label: "Refresh Preview",
        description: "Reload the preview iframe",
        shortcut: "Ctrl+R",
        icon: <RefreshCw className="h-4 w-4" />,
        action: () => setPreviewKey((k) => k + 1),
        category: "View",
      },
      // File commands
      ...(currentProject?.files.map((file, index) => ({
        id: `switch-to-${file.name}`,
        label: `Switch to ${file.name}`,
        description: `Open ${file.language.toUpperCase()} file`,
        icon: <Code className="h-4 w-4" />,
        action: () => setActiveTab(index),
        category: "Files",
      })) || []),
      // Theme commands
      {
        id: "theme-light",
        label: "Light Theme",
        description: "Switch to Catppuccin Latte",
        icon: <Sun className="h-4 w-4" />,
        action: () => setThemeMode("light"),
        category: "Theme",
      },
      {
        id: "theme-dark",
        label: "Dark Theme",
        description: "Switch to Catppuccin Mocha",
        icon: <Moon className="h-4 w-4" />,
        action: () => setThemeMode("dark"),
        category: "Theme",
      },
      {
        id: "theme-system",
        label: "System Theme",
        description: "Follow system preference",
        icon: <Monitor className="h-4 w-4" />,
        action: () => setThemeMode("system"),
        category: "Theme",
      },
      // Settings
      {
        id: "open-settings",
        label: "Open Settings",
        description: "Configure editor preferences",
        shortcut: "Ctrl+,",
        icon: <SettingsIcon className="h-4 w-4" />,
        action: () => setShowSettings(true),
        category: "Settings",
      },
    ],
    [showPreview, isPreviewFullscreen, currentProject?.files, setThemeMode]
  );

  if (isLoading || !currentProject) {
    return (
      <div className="flex h-screen items-center justify-center bg-base">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
          <p className="font-mono text-sm text-text-muted">Loading project...</p>
        </div>
      </div>
    );
  }

  const activeFile = currentProject.files[activeTab];
  const previewHtml = generatePreviewHtml(currentProject.files);

  return (
    <div className="flex h-screen flex-col bg-crust">
      {/* Header toolbar */}
      <header className="flex h-11 flex-shrink-0 items-center justify-between border-b border-border bg-mantle px-4">
        <div className="flex items-center gap-3">
          <FileCode className="h-4 w-4 text-accent" strokeWidth={1.5} />
          <span className="font-mono text-sm font-medium text-text">
            {currentProject.name}
          </span>
          <span className="rounded bg-surface-0 px-2 py-0.5 font-mono text-xs text-text-muted">
            Web
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
              showPreview
                ? "bg-accent/10 text-accent"
                : "text-text-muted hover:bg-surface-0 hover:text-text"
            }`}
          >
            {showPreview ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
            Preview
          </button>

          <button
            onClick={() => setPreviewKey((k) => k + 1)}
            className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-0 hover:text-text"
            title="Refresh preview"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <div className="mx-2 h-4 w-px bg-border" />

          <button
            onClick={() => setShowSettings(true)}
            className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-0 hover:text-text"
            title="Settings"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor panel */}
        <div
          className={`flex flex-col overflow-hidden border-r border-border transition-all ${
            showPreview ? (isPreviewFullscreen ? "w-0" : "w-1/2") : "w-full"
          }`}
        >
          {/* File tabs */}
          <div className="flex h-10 flex-shrink-0 items-center gap-0.5 border-b border-border bg-mantle px-2">
            {currentProject.files.map((file, index) => {
              const config = FILE_CONFIG[file.language] || {
                icon: "?",
                color: "var(--color-text-muted)",
              };
              const isActive = index === activeTab;

              return (
                <button
                  key={file.name}
                  onClick={() => setActiveTab(index)}
                  className={`group relative flex items-center gap-2 rounded-t-md px-4 py-2 font-mono text-xs transition-all ${
                    isActive
                      ? "bg-base text-text"
                      : "text-text-muted hover:bg-surface-0/50 hover:text-text"
                  }`}
                >
                  {/* Language badge */}
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${config.color} 15%, transparent)`,
                      color: config.color,
                    }}
                  >
                    {config.icon}
                  </span>

                  <span>{file.name}</span>

                  {/* Active indicator */}
                  {isActive && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ backgroundColor: config.color }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Code editor */}
          <div className="flex-1 overflow-hidden bg-base">
            {activeFile && (
              <CodeEditor
                key={`${activeFile.name}-${activeTab}`}
                value={activeFile.content}
                language={activeFile.language}
                onChange={handleContentChange}
              />
            )}
          </div>
        </div>

        {/* Preview panel */}
        {showPreview && (
          <div
            className={`flex flex-col overflow-hidden transition-all ${
              isPreviewFullscreen ? "w-full" : "w-1/2"
            }`}
          >
            {/* Preview header */}
            <div className="flex h-10 flex-shrink-0 items-center justify-between border-b border-border bg-mantle px-4">
              <div className="flex items-center gap-2">
                <Eye className="h-3.5 w-3.5 text-text-muted" />
                <span className="font-mono text-xs text-text-muted">
                  Live Preview
                </span>
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsPreviewFullscreen(!isPreviewFullscreen)}
                  className="rounded p-1 text-text-muted transition-colors hover:bg-surface-0 hover:text-text"
                  title={isPreviewFullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  {isPreviewFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Preview iframe */}
            <div className="flex-1 bg-white">
              <iframe
                ref={iframeRef}
                key={previewKey}
                className="h-full w-full"
                sandbox="allow-scripts allow-modals"
                srcDoc={previewHtml}
                title="Preview"
              />
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <footer className="flex h-6 flex-shrink-0 items-center justify-between border-t border-border bg-mantle px-4">
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-text-subtle">
            {activeFile?.language.toUpperCase()}
          </span>
          <span className="font-mono text-xs text-text-subtle">UTF-8</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-text-subtle">
            {activeFile?.content.split("\n").length} lines
          </span>
        </div>
      </footer>

      {/* Settings Modal */}
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
        commands={commands}
      />
    </div>
  );
}

function generatePreviewHtml(
  files: { name: string; content: string; language: string }[]
): string {
  const html = files.find((f) => f.language === "html")?.content || "";
  const css = files.find((f) => f.language === "css")?.content || "";
  const js = files.find((f) => f.language === "javascript")?.content || "";

  // Inject CSS and JS into HTML
  let result = html;

  // Replace stylesheet link with inline style
  if (result.includes('<link rel="stylesheet"')) {
    result = result.replace(
      /<link[^>]*rel="stylesheet"[^>]*>/gi,
      `<style>${css}</style>`
    );
  } else if (css) {
    // Add style tag to head if no link exists
    result = result.replace("</head>", `<style>${css}</style></head>`);
  }

  // Replace script src with inline script
  if (result.includes("<script src=")) {
    result = result.replace(
      /<script[^>]*src="[^"]*"[^>]*><\/script>/gi,
      `<script>${js}</script>`
    );
  } else if (js) {
    // Add script tag before body close if no script exists
    result = result.replace("</body>", `<script>${js}</script></body>`);
  }

  // Add error handling wrapper
  result = result.replace(
    "</head>",
    `<script>
      window.onerror = function(msg, url, line) {
        console.error('Error:', msg, 'at line', line);
        return false;
      };
    </script></head>`
  );

  return result;
}
