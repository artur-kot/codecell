import { useEffect, useRef } from "react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useProjectStore } from "@/stores/projectStore";
import { TEMPLATE_MAP, type Project, type CustomTemplate } from "@/types";

interface MenuEventHandlers {
  onTogglePreview?: () => void;
  onToggleOutput?: () => void;
  onRun?: () => void;
  onStop?: () => void;
  onAbout?: () => void;
  onSaveAsTemplate?: () => void;
}

/**
 * Hook to handle menu events for editors.
 * Sets up listeners once on mount and cleans up on unmount.
 */
export function useMenuEvents(handlers: MenuEventHandlers = {}): void {
  // Keep handlers in a ref so we always call the latest version
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const listeners: Promise<UnlistenFn>[] = [];

    // Get store actions directly - they're stable
    const store = useProjectStore.getState();

    // Common events
    listeners.push(
      listen("menu:save", () => {
        useProjectStore.getState().saveProject();
      })
    );

    listeners.push(
      listen("menu:save-as", () => {
        useProjectStore.getState().saveProjectAs();
      })
    );

    listeners.push(
      listen("menu:open", () => {
        useProjectStore.getState().openProject();
      })
    );

    listeners.push(
      listen<string>("menu:new-template", async (event) => {
        const templateId = event.payload;
        const template = TEMPLATE_MAP[templateId];
        if (!template) return;
        const project = store.createProjectWithoutSettingCurrent(template.type, template.config);
        await invoke("save_temp_project", { project });
        await invoke("open_editor_window", {
          projectId: project.id,
          templateType: template.type,
        });
      })
    );

    listeners.push(
      listen<string>("menu:open-recent", async (event) => {
        const path = event.payload;
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
      })
    );

    // Handle custom template selection from menu
    listeners.push(
      listen<string>("menu:new-custom-template", async (event) => {
        const templateId = event.payload;
        try {
          // Load all custom templates and find the matching one
          const templates = await invoke<CustomTemplate[]>("get_custom_templates");
          const template = templates.find((t) => t.id === templateId);
          if (!template) {
            console.error("Custom template not found:", templateId);
            return;
          }

          // Create a new project from the custom template
          const id = crypto.randomUUID();
          const now = new Date().toISOString();
          const project: Project = {
            id,
            name: "Untitled",
            template: template.type,
            webConfig: template.config,
            files: template.files.map((f) => ({ ...f })),
            createdAt: now,
            updatedAt: now,
            savedPath: null,
          };

          await invoke("save_temp_project", { project });
          await invoke("open_editor_window", {
            projectId: project.id,
            templateType: template.type,
          });
        } catch (error) {
          console.error("Failed to create project from custom template:", error);
        }
      })
    );

    // Editor-specific events - use ref to always get latest handlers
    listeners.push(
      listen("menu:toggle-preview", () => {
        handlersRef.current.onTogglePreview?.();
      })
    );

    listeners.push(
      listen("menu:toggle-output", () => {
        handlersRef.current.onToggleOutput?.();
      })
    );

    listeners.push(
      listen("menu:run-code", () => {
        handlersRef.current.onRun?.();
      })
    );

    listeners.push(
      listen("menu:stop-code", () => {
        handlersRef.current.onStop?.();
      })
    );

    listeners.push(
      listen("menu:about", () => {
        handlersRef.current.onAbout?.();
      })
    );

    listeners.push(
      listen("menu:save-as-template", () => {
        handlersRef.current.onSaveAsTemplate?.();
      })
    );

    // Cleanup all listeners on unmount
    return () => {
      listeners.forEach((promise) => {
        promise.then((unlisten) => unlisten());
      });
    };
  }, []); // Empty deps - only run once
}
