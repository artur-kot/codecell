import { Modal } from "@/components/common";
import { SettingsContent } from "./SettingsContent";

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Settings({ isOpen, onClose }: SettingsProps) {
  const footer = (
    <div className="flex items-center justify-end gap-3">
      <p className="flex-1 font-mono text-xs text-text-subtle">
        Settings are saved automatically
      </p>
      <button
        onClick={onClose}
        className="rounded-md bg-accent px-4 py-2 font-mono text-sm font-medium text-crust transition-colors hover:bg-accent-hover"
      >
        Done
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      className="max-w-lg"
      footer={footer}
    >
      <div className="p-6">
        <SettingsContent isActive={isOpen} />
      </div>
    </Modal>
  );
}
