import { useState, useCallback, useRef, useMemo } from "react";
import { Settings } from "@/components/Settings";
import { About } from "@/components/About";
import {
  CommandPalette,
  useCommandPalette,
  type PaletteCommand,
} from "@/components/CommandPalette";
import { useProjectStore } from "@/stores/projectStore";
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
  Code,
} from "lucide-react";
import { useProjectLoader, useAutosave, useMenuEvents, useThemeCommands } from "@/hooks";

const FILE_CONFIG: Record<string, { icon: string; color: string }> = {
  html: { icon: "HTML", color: "var(--color-template-web)" },
  css: { icon: "CSS", color: "var(--color-accent)" },
  javascript: { icon: "JS", color: "var(--color-template-python)" },
  typescript: { icon: "TS", color: "var(--color-template-react)" },
};

export function WebEditor() {
  const { currentProject, updateFile } = useProjectStore();
  const [activeTab, setActiveTab] = useState(0);
  const [showPreview, setShowPreview] = useState(true);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const commandPalette = useCommandPalette();

  // Use shared hooks
  const { isLoading } = useProjectLoader("web");
  useAutosave();
  useMenuEvents({
    onTogglePreview: () => setShowPreview((prev) => !prev),
    onAbout: () => setShowAbout(true),
  });

  // Debounced preview refresh
  const refreshPreview = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => setPreviewKey((k) => k + 1), 500);
  }, []);

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

  // Theme commands from shared hook
  const themeCommands = useThemeCommands({ onOpenSettings: () => setShowSettings(true) });

  // Command palette commands
  const commands: PaletteCommand[] = useMemo(
    () => [
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
        icon: isPreviewFullscreen ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        ),
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
      ...(currentProject?.files.map((file, index) => ({
        id: `switch-to-${file.name}`,
        label: `Switch to ${file.name}`,
        description: `Open ${file.language.toUpperCase()} file`,
        icon: <Code className="h-4 w-4" />,
        action: () => setActiveTab(index),
        category: "Files",
      })) || []),
      ...themeCommands,
    ],
    [showPreview, isPreviewFullscreen, currentProject?.files, themeCommands]
  );

  if (isLoading || !currentProject) {
    return (
      <div className="flex h-screen items-center justify-center bg-base">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
          <p className="font-mono text-sm text-text-muted">Loading note...</p>
        </div>
      </div>
    );
  }

  const activeFile = currentProject.files[activeTab];
  const previewHtml = generatePreviewHtml(currentProject.files);

  return (
    <div className="flex h-screen flex-col bg-crust">
      <WebEditorHeader
        projectName={currentProject.name}
        showPreview={showPreview}
        onTogglePreview={() => setShowPreview(!showPreview)}
        onRefreshPreview={() => setPreviewKey((k) => k + 1)}
        onOpenSettings={() => setShowSettings(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Editor panel */}
        <div
          className={`flex flex-col overflow-hidden border-r border-border transition-all ${
            showPreview ? (isPreviewFullscreen ? "w-0" : "w-1/2") : "w-full"
          }`}
        >
          <FileTabs files={currentProject.files} activeTab={activeTab} onTabChange={setActiveTab} />

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
          <PreviewPanel
            isFullscreen={isPreviewFullscreen}
            previewKey={previewKey}
            previewHtml={previewHtml}
            iframeRef={iframeRef}
            onToggleFullscreen={() => setIsPreviewFullscreen(!isPreviewFullscreen)}
          />
        )}
      </div>

      <StatusBar
        language={activeFile?.language}
        lineCount={activeFile?.content.split("\n").length}
      />

      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <About isOpen={showAbout} onClose={() => setShowAbout(false)} />
      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
        commands={commands}
      />
    </div>
  );
}

// --- Sub-components ---

interface WebEditorHeaderProps {
  projectName: string;
  showPreview: boolean;
  onTogglePreview: () => void;
  onRefreshPreview: () => void;
  onOpenSettings: () => void;
}

function WebEditorHeader({
  projectName,
  showPreview,
  onTogglePreview,
  onRefreshPreview,
  onOpenSettings,
}: WebEditorHeaderProps) {
  return (
    <header className="flex h-11 flex-shrink-0 items-center justify-between border-b border-border bg-mantle px-4">
      <div className="flex items-center gap-3">
        <FileCode className="h-4 w-4 text-accent" strokeWidth={1.5} />
        <span className="font-mono text-sm font-medium text-text">{projectName}</span>
        <span className="rounded bg-surface-0 px-2 py-0.5 font-mono text-xs text-text-muted">
          Web
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePreview}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
            showPreview
              ? "bg-accent/10 text-accent"
              : "text-text-muted hover:bg-surface-0 hover:text-text"
          }`}
        >
          {showPreview ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          Preview
        </button>

        <button
          onClick={onRefreshPreview}
          className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-0 hover:text-text"
          title="Refresh preview"
        >
          <RefreshCw className="h-4 w-4" />
        </button>

        <div className="mx-2 h-4 w-px bg-border" />

        <button
          onClick={onOpenSettings}
          className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-0 hover:text-text"
          title="Settings"
        >
          <SettingsIcon className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

interface FileTabsProps {
  files: { name: string; language: string }[];
  activeTab: number;
  onTabChange: (index: number) => void;
}

function FileTabs({ files, activeTab, onTabChange }: FileTabsProps) {
  return (
    <div className="flex h-10 flex-shrink-0 items-center gap-0.5 border-b border-border bg-mantle px-2">
      {files.map((file, index) => {
        const config = FILE_CONFIG[file.language] || {
          icon: "?",
          color: "var(--color-text-muted)",
        };
        const isActive = index === activeTab;

        return (
          <button
            key={file.name}
            onClick={() => onTabChange(index)}
            className={`group relative flex items-center gap-2 rounded-t-md px-4 py-2 font-mono text-xs transition-all ${
              isActive
                ? "bg-base text-text"
                : "text-text-muted hover:bg-surface-0/50 hover:text-text"
            }`}
          >
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
  );
}

interface PreviewPanelProps {
  isFullscreen: boolean;
  previewKey: number;
  previewHtml: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  onToggleFullscreen: () => void;
}

function PreviewPanel({
  isFullscreen,
  previewKey,
  previewHtml,
  iframeRef,
  onToggleFullscreen,
}: PreviewPanelProps) {
  return (
    <div
      className={`flex flex-col overflow-hidden transition-all ${isFullscreen ? "w-full" : "w-1/2"}`}
    >
      <div className="flex h-10 flex-shrink-0 items-center justify-between border-b border-border bg-mantle px-4">
        <div className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-text-muted" />
          <span className="font-mono text-xs text-text-muted">Live Preview</span>
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
        </div>

        <button
          onClick={onToggleFullscreen}
          className="rounded p-1 text-text-muted transition-colors hover:bg-surface-0 hover:text-text"
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

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
  );
}

interface StatusBarProps {
  language: string | undefined;
  lineCount: number | undefined;
}

function StatusBar({ language, lineCount }: StatusBarProps) {
  return (
    <footer className="flex h-6 flex-shrink-0 items-center justify-between border-t border-border bg-mantle px-4">
      <div className="flex items-center gap-4">
        <span className="font-mono text-xs text-text-subtle">{language?.toUpperCase()}</span>
        <span className="font-mono text-xs text-text-subtle">UTF-8</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-mono text-xs text-text-subtle">{lineCount} lines</span>
      </div>
    </footer>
  );
}

// --- Utility functions ---

function generatePreviewHtml(files: { name: string; content: string; language: string }[]): string {
  const html = files.find((f) => f.language === "html")?.content || "";
  const css = files.find((f) => f.language === "css")?.content || "";
  const js = files.find((f) => f.language === "javascript")?.content || "";

  let result = html;

  // Replace stylesheet link with inline style
  if (result.includes('<link rel="stylesheet"')) {
    result = result.replace(/<link[^>]*rel="stylesheet"[^>]*>/gi, `<style>${css}</style>`);
  } else if (css) {
    result = result.replace("</head>", `<style>${css}</style></head>`);
  }

  // Replace script src with inline script
  if (result.includes("<script src=")) {
    result = result.replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/gi, `<script>${js}</script>`);
  } else if (js) {
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
