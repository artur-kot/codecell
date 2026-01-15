import { useProjectStore } from "@/stores/projectStore";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { TemplateType, Project } from "@/types";
import {
  Globe,
  Server,
  Terminal,
  Cog,
  Coffee,
  FileCode,
  FolderOpen,
  Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const TEMPLATE_ICONS: Record<TemplateType, LucideIcon> = {
  web: Globe,
  node: Server,
  python: Terminal,
  rust: Cog,
  java: Coffee,
  typescript: FileCode,
};

const TEMPLATE_COLORS: Record<TemplateType, string> = {
  web: "var(--color-template-web)",
  node: "var(--color-template-node)",
  python: "var(--color-template-python)",
  rust: "var(--color-template-rust)",
  java: "var(--color-template-java)",
  typescript: "var(--color-template-react)",
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function RecentProjects() {
  const { recentProjects } = useProjectStore();

  const handleOpenRecent = async (projectPath: string, template: TemplateType) => {
    try {
      // Load the project from saved path
      const project = await invoke<Project>("load_project_from_path", { path: projectPath });

      // Set savedPath since it's not serialized in the file
      project.savedPath = projectPath;

      // Save to temp storage for editor window
      await invoke("save_temp_project", { project });

      // Open editor window
      await invoke("open_editor_window", {
        projectId: project.id,
        templateType: template,
      });

      // Close launcher
      await getCurrentWindow().close();
    } catch (error) {
      console.error("Failed to open recent project:", error);
      // Project file might have been moved/deleted - could show a notification here
    }
  };

  if (recentProjects.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-surface-0/20 p-8">
        <FolderOpen className="mb-3 h-10 w-10 text-text-subtle" strokeWidth={1} />
        <p className="mb-1 font-mono text-sm text-text-muted">No recent notes</p>
        <p className="text-center font-mono text-xs text-text-subtle">
          Create a new note or open<br />an existing one to get started
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
      {recentProjects.map((project, index) => {
        const Icon = TEMPLATE_ICONS[project.template] || FileCode;
        const color = TEMPLATE_COLORS[project.template] || "var(--color-accent)";

        return (
          <button
            key={project.id}
            onClick={() => handleOpenRecent(project.path, project.template)}
            className={`group flex items-center gap-3 rounded-lg border border-transparent bg-transparent px-3 py-3 text-left transition-all animate-fade-in hover:border-border hover:bg-surface-0/50 stagger-${Math.min(index + 2, 6)}`}
          >
            {/* Icon */}
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md transition-colors"
              style={{
                backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
              }}
            >
              <Icon
                className="h-4 w-4"
                style={{ color }}
                strokeWidth={1.5}
              />
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm font-medium text-text">
                {project.name}
              </p>
              <div className="flex items-center gap-2 text-text-subtle">
                <Clock className="h-3 w-3" />
                <span className="font-mono text-xs">
                  {formatRelativeTime(project.updatedAt)}
                </span>
              </div>
            </div>

            {/* Hover indicator */}
            <div
              className="h-1.5 w-1.5 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
              style={{ backgroundColor: color }}
            />
          </button>
        );
      })}
    </div>
  );
}
