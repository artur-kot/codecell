import { useEffect, useRef } from "react";

interface KeyboardShortcutHandlers {
  onSave?: () => void;
  onSaveAs?: () => void;
  onOpen?: () => void;
  onTogglePreview?: () => void;
  onToggleOutput?: () => void;
  onRun?: () => void;
  onStop?: () => void;
}

/**
 * Hook to handle keyboard shortcuts for editor windows.
 * Shortcuts mirror those shown in the menubar.
 */
export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers): void {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Don't intercept if in an input field (but allow in CodeMirror)
      const target = e.target as HTMLElement;
      const isInInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (isCtrlOrCmd) {
        switch (e.key.toLowerCase()) {
          case "s":
            e.preventDefault();
            if (e.shiftKey) {
              handlersRef.current.onSaveAs?.();
            } else {
              handlersRef.current.onSave?.();
            }
            break;
          case "o":
            if (!isInInput) {
              e.preventDefault();
              handlersRef.current.onOpen?.();
            }
            break;
          case "p":
            // Only for web editor - toggle preview
            if (!isInInput) {
              e.preventDefault();
              handlersRef.current.onTogglePreview?.();
            }
            break;
          case "`":
            // Toggle output panel
            e.preventDefault();
            handlersRef.current.onToggleOutput?.();
            break;
          case "enter":
            // Run code
            e.preventDefault();
            handlersRef.current.onRun?.();
            break;
          case ".":
            // Stop code
            e.preventDefault();
            handlersRef.current.onStop?.();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
