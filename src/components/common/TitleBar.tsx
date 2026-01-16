import { Window } from "@tauri-apps/api/window";
import { Minus, Square, X, Copy } from "lucide-react";
import { useState, useEffect, useCallback, type ReactNode } from "react";

interface TitleBarProps {
  title?: string;
  subtitle?: string;
  isDirty?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
  showControls?: boolean;
  minimal?: boolean;
}

export function TitleBar({
  title,
  subtitle,
  isDirty = false,
  icon,
  children,
  showControls = true,
  minimal = false,
}: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindow = Window.getCurrent();

  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);
      } catch {
        // Ignore errors
      }
    };

    checkMaximized();

    // Listen for resize events to update maximize state
    const unlisten = appWindow.onResized(() => {
      checkMaximized();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [appWindow]);

  const handleMinimize = useCallback(async () => {
    try {
      await appWindow.minimize();
    } catch (error) {
      console.error("Failed to minimize:", error);
    }
  }, [appWindow]);

  const handleMaximize = useCallback(async () => {
    try {
      await appWindow.toggleMaximize();
    } catch (error) {
      console.error("Failed to toggle maximize:", error);
    }
  }, [appWindow]);

  const handleClose = useCallback(async () => {
    try {
      await appWindow.close();
    } catch (error) {
      console.error("Failed to close:", error);
    }
  }, [appWindow]);

  return (
    <header
      data-tauri-drag-region
      className={`flex h-11 flex-shrink-0 select-none items-center justify-between ${
        minimal ? "bg-transparent" : "border-b border-border bg-mantle"
      }`}
    >
      {/* Title area - pointer-events-none so clicks pass to header for dragging */}
      <div className="pointer-events-none flex h-full flex-1 items-center gap-3 px-4">
        {!minimal && (
          <>
            {icon && <div>{icon}</div>}
            {title && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium text-text">{title}</span>
                {isDirty && (
                  <span className="h-2 w-2 rounded-full bg-warning" title="Unsaved changes" />
                )}
              </div>
            )}
            {subtitle && (
              <span className="rounded bg-surface-0 px-2 py-0.5 font-mono text-xs text-text-muted">
                {subtitle}
              </span>
            )}
          </>
        )}
        {/* Interactive children - restore pointer events */}
        <div className="pointer-events-auto flex items-center">{children}</div>
      </div>

      {/* Window controls - pointer-events-auto to make buttons clickable */}
      {showControls && (
        <div className="pointer-events-auto flex h-full">
          <button
            onClick={handleMinimize}
            className="flex h-full w-12 items-center justify-center text-text-muted transition-colors hover:bg-surface-0 hover:text-text"
            title="Minimize"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={handleMaximize}
            className="flex h-full w-12 items-center justify-center text-text-muted transition-colors hover:bg-surface-0 hover:text-text"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? <Copy className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={handleClose}
            className="flex h-full w-12 items-center justify-center text-text-muted transition-colors hover:bg-error hover:text-white"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </header>
  );
}
