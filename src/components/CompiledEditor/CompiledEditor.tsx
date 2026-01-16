import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CommandPalette,
  useCommandPalette,
  type PaletteCommand,
} from "@/components/CommandPalette";
import { useProjectStore } from "@/stores/projectStore";
import {
  CodeEditor,
  ToastContainer,
  useToast,
  ConfirmDialog,
  SaveTemplateDialog,
  KeyboardShortcuts,
  TitleBar,
  MenuBar,
  useEditorMenus,
} from "@/components/common";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  Play,
  Square,
  Terminal,
  FileCode,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronUp,
  ChevronDown,
  X,
  Copy,
  Bookmark,
  Keyboard,
} from "lucide-react";
import {
  useProjectLoader,
  useAutosave,
  useMenuEvents,
  useThemeCommands,
  useUnsavedChanges,
  useWindowTitle,
  useKeyboardShortcuts,
  useWindowState,
} from "@/hooks";

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

interface ExecutionOutput {
  line: string;
  stream: "stdout" | "stderr";
}

const LANGUAGE_CONFIG: Record<string, { name: string; color: string; executor: string }> = {
  node: { name: "Node.js", color: "var(--color-template-node)", executor: "execute_node" },
  python: { name: "Python", color: "var(--color-template-python)", executor: "execute_python" },
  rust: { name: "Rust", color: "var(--color-template-rust)", executor: "execute_rust" },
  java: { name: "Java", color: "var(--color-template-java)", executor: "execute_java" },
  typescript: {
    name: "TypeScript",
    color: "var(--color-template-react)",
    executor: "execute_typescript",
  },
};

export function CompiledEditor() {
  const {
    currentProject,
    updateFile,
    saveAsTemplate,
    saveProject,
    saveProjectAs,
    openProjectInNewWindow,
  } = useProjectStore();
  const isDirty = useProjectStore((state) => state.isDirty);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [streamingOutput, setStreamingOutput] = useState({ stdout: "", stderr: "" });
  const [showOutput, setShowOutput] = useState(true);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const toast = useToast();
  const unsavedChanges = useUnsavedChanges();
  const commandPalette = useCommandPalette();
  const outputHeight = 200;

  // Use shared hooks
  const { isLoading, projectId, templateType } = useProjectLoader("node");
  const { isMaximized } = useWindowState();
  useAutosave();
  useWindowTitle();

  const config = LANGUAGE_CONFIG[templateType] || LANGUAGE_CONFIG.node;
  const windowId = `editor-${projectId}`;

  // Execution handlers
  const handleRun = useCallback(async () => {
    if (!currentProject || isRunning) return;
    const file = currentProject.files[0];
    if (!file) return;

    setIsRunning(true);
    setResult(null);
    setStreamingOutput({ stdout: "", stderr: "" });
    setShowOutput(true);

    try {
      await invoke(config.executor, { code: file.content, windowId });
    } catch (error) {
      setResult({ stdout: "", stderr: String(error), exitCode: -1, durationMs: 0 });
      setIsRunning(false);
    }
  }, [currentProject, isRunning, config.executor, windowId]);

  const handleStop = useCallback(async () => {
    if (!isRunning) return;
    try {
      await invoke("stop_execution", { windowId });
      setIsRunning(false);
    } catch (error) {
      console.error("Failed to stop execution:", error);
    }
  }, [isRunning, windowId]);

  // Use shared menu events hook
  useMenuEvents({
    onRun: handleRun,
    onStop: handleStop,
    onToggleOutput: () => setShowOutput((prev) => !prev),
    onSaveAsTemplate: () => setShowSaveTemplate(true),
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSave: saveProject,
    onSaveAs: saveProjectAs,
    onOpen: openProjectInNewWindow,
    onToggleOutput: () => setShowOutput((prev) => !prev),
    onRun: handleRun,
    onStop: handleStop,
  });

  // Open settings window
  const openSettings = useCallback(async () => {
    await invoke("open_settings_window");
  }, []);

  // Listen for execution events from backend (window-specific)
  useEffect(() => {
    const appWindow = getCurrentWindow();

    const unlistenStateChange = appWindow.listen<boolean>("execution:state-changed", (event) => {
      setIsRunning(event.payload);
    });

    const unlistenOutput = appWindow.listen<ExecutionOutput>("execution:output", (event) => {
      const { line, stream } = event.payload;
      setStreamingOutput((prev) => ({ ...prev, [stream]: prev[stream] + line }));
    });

    const unlistenCompleted = appWindow.listen<ExecutionResult>("execution:completed", (event) => {
      setResult(event.payload);
      setIsRunning(false);
    });

    return () => {
      unlistenStateChange.then((fn) => fn());
      unlistenOutput.then((fn) => fn());
      unlistenCompleted.then((fn) => fn());
    };
  }, []);

  // Global keyboard shortcut for help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show keyboard shortcuts with "?" key (when not in input/editor)
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        const isEditing =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.closest(".cm-editor");
        if (!isEditing) {
          e.preventDefault();
          setShowKeyboardShortcuts(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleContentChange = useCallback(
    (content: string) => {
      if (!currentProject) return;
      const file = currentProject.files[0];
      if (file) updateFile(file.name, content);
    },
    [currentProject, updateFile]
  );

  // Theme commands from shared hook
  const themeCommands = useThemeCommands({ onOpenSettings: openSettings });

  // Handle save as template
  const handleSaveAsTemplate = useCallback(
    async (name: string, icon: string) => {
      const success = await saveAsTemplate(name, icon);
      if (success) {
        toast.success("Template saved successfully");
      } else {
        toast.error("Failed to save template");
      }
    },
    [saveAsTemplate, toast]
  );

  // Command palette commands
  const commands: PaletteCommand[] = useMemo(
    () => [
      {
        id: "run-code",
        label: "Run Code",
        description: "Execute the current code",
        shortcut: "Ctrl+Enter",
        icon: <Play className="h-4 w-4" />,
        action: handleRun,
        category: "Run",
      },
      {
        id: "clear-output",
        label: "Clear Output",
        description: "Clear the output panel",
        icon: <Terminal className="h-4 w-4" />,
        action: () => setResult(null),
        category: "Run",
      },
      {
        id: "toggle-output",
        label: showOutput ? "Hide Output" : "Show Output",
        description: "Toggle the output panel",
        icon: <Terminal className="h-4 w-4" />,
        action: () => setShowOutput(!showOutput),
        category: "View",
      },
      {
        id: "save-as-template",
        label: "Save as Template",
        description: "Save current note as a reusable template",
        icon: <Bookmark className="h-4 w-4" />,
        action: () => setShowSaveTemplate(true),
        category: "File",
      },
      {
        id: "keyboard-shortcuts",
        label: "Keyboard Shortcuts",
        description: "View all keyboard shortcuts",
        shortcut: "?",
        icon: <Keyboard className="h-4 w-4" />,
        action: () => setShowKeyboardShortcuts(true),
        category: "Help",
      },
      ...themeCommands,
    ],
    [showOutput, handleRun, themeCommands]
  );

  // Menu bar configuration - must be before early return to follow Rules of Hooks
  const menus = useEditorMenus({
    isWebEditor: false,
    isRunning,
    onSave: saveProject,
    onSaveAs: saveProjectAs,
    onSaveAsTemplate: () => setShowSaveTemplate(true),
    onOpen: openProjectInNewWindow,
    onToggleOutput: () => setShowOutput((prev) => !prev),
    onRun: handleRun,
    onStop: handleStop,
    onSettings: openSettings,
  });

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

  const file = currentProject.files[0];

  return (
    <div className={`window-frame ${isMaximized ? "maximized" : ""}`}>
      <div className="window-container flex flex-col bg-crust">
        <TitleBar
          title={currentProject.name}
          subtitle={config.name}
          isDirty={isDirty}
          icon={<FileCode className="h-4 w-4 text-accent" strokeWidth={1.5} />}
        >
          <MenuBar menus={menus} className="ml-2" />

          <div className="ml-auto flex items-center gap-2 pr-2">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-2 rounded-md bg-success/10 px-4 py-1.5 font-mono text-xs font-medium text-success transition-all hover:bg-success/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRunning ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              {isRunning ? "Running..." : "Run"}
            </button>

            {isRunning && (
              <button
                onClick={handleStop}
                className="flex items-center gap-2 rounded-md bg-error/10 px-3 py-1.5 font-mono text-xs font-medium text-error transition-all hover:bg-error/20"
              >
                <Square className="h-3.5 w-3.5" />
                Stop
              </button>
            )}

            <button
              onClick={() => setShowOutput(!showOutput)}
              className={`flex items-center gap-2 rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
                showOutput
                  ? "bg-surface-0 text-text"
                  : "text-text-muted hover:bg-surface-0 hover:text-text"
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              Output
              {showOutput ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            </button>
          </div>
        </TitleBar>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div
            className="flex-1 overflow-hidden bg-base"
            style={{ height: showOutput ? `calc(100% - ${outputHeight}px)` : "100%" }}
          >
            {file && (
              <CodeEditor
                value={file.content}
                language={file.language}
                onChange={handleContentChange}
              />
            )}
          </div>

          {showOutput && (
            <OutputPanel
              height={outputHeight}
              result={result}
              streamingOutput={streamingOutput}
              isRunning={isRunning}
              onClear={() => {
                setResult(null);
                setStreamingOutput({ stdout: "", stderr: "" });
              }}
              onClose={() => setShowOutput(false)}
              onCopy={async () => {
                const output = result
                  ? `${result.stdout}${result.stderr}`
                  : `${streamingOutput.stdout}${streamingOutput.stderr}`;
                if (output) {
                  await navigator.clipboard.writeText(output);
                  toast.success("Output copied to clipboard");
                }
              }}
            />
          )}
        </div>

        <StatusBar language={file?.language} lineCount={file?.content.split("\n").length} />

        <CommandPalette
          isOpen={commandPalette.isOpen}
          onClose={commandPalette.close}
          commands={commands}
        />

        <ToastContainer toasts={toast.toasts} onDismiss={toast.dismissToast} />

        <ConfirmDialog
          isOpen={unsavedChanges.showDialog}
          title="Unsaved Changes"
          message="You have unsaved changes. Do you want to save before closing?"
          confirmLabel="Save"
          cancelLabel="Cancel"
          onConfirm={unsavedChanges.handleSave}
          onCancel={unsavedChanges.handleCancel}
          extraAction={{
            label: "Don't Save",
            onClick: unsavedChanges.handleDiscard,
          }}
        />

        <SaveTemplateDialog
          isOpen={showSaveTemplate}
          onClose={() => setShowSaveTemplate(false)}
          onSave={handleSaveAsTemplate}
          defaultName={currentProject.name !== "Untitled" ? currentProject.name : ""}
        />

        <KeyboardShortcuts
          isOpen={showKeyboardShortcuts}
          onClose={() => setShowKeyboardShortcuts(false)}
        />
      </div>
    </div>
  );
}

// --- Sub-components extracted for clarity ---

interface OutputPanelProps {
  height: number;
  result: ExecutionResult | null;
  streamingOutput: { stdout: string; stderr: string };
  isRunning: boolean;
  onClear: () => void;
  onClose: () => void;
  onCopy: () => void;
}

function OutputPanel({
  height,
  result,
  streamingOutput,
  isRunning,
  onClear,
  onClose,
  onCopy,
}: OutputPanelProps) {
  const hasOutput =
    result?.stdout || result?.stderr || streamingOutput.stdout || streamingOutput.stderr;
  return (
    <div className="flex flex-col border-t border-border bg-mantle" style={{ height }}>
      <div className="flex h-9 flex-shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-3">
          <Terminal className="h-3.5 w-3.5 text-text-muted" />
          <span className="font-mono text-xs text-text-muted">Output</span>

          {result && (
            <>
              {result.exitCode === 0 ? (
                <div className="flex items-center gap-1.5 text-success">
                  <CheckCircle className="h-3 w-3" />
                  <span className="font-mono text-xs">Success</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-error">
                  <AlertCircle className="h-3 w-3" />
                  <span className="font-mono text-xs">Exit code: {result.exitCode}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-text-subtle">
                <Clock className="h-3 w-3" />
                <span className="font-mono text-xs">{result.durationMs}ms</span>
              </div>
            </>
          )}

          {isRunning && (
            <div className="flex items-center gap-1.5 text-accent">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="font-mono text-xs">Executing...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasOutput && (
            <button
              onClick={onCopy}
              className="flex items-center gap-1 font-mono text-xs text-text-subtle transition-colors hover:text-text-muted"
              title="Copy output"
            >
              <Copy className="h-3 w-3" />
              Copy
            </button>
          )}
          <button
            onClick={onClear}
            className="font-mono text-xs text-text-subtle transition-colors hover:text-text-muted"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-subtle transition-colors hover:bg-surface-0 hover:text-text-muted"
            title="Close output panel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {!result && !isRunning && (
          <p className="font-mono text-xs text-text-subtle">
            Press{" "}
            <kbd className="rounded bg-surface-0 px-1.5 py-0.5 text-text-muted">Ctrl+Enter</kbd> or
            click Run to execute your code
          </p>
        )}

        {isRunning && (streamingOutput.stdout || streamingOutput.stderr) && (
          <div className="space-y-2">
            {streamingOutput.stdout && (
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-text">
                {streamingOutput.stdout}
              </pre>
            )}
            {streamingOutput.stderr && (
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-error">
                {streamingOutput.stderr}
              </pre>
            )}
          </div>
        )}

        {result && !isRunning && (
          <div className="space-y-2">
            {result.stdout && (
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-text">
                {result.stdout}
              </pre>
            )}
            {result.stderr && (
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-error">
                {result.stderr}
              </pre>
            )}
            {!result.stdout && !result.stderr && (
              <p className="font-mono text-xs text-text-subtle">(No output)</p>
            )}
          </div>
        )}
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
