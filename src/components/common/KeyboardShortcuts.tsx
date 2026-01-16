import { Modal } from "./Modal";
import { Keyboard } from "lucide-react";

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: ShortcutItem[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "General",
    shortcuts: [
      { keys: ["Ctrl", "K"], description: "Open command palette" },
      { keys: ["Ctrl", "S"], description: "Save note" },
      { keys: ["Ctrl", "Shift", "S"], description: "Save note as..." },
      { keys: ["Ctrl", "O"], description: "Open note" },
      { keys: ["Ctrl", ","], description: "Open settings" },
      { keys: ["?"], description: "Show keyboard shortcuts" },
    ],
  },
  {
    title: "Editor",
    shortcuts: [
      { keys: ["Ctrl", "Enter"], description: "Run code" },
      { keys: ["Ctrl", "."], description: "Stop execution" },
      { keys: ["Ctrl", "`"], description: "Toggle output panel" },
      { keys: ["Ctrl", "P"], description: "Toggle preview (Web)" },
      { keys: ["Ctrl", "R"], description: "Refresh preview (Web)" },
    ],
  },
  {
    title: "Code Editor",
    shortcuts: [
      { keys: ["Ctrl", "F"], description: "Find" },
      { keys: ["Ctrl", "H"], description: "Find and replace" },
      { keys: ["Ctrl", "G"], description: "Go to line" },
      { keys: ["Ctrl", "/"], description: "Toggle comment" },
      { keys: ["Ctrl", "D"], description: "Select next occurrence" },
      { keys: ["Ctrl", "Shift", "K"], description: "Delete line" },
      { keys: ["Alt", "Up"], description: "Move line up" },
      { keys: ["Alt", "Down"], description: "Move line down" },
      { keys: ["Ctrl", "["], description: "Outdent line" },
      { keys: ["Ctrl", "]"], description: "Indent line" },
    ],
  },
];

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" className="max-w-2xl">
      <div className="max-h-[60vh] overflow-y-auto">
        <div className="space-y-6">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-text">
                <Keyboard className="h-4 w-4 text-accent" />
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-surface-0/50 px-3 py-2"
                  >
                    <span className="text-sm text-text-muted">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex}>
                          {keyIndex > 0 && <span className="mx-0.5 text-text-subtle">+</span>}
                          <kbd className="inline-flex min-w-[24px] items-center justify-center rounded bg-mantle px-2 py-1 font-mono text-xs text-text">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-border/50 bg-surface-0/30 p-3">
          <p className="text-xs text-text-subtle">
            <strong className="text-text-muted">Tip:</strong> On macOS, use{" "}
            <kbd className="rounded bg-mantle px-1.5 py-0.5 text-[10px]">Cmd</kbd> instead of{" "}
            <kbd className="rounded bg-mantle px-1.5 py-0.5 text-[10px]">Ctrl</kbd>
          </p>
        </div>
      </div>
    </Modal>
  );
}
