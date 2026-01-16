import { useEffect } from "react";
import { Window } from "@tauri-apps/api/window";
import { useProjectStore } from "@/stores/projectStore";

/**
 * Hook to manage the window title based on project name and save status.
 * Shows "• ProjectName" when unsaved, "ProjectName" when saved.
 */
export function useWindowTitle(): void {
  const currentProject = useProjectStore((state) => state.currentProject);
  const isDirty = useProjectStore((state) => state.isDirty);

  useEffect(() => {
    const updateTitle = async () => {
      try {
        const tauriWindow = Window.getCurrent();

        if (!currentProject) {
          await tauriWindow.setTitle("CodeCell");
          return;
        }

        const projectName = currentProject.name || "Untitled";
        const dirtyIndicator = isDirty ? "• " : "";
        const title = `${dirtyIndicator}${projectName} — CodeCell`;

        await tauriWindow.setTitle(title);
      } catch {
        // Native title setting may not work in all Tauri configurations
        // In-app header indicator provides a fallback
      }
    };

    updateTitle();
  }, [currentProject, isDirty]);
}
