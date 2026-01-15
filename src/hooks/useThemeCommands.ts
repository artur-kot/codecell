import { useMemo, type ReactNode } from "react";
import { Sun, Moon, Monitor, Settings as SettingsIcon } from "lucide-react";
import { useSettingsStore } from "@/stores/settingsStore";
import type { PaletteCommand } from "@/components/CommandPalette";

interface ThemeCommandsOptions {
  onOpenSettings: () => void;
}

/**
 * Hook to generate theme-related command palette commands.
 * Reused across all editors for consistent theme switching.
 */
export function useThemeCommands({ onOpenSettings }: ThemeCommandsOptions): PaletteCommand[] {
  const { setThemeMode } = useSettingsStore();

  return useMemo(
    () => [
      {
        id: "theme-light",
        label: "Light Theme",
        description: "Switch to Catppuccin Latte",
        icon: Sun({ className: "h-4 w-4" }) as ReactNode,
        action: () => setThemeMode("light"),
        category: "Theme",
      },
      {
        id: "theme-dark",
        label: "Dark Theme",
        description: "Switch to Catppuccin Mocha",
        icon: Moon({ className: "h-4 w-4" }) as ReactNode,
        action: () => setThemeMode("dark"),
        category: "Theme",
      },
      {
        id: "theme-system",
        label: "System Theme",
        description: "Follow system preference",
        icon: Monitor({ className: "h-4 w-4" }) as ReactNode,
        action: () => setThemeMode("system"),
        category: "Theme",
      },
      {
        id: "open-settings",
        label: "Open Settings",
        description: "Configure editor preferences",
        shortcut: "Ctrl+,",
        icon: SettingsIcon({ className: "h-4 w-4" }) as ReactNode,
        action: onOpenSettings,
        category: "Settings",
      },
    ],
    [setThemeMode, onOpenSettings]
  );
}
