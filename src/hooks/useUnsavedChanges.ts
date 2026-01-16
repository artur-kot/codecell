import { useState, useEffect, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useProjectStore } from "@/stores/projectStore";

interface UnsavedChangesState {
  showDialog: boolean;
  pendingClose: boolean;
}

/**
 * Hook to handle unsaved changes warning when closing the window.
 * Returns dialog state and handlers for save/discard/cancel actions.
 */
export function useUnsavedChanges() {
  const { isDirty, saveProject, markClean } = useProjectStore();
  const [state, setState] = useState<UnsavedChangesState>({
    showDialog: false,
    pendingClose: false,
  });

  // Listen for window close request
  useEffect(() => {
    const currentWindow = getCurrentWindow();
    let unlistenFn: (() => void) | null = null;

    currentWindow
      .onCloseRequested(async (event) => {
        if (isDirty) {
          // Prevent the window from closing
          event.preventDefault();
          // Show the confirmation dialog
          setState({ showDialog: true, pendingClose: true });
        }
        // If not dirty, allow the window to close normally
      })
      .then((fn) => {
        unlistenFn = fn;
      });

    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, [isDirty]);

  const handleSave = useCallback(async () => {
    await saveProject();
    setState({ showDialog: false, pendingClose: false });
    // Close the window after saving
    await getCurrentWindow().close();
  }, [saveProject]);

  const handleDiscard = useCallback(async () => {
    markClean();
    setState({ showDialog: false, pendingClose: false });
    // Close the window without saving
    await getCurrentWindow().close();
  }, [markClean]);

  const handleCancel = useCallback(() => {
    setState({ showDialog: false, pendingClose: false });
  }, []);

  return {
    showDialog: state.showDialog,
    handleSave,
    handleDiscard,
    handleCancel,
  };
}
