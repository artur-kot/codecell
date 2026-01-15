import { useState, useEffect, useCallback, useMemo } from "react";
import { Settings } from "@/components/Settings";
import { About } from "@/components/About";
import {
  CommandPalette,
  useCommandPalette,
  type PaletteCommand,
} from "@/components/CommandPalette";
import { useProjectStore } from "@/stores/projectStore";
import { CodeEditor } from "@/components/common";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
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
  Settings as SettingsIcon,
  X,
} from "lucide-react";
import { useProjectLoader, useAutosave, useMenuEvents, useThemeCommands } from "@/hooks";

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
  const { currentProject, updateFile } = useProjectStore();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [streamingOutput, setStreamingOutput] = useState({ stdout: "", stderr: "" });
  const [showOutput, setShowOutput] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const commandPalette = useCommandPalette();
  const outputHeight = 200;

  // Use shared hooks
  const { isLoading, projectId, templateType } = useProjectLoader("node");
  useAutosave();

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
    onAbout: () => setShowAbout(true),
  });

  // Listen for execution events from backend
  useEffect(() => {
    const unlistenStateChange = listen<boolean>("execution:state-changed", (event) => {
      setIsRunning(event.payload);
    });

    const unlistenOutput = listen<ExecutionOutput>("execution:output", (event) => {
      const { line, stream } = event.payload;
      setStreamingOutput((prev) => ({ ...prev, [stream]: prev[stream] + line }));
    });

    const unlistenCompleted = listen<ExecutionResult>("execution:completed", (event) => {
      setResult(event.payload);
      setIsRunning(false);
    });

    return () => {
      unlistenStateChange.then((fn) => fn());
      unlistenOutput.then((fn) => fn());
      unlistenCompleted.then((fn) => fn());
    };
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
  const themeCommands = useThemeCommands({ onOpenSettings: () => setShowSettings(true) });

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
      ...themeCommands,
    ],
    [showOutput, handleRun, themeCommands]
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

  const file = currentProject.files[0];

  return (
    <div className="flex h-screen flex-col bg-crust">
      <EditorHeader
        projectName={currentProject.name}
        config={config}
        isRunning={isRunning}
        showOutput={showOutput}
        onRun={handleRun}
        onStop={handleStop}
        onToggleOutput={() => setShowOutput(!showOutput)}
        onOpenSettings={() => setShowSettings(true)}
      />

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
            onClear={() => setResult(null)}
            onClose={() => setShowOutput(false)}
          />
        )}
      </div>

      <StatusBar language={file?.language} lineCount={file?.content.split("\n").length} />

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

// --- Sub-components extracted for clarity ---

interface EditorHeaderProps {
  projectName: string;
  config: { name: string; color: string };
  isRunning: boolean;
  showOutput: boolean;
  onRun: () => void;
  onStop: () => void;
  onToggleOutput: () => void;
  onOpenSettings: () => void;
}

function EditorHeader({
  projectName,
  config,
  isRunning,
  showOutput,
  onRun,
  onStop,
  onToggleOutput,
  onOpenSettings,
}: EditorHeaderProps) {
  return (
    <header className="flex h-11 flex-shrink-0 items-center justify-between border-b border-border bg-mantle px-4">
      <div className="flex items-center gap-3">
        <FileCode className="h-4 w-4 text-accent" strokeWidth={1.5} />
        <span className="font-mono text-sm font-medium text-text">{projectName}</span>
        <span
          className="rounded px-2 py-0.5 font-mono text-xs font-medium"
          style={{
            backgroundColor: `color-mix(in srgb, ${config.color} 15%, transparent)`,
            color: config.color,
          }}
        >
          {config.name}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRun}
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
            onClick={onStop}
            className="flex items-center gap-2 rounded-md bg-error/10 px-3 py-1.5 font-mono text-xs font-medium text-error transition-all hover:bg-error/20"
          >
            <Square className="h-3.5 w-3.5" />
            Stop
          </button>
        )}

        <button
          onClick={onToggleOutput}
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

interface OutputPanelProps {
  height: number;
  result: ExecutionResult | null;
  streamingOutput: { stdout: string; stderr: string };
  isRunning: boolean;
  onClear: () => void;
  onClose: () => void;
}

function OutputPanel({
  height,
  result,
  streamingOutput,
  isRunning,
  onClear,
  onClose,
}: OutputPanelProps) {
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
