import { useState, useEffect, useRef } from "react";
import {
  useSettingsStore,
  type ThemeMode,
} from "@/stores/settingsStore";
import {
  Sun,
  Moon,
  Monitor,
  Type,
  Minus,
  Plus,
  ChevronDown,
  Check,
  Loader2,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

const THEME_OPTIONS: { value: ThemeMode; icon: typeof Sun; label: string; description: string }[] = [
  { value: "light", icon: Sun, label: "Light", description: "Catppuccin Latte" },
  { value: "dark", icon: Moon, label: "Dark", description: "Catppuccin Mocha" },
  { value: "system", icon: Monitor, label: "System", description: "Match OS preference" },
];

const FALLBACK_FONTS = [
  "JetBrains Mono",
  "Fira Code",
  "SF Mono",
  "Cascadia Code",
  "Source Code Pro",
  "Consolas",
  "Monaco",
];

interface SettingsContentProps {
  /** Whether to load fonts (set to true when the settings are visible) */
  isActive?: boolean;
}

export function SettingsContent({ isActive = true }: SettingsContentProps) {
  const { themeMode, setThemeMode, editorSettings, setEditorSettings } =
    useSettingsStore();
  const [systemFonts, setSystemFonts] = useState<string[]>([]);
  const [isLoadingFonts, setIsLoadingFonts] = useState(true);
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load system fonts
  useEffect(() => {
    if (!isActive) return;

    const loadFonts = async () => {
      try {
        const fonts = await invoke<string[]>("get_system_fonts");
        setSystemFonts(fonts.length > 0 ? fonts : FALLBACK_FONTS);
      } catch (error) {
        console.error("Failed to load system fonts:", error);
        setSystemFonts(FALLBACK_FONTS);
      } finally {
        setIsLoadingFonts(false);
      }
    };

    loadFonts();
  }, [isActive]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!fontDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFontDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [fontDropdownOpen]);

  const decreaseFontSize = () => {
    setEditorSettings({ fontSize: Math.max(10, editorSettings.fontSize - 1) });
  };

  const increaseFontSize = () => {
    setEditorSettings({ fontSize: Math.min(24, editorSettings.fontSize + 1) });
  };

  return (
    <div className="space-y-6">
      {/* Theme Section */}
      <section>
        <h3 className="mb-3 font-mono text-sm font-medium uppercase tracking-wider text-text-muted">
          Appearance
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map(({ value, icon: Icon, label, description }) => {
            const isSelected = themeMode === value;
            return (
              <button
                key={value}
                onClick={() => setThemeMode(value)}
                className={`group relative flex flex-col items-center gap-2 rounded-lg border p-4 transition-all ${
                  isSelected
                    ? "border-accent bg-accent/5"
                    : "border-border hover:border-surface-1 hover:bg-surface-0/50"
                }`}
              >
                <div
                  className={`rounded-full p-2.5 transition-colors ${
                    isSelected
                      ? "bg-accent/10 text-accent"
                      : "bg-surface-0 text-text-muted group-hover:text-text"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <p
                    className={`font-mono text-sm font-medium ${
                      isSelected ? "text-accent" : "text-text"
                    }`}
                  >
                    {label}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-text-subtle">
                    {description}
                  </p>
                </div>
                {isSelected && (
                  <div className="absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-accent" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Editor Section */}
      <section>
        <h3 className="mb-3 font-mono text-sm font-medium uppercase tracking-wider text-text-muted">
          Editor
        </h3>

        <div className="space-y-4">
          {/* Font Family */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-surface-0 p-2 text-text-muted">
                <Type className="h-4 w-4" />
              </div>
              <div>
                <p className="font-mono text-sm text-text">Font Family</p>
                <p className="font-mono text-xs text-text-subtle">
                  Monospace font for code
                </p>
              </div>
            </div>

            {/* Font Dropdown */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setFontDropdownOpen(!fontDropdownOpen)}
                className="flex min-w-[180px] items-center justify-between gap-2 rounded-md border border-border bg-mantle px-3 py-2 font-mono text-sm text-text transition-colors hover:border-surface-1"
                disabled={isLoadingFonts}
              >
                {isLoadingFonts ? (
                  <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                ) : (
                  <span className="truncate">{editorSettings.fontFamily}</span>
                )}
                <ChevronDown
                  className={`h-4 w-4 text-text-muted transition-transform ${
                    fontDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {fontDropdownOpen && (
                <div className="absolute right-0 top-full z-10 mt-1 max-h-60 w-full min-w-[220px] overflow-y-auto rounded-md border border-border bg-mantle py-1 shadow-lg">
                  {systemFonts.map((font) => {
                    const isSelected = editorSettings.fontFamily === font;
                    return (
                      <button
                        key={font}
                        onClick={() => {
                          setEditorSettings({ fontFamily: font });
                          setFontDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left font-mono text-sm transition-colors ${
                          isSelected
                            ? "bg-accent/10 text-accent"
                            : "text-text hover:bg-surface-0"
                        }`}
                        style={{ fontFamily: `"${font}", monospace` }}
                      >
                        <span className="truncate">{font}</span>
                        {isSelected && <Check className="h-4 w-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Font Size */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-surface-0 p-2 font-mono text-xs font-bold text-text-muted">
                Aa
              </div>
              <div>
                <p className="font-mono text-sm text-text">Font Size</p>
                <p className="font-mono text-xs text-text-subtle">
                  {editorSettings.fontSize}px
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={decreaseFontSize}
                className="rounded-md border border-border bg-surface-0 p-1.5 text-text-muted transition-colors hover:border-surface-1 hover:text-text"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="range"
                min="10"
                max="24"
                value={editorSettings.fontSize}
                onChange={(e) =>
                  setEditorSettings({ fontSize: parseInt(e.target.value) })
                }
                className="mx-2 h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-surface-0 accent-accent"
              />
              <button
                onClick={increaseFontSize}
                className="rounded-md border border-border bg-surface-0 p-1.5 text-text-muted transition-colors hover:border-surface-1 hover:text-text"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Preview Section */}
      <section>
        <h3 className="mb-3 font-mono text-sm font-medium uppercase tracking-wider text-text-muted">
          Preview
        </h3>
        <div className="overflow-hidden rounded-lg border border-border bg-mantle">
          <div className="border-b border-border bg-crust px-3 py-2">
            <span className="font-mono text-xs text-text-muted">example.js</span>
          </div>
          <pre
            className="overflow-x-auto p-4"
            style={{
              fontFamily: `"${editorSettings.fontFamily}", monospace`,
              fontSize: `${editorSettings.fontSize}px`,
              lineHeight: 1.6,
            }}
          >
            <code>
              <span style={{ color: "var(--color-syntax-keyword)" }}>function</span>{" "}
              <span style={{ color: "var(--color-syntax-function)" }}>greet</span>
              <span style={{ color: "var(--color-text-muted)" }}>(</span>
              <span style={{ color: "var(--color-text)" }}>name</span>
              <span style={{ color: "var(--color-text-muted)" }}>)</span>{" "}
              <span style={{ color: "var(--color-text-muted)" }}>{"{"}</span>
              {"\n"}
              {"  "}
              <span style={{ color: "var(--color-syntax-keyword)" }}>return</span>{" "}
              <span style={{ color: "var(--color-syntax-string)" }}>`Hello, </span>
              <span style={{ color: "var(--color-text-muted)" }}>{"${"}</span>
              <span style={{ color: "var(--color-text)" }}>name</span>
              <span style={{ color: "var(--color-text-muted)" }}>{"}"}</span>
              <span style={{ color: "var(--color-syntax-string)" }}>!`</span>
              <span style={{ color: "var(--color-text-muted)" }}>;</span>
              {"\n"}
              <span style={{ color: "var(--color-text-muted)" }}>{"}"}</span>
            </code>
          </pre>
        </div>
      </section>
    </div>
  );
}
