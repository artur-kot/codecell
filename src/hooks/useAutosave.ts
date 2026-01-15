import { useEffect } from "react";
import { useProjectStore } from "@/stores/projectStore";

const AUTOSAVE_INTERVAL_MS = 30000;

/**
 * Hook to autosave the current project at regular intervals when dirty.
 * Only saves if the project has a savedPath (i.e., was previously saved).
 */
export function useAutosave(): void {
  const { isDirty, currentProject, saveProject } = useProjectStore();

  useEffect(() => {
    if (!isDirty || !currentProject?.savedPath) return;

    const autosaveTimer = setInterval(() => {
      saveProject();
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(autosaveTimer);
  }, [isDirty, currentProject?.savedPath, saveProject]);
}
