import { Settings as SettingsIcon } from "lucide-react";
import { TitleBar } from "@/components/common";
import { SettingsContent } from "./SettingsContent";
import { useWindowState } from "@/hooks";

export function SettingsPage() {
  const { isMaximized } = useWindowState();

  return (
    <div className={`window-frame ${isMaximized ? "maximized" : ""}`}>
      <div className="window-container flex flex-col bg-base">
        <TitleBar
          title="Settings"
          icon={<SettingsIcon className="h-4 w-4 text-accent" strokeWidth={1.5} />}
        >
          <span className="ml-auto pr-2 font-mono text-xs text-text-subtle">
            Saved automatically
          </span>
        </TitleBar>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <SettingsContent />
        </div>
      </div>
    </div>
  );
}
