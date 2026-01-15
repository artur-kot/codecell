import { useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useProjectStore } from "@/stores/projectStore";
import { TEMPLATE_MAP, type Project } from "@/types";

interface MenuEventHandlers {
  onTogglePreview?: () => void;
  onToggleOutput?: () => void;
  onRun?: () => void;
  onStop?: () => void;
  onAbout?: () => void;
}

/**
 * Hook to handle common menu events shared across editors.
 * Manages save, save-as, new-template, and open-recent events.
 * Accepts optional handlers for editor-specific events.
 */
export function useMenuEvents(handlers: MenuEventHandlers = {}): void {
  const { saveProject, saveProjectAs, createProjectWithoutSettingCurrent } = useProjectStore();

  const handleNewFromTemplate = useCallback(
    async (templateId: string) => {
      const template = TEMPLATE_MAP[templateId];
      if (!template) return;

      const project = createProjectWithoutSettingCurrent(template.type, template.config);
      await invoke("save_temp_project", { project });
      await invoke("open_editor_window", {
        projectId: project.id,
        templateType: template.type,
      });
    },
    [createProjectWithoutSettingCurrent]
  );

  const handleOpenRecent = useCallback(async (path: string) => {
    try {
      const project = await invoke<Project>("load_project_from_path", { path });
      project.savedPath = path;
      await invoke("save_temp_project", { project });
      await invoke("open_editor_window", {
        projectId: project.id,
        templateType: project.template,
      });
    } catch (error) {
      console.error("Failed to open recent project:", error);
    }
  }, []);

  useEffect(() => {
    const unlisteners: Promise<() => void>[] = [];

    // Common events for all editors
    unlisteners.push(listen("menu:save", () => saveProject()));
    unlisteners.push(listen("menu:save-as", () => saveProjectAs()));
    unlisteners.push(
      listen<string>("menu:new-template", (event) => handleNewFromTemplate(event.payload))
    );
    unlisteners.push(
      listen<string>("menu:open-recent", (event) => handleOpenRecent(event.payload))
    );

    // Optional editor-specific events
    if (handlers.onTogglePreview) {
      unlisteners.push(listen("menu:toggle-preview", handlers.onTogglePreview));
    }
    if (handlers.onToggleOutput) {
      unlisteners.push(listen("menu:toggle-output", handlers.onToggleOutput));
    }
    if (handlers.onRun) {
      unlisteners.push(listen("menu:run-code", handlers.onRun));
    }
    if (handlers.onStop) {
      unlisteners.push(listen("menu:stop-code", handlers.onStop));
    }
    if (handlers.onAbout) {
      unlisteners.push(listen("menu:about", handlers.onAbout));
    }

    return () => {
      unlisteners.forEach((p) => p.then((fn) => fn()));
    };
  }, [
    saveProject,
    saveProjectAs,
    handleNewFromTemplate,
    handleOpenRecent,
    handlers.onTogglePreview,
    handlers.onToggleOutput,
    handlers.onRun,
    handlers.onStop,
    handlers.onAbout,
  ]);
}
