import { useState } from "react";
import { Modal } from "./Modal";
import {
  FileCode,
  Globe,
  Server,
  Terminal,
  Cog,
  Coffee,
  Atom,
  Star,
  Zap,
  Rocket,
  Code2,
  Braces,
} from "lucide-react";

interface SaveTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, icon: string) => void;
  defaultName?: string;
}

const ICON_OPTIONS = [
  { id: "file-code", icon: FileCode, label: "Code" },
  { id: "globe", icon: Globe, label: "Web" },
  { id: "server", icon: Server, label: "Server" },
  { id: "terminal", icon: Terminal, label: "Terminal" },
  { id: "cog", icon: Cog, label: "Cog" },
  { id: "coffee", icon: Coffee, label: "Coffee" },
  { id: "atom", icon: Atom, label: "Atom" },
  { id: "star", icon: Star, label: "Star" },
  { id: "zap", icon: Zap, label: "Zap" },
  { id: "rocket", icon: Rocket, label: "Rocket" },
  { id: "code2", icon: Code2, label: "Code 2" },
  { id: "braces", icon: Braces, label: "Braces" },
];

export function SaveTemplateDialog({
  isOpen,
  onClose,
  onSave,
  defaultName = "",
}: SaveTemplateDialogProps) {
  const [name, setName] = useState(defaultName);
  const [selectedIcon, setSelectedIcon] = useState("file-code");

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), selectedIcon);
      setName("");
      setSelectedIcon("file-code");
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && name.trim()) {
      handleSave();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Save as Template">
      <div className="space-y-4">
        <div>
          <label htmlFor="template-name" className="block text-sm font-medium text-zinc-300 mb-1">
            Template Name
          </label>
          <input
            id="template-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="My Custom Template"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Icon</label>
          <div className="grid grid-cols-6 gap-2">
            {ICON_OPTIONS.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setSelectedIcon(id)}
                title={label}
                className={`p-2 rounded-lg border transition-colors ${
                  selectedIcon === id
                    ? "border-blue-500 bg-blue-500/20 text-blue-400"
                    : "border-zinc-700 hover:border-zinc-600 text-zinc-400 hover:text-zinc-300"
                }`}
              >
                <Icon size={20} className="mx-auto" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
          >
            Save Template
          </button>
        </div>
      </div>
    </Modal>
  );
}
