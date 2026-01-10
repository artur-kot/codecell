import { useState, useEffect, useCallback } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { CodeEditor } from "@/components/common/CodeEditor";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  Play,
  Terminal,
  FileCode,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { TemplateType, Project } from "@/types";

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

const LANGUAGE_CONFIG: Record<
  string,
  { name: string; color: string; executor: string }
> = {
  node: {
    name: "Node.js",
    color: "var(--color-template-node)",
    executor: "execute_node",
  },
  python: {
    name: "Python",
    color: "var(--color-template-python)",
    executor: "execute_python",
  },
  rust: {
    name: "Rust",
    color: "var(--color-template-rust)",
    executor: "execute_rust",
  },
  java: {
    name: "Java",
    color: "var(--color-template-java)",
    executor: "execute_java",
  },
  typescript: {
    name: "TypeScript",
    color: "var(--color-template-react)",
    executor: "execute_typescript",
  },
};

export function CompiledEditor() {
  const { currentProject, setCurrentProject, updateFile } = useProjectStore();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [showOutput, setShowOutput] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const outputHeight = 200;

  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("projectId");
  const templateType = (params.get("type") || "node") as TemplateType;
  const config = LANGUAGE_CONFIG[templateType] || LANGUAGE_CONFIG.node;

  // Load project from temp storage on mount
  useEffect(() => {
    const loadProject = async () => {
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
  }, [projectId, currentProject, setCurrentProject]);

  // Listen for menu events
  useEffect(() => {
    const unlistenRun = listen("menu:run-code", () => {
      handleRun();
    });

    const unlistenToggleOutput = listen("menu:toggle-output", () => {
      setShowOutput((prev) => !prev);
    });

    return () => {
      unlistenRun.then((fn) => fn());
      unlistenToggleOutput.then((fn) => fn());
    };
  }, [currentProject]);

  const handleRun = useCallback(async () => {
    if (!currentProject || isRunning) return;

    const file = currentProject.files[0];
    if (!file) return;

    setIsRunning(true);
    setResult(null);
    setShowOutput(true);

    try {
      const execResult = await invoke<ExecutionResult>(config.executor, {
        code: file.content,
      });
      setResult(execResult);
    } catch (error) {
      setResult({
        stdout: "",
        stderr: String(error),
        exitCode: -1,
        durationMs: 0,
      });
    } finally {
      setIsRunning(false);
    }
  }, [currentProject, isRunning, config.executor]);

  const handleContentChange = useCallback(
    (content: string) => {
      if (!currentProject) return;
      const file = currentProject.files[0];
      if (file) {
        updateFile(file.name, content);
      }
    },
    [currentProject, updateFile]
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

  const file = currentProject.files[0];

  return (
    <div className="flex h-screen flex-col bg-crust">
      {/* Header toolbar */}
      <header className="flex h-11 flex-shrink-0 items-center justify-between border-b border-border bg-mantle px-4">
        <div className="flex items-center gap-3">
          <FileCode className="h-4 w-4 text-accent" strokeWidth={1.5} />
          <span className="font-mono text-sm font-medium text-text">
            {currentProject.name}
          </span>
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
            {showOutput ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            )}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Editor */}
        <div
          className="flex-1 overflow-hidden bg-base"
          style={{
            height: showOutput ? `calc(100% - ${outputHeight}px)` : "100%",
          }}
        >
          {file && (
            <CodeEditor
              value={file.content}
              language={file.language}
              onChange={handleContentChange}
            />
          )}
        </div>

        {/* Output panel */}
        {showOutput && (
          <div
            className="flex flex-col border-t border-border bg-mantle"
            style={{ height: outputHeight }}
          >
            {/* Output header */}
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
                        <span className="font-mono text-xs">
                          Exit code: {result.exitCode}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-text-subtle">
                      <Clock className="h-3 w-3" />
                      <span className="font-mono text-xs">
                        {result.durationMs}ms
                      </span>
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

              <button
                onClick={() => setResult(null)}
                className="font-mono text-xs text-text-subtle transition-colors hover:text-text-muted"
              >
                Clear
              </button>
            </div>

            {/* Output content */}
            <div className="flex-1 overflow-auto p-4">
              {!result && !isRunning && (
                <p className="font-mono text-xs text-text-subtle">
                  Press{" "}
                  <kbd className="rounded bg-surface-0 px-1.5 py-0.5 text-text-muted">
                    Ctrl+Enter
                  </kbd>{" "}
                  or click Run to execute your code
                </p>
              )}

              {result && (
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
                    <p className="font-mono text-xs text-text-subtle">
                      (No output)
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <footer className="flex h-6 flex-shrink-0 items-center justify-between border-t border-border bg-mantle px-4">
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-text-subtle">
            {file?.language.toUpperCase()}
          </span>
          <span className="font-mono text-xs text-text-subtle">UTF-8</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-text-subtle">
            {file?.content.split("\n").length} lines
          </span>
        </div>
      </footer>
    </div>
  );
}
