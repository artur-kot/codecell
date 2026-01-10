import { useSettingsStore, type ThemeMode } from "@/stores/settingsStore";
import { Sun, Moon, Monitor } from "lucide-react";

const THEME_OPTIONS: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "system", icon: Monitor, label: "System" },
];

export function ThemeToggle() {
  const { themeMode, setThemeMode } = useSettingsStore();

  const cycleTheme = () => {
    const currentIndex = THEME_OPTIONS.findIndex((o) => o.value === themeMode);
    const nextIndex = (currentIndex + 1) % THEME_OPTIONS.length;
    setThemeMode(THEME_OPTIONS[nextIndex].value);
  };

  const CurrentIcon =
    THEME_OPTIONS.find((o) => o.value === themeMode)?.icon || Moon;

  return (
    <button
      onClick={cycleTheme}
      className="flex items-center gap-2 rounded-md p-2 text-text-muted transition-colors hover:bg-surface-0 hover:text-text"
      title={`Theme: ${themeMode}`}
    >
      <CurrentIcon className="h-4 w-4" strokeWidth={1.5} />
    </button>
  );
}

export function ThemeSelector() {
  const { themeMode, setThemeMode } = useSettingsStore();

  return (
    <div className="flex items-center gap-1 rounded-lg bg-surface-0/50 p-1">
      {THEME_OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setThemeMode(value)}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 font-mono text-xs transition-colors ${
            themeMode === value
              ? "bg-accent/10 text-accent"
              : "text-text-muted hover:text-text"
          }`}
          title={label}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
