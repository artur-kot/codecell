import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useProjectStore } from "@/stores/projectStore";
import type { Project, TemplateType } from "@/types";

interface ProjectLoaderResult {
  isLoading: boolean;
  projectId: string | null;
  templateType: TemplateType;
}

/**
 * Hook to load a project from URL params and temp storage.
 * Used by both CompiledEditor and WebEditor to load their project on mount.
 */
export function useProjectLoader(defaultTemplate: TemplateType = "node"): ProjectLoaderResult {
  const { currentProject, setCurrentProject } = useProjectStore();
  const [isLoading, setIsLoading] = useState(true);

  const params = new URLSearchParams(window.location.search);
  const projectId = params.get("projectId");
  const templateType = (params.get("type") || defaultTemplate) as TemplateType;

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

  return { isLoading, projectId, templateType };
}
