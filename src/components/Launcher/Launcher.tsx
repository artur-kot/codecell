import { useState, useEffect } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { QuickTemplates } from "./QuickTemplates";
import { RecentProjects } from "./RecentProjects";
import { ThemeToggle } from "@/components/common";
import { Settings } from "@/components/Settings";
import { About } from "@/components/About";
import { Plus, Hexagon, Settings as SettingsIcon } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import type { TemplateType, WebTemplateConfig } from "@/types";

export function Launcher() {
  const { loadRecentProjects, loadQuickTemplates, createProject } =
    useProjectStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    loadRecentProjects();
    loadQuickTemplates();
  }, [loadRecentProjects, loadQuickTemplates]);

  // Listen for menu events
  useEffect(() => {
    const unlistenAbout = listen("menu:about", () => {
      setShowAbout(true);
    });

    const unlistenReportIssue = listen("menu:report-issue", () => {
      window.open("mailto:artur.kot@outlook.com?subject=CodeCell%20Feedback", "_blank");
    });

    const unlistenDocumentation = listen("menu:documentation", () => {
      window.open("https://github.com/arturkot/codecell", "_blank");
    });

    return () => {
      unlistenAbout.then((fn) => fn());
      unlistenReportIssue.then((fn) => fn());
      unlistenDocumentation.then((fn) => fn());
    };
  }, []);

  const handleCreateProject = async (
    template: TemplateType,
    config?: WebTemplateConfig
  ) => {
    const project = createProject(template, config);

    // Save project to temp storage so editor window can load it
    await invoke("save_temp_project", { project });

    // Open editor window
    await invoke("open_editor_window", {
      projectId: project.id,
      templateType: template,
    });

    // Close launcher window (it will be recreated when all editors close)
    await getCurrentWindow().close();
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-crust">
      {/* Animated grid background */}
      <div className="launcher-grid-bg absolute inset-0 opacity-30" />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-base/80 via-base/95 to-base" />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col px-10 py-8">
        {/* Header */}
        <header className="mb-8 flex items-center gap-4 animate-fade-in">
          <div className="relative">
            <Hexagon
              className="h-10 w-10 text-accent"
              strokeWidth={1.5}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-3 w-3 rounded-sm bg-accent/80" />
            </div>
          </div>
          <div>
            <h1 className="font-mono text-2xl font-semibold tracking-tight text-text">
              CodeCell
            </h1>
            <p className="font-mono text-xs tracking-widest text-text-muted uppercase">
              Code Playground
            </p>
          </div>
        </header>

        {/* Main content */}
        <main className="flex flex-1 gap-10 overflow-hidden">
          {/* Left column - Recent Notes */}
          <section className="flex w-72 flex-shrink-0 flex-col animate-fade-in stagger-1">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-mono text-sm font-medium uppercase tracking-wider text-text-muted">
                Recent
              </h2>
              <button
                onClick={() => handleCreateProject("web")}
                className="group flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 font-mono text-xs font-medium text-accent transition-all hover:border-accent hover:bg-accent/10"
              >
                <Plus className="h-3 w-3 transition-transform group-hover:rotate-90" />
                New
              </button>
            </div>
            <RecentProjects onOpen={handleCreateProject} />
          </section>

          {/* Vertical separator */}
          <div className="relative w-px animate-fade-in stagger-2">
            <div className="absolute inset-y-0 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
            <div className="absolute left-1/2 top-1/2 h-16 w-px -translate-x-1/2 -translate-y-1/2 bg-accent/30" />
          </div>

          {/* Right column - Templates */}
          <section className="flex flex-1 flex-col overflow-hidden animate-fade-in stagger-2">
            <h2 className="mb-4 font-mono text-sm font-medium uppercase tracking-wider text-text-muted">
              Start with a template
            </h2>
            <QuickTemplates onCreate={handleCreateProject} />
          </section>
        </main>

        {/* Footer */}
        <footer className="mt-6 animate-fade-in stagger-6">
          <div className="flex items-center justify-between text-xs text-text-subtle">
            <span className="font-mono">v0.1.0</span>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors hover:bg-surface-0 hover:text-text-muted"
              >
                <SettingsIcon className="h-3.5 w-3.5" />
                Settings
              </button>
              <button className="rounded-md px-2 py-1 transition-colors hover:bg-surface-0 hover:text-text-muted">
                Help
              </button>
            </div>
          </div>
        </footer>
      </div>

      {/* Settings Modal */}
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* About Modal */}
      <About isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </div>
  );
}
