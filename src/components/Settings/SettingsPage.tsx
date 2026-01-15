import { SettingsContent } from "./SettingsContent";

export function SettingsPage() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-base">
      {/* Header with drag region */}
      <div
        className="flex items-center justify-between border-b border-border px-6 py-4"
        data-tauri-drag-region
      >
        <h1 className="font-mono text-lg font-semibold text-text">Settings</h1>
        <p className="font-mono text-xs text-text-subtle">
          Settings are saved automatically
        </p>
      </div>

      {/* Content */}
      <div
        className="overflow-y-auto p-6"
        style={{ maxHeight: "calc(100vh - 65px)" }}
      >
        <SettingsContent />
      </div>
    </div>
  );
}
