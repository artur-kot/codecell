import { useState, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function useWindowState() {
  const [isMaximized, setIsMaximized] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastValueRef = useRef<boolean>(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const appWindow = getCurrentWindow();

    // Helper to update state safely
    const checkMaximized = async () => {
      try {
        const maximized = await appWindow.isMaximized();
        if (mountedRef.current && maximized !== lastValueRef.current) {
          lastValueRef.current = maximized;
          setIsMaximized(maximized);
        }
      } catch {
        // Window might be closing, ignore errors
      }
    };

    // Check initial state after a microtask to avoid sync setState in effect
    queueMicrotask(checkMaximized);

    // Listen for resize events to detect maximize/restore
    const unlisten = appWindow.onResized(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(checkMaximized, 50);
    });

    return () => {
      mountedRef.current = false;
      unlisten.then((fn) => fn());
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { isMaximized };
}
