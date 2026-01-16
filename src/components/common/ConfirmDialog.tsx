import { Modal } from "./Modal";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  extraAction?: {
    label: string;
    onClick: () => void;
  };
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
  extraAction,
}: ConfirmDialogProps) {
  const footer = (
    <div className="flex justify-end gap-2">
      <button
        onClick={onCancel}
        className="rounded-lg border border-border bg-surface-0 px-4 py-2 font-mono text-xs font-medium text-text-muted transition-colors hover:bg-surface-1 hover:text-text"
      >
        {cancelLabel}
      </button>
      {extraAction && (
        <button
          onClick={extraAction.onClick}
          className="rounded-lg border border-border bg-surface-0 px-4 py-2 font-mono text-xs font-medium text-text-muted transition-colors hover:bg-surface-1 hover:text-text"
        >
          {extraAction.label}
        </button>
      )}
      <button
        onClick={onConfirm}
        className={`rounded-lg px-4 py-2 font-mono text-xs font-medium transition-colors ${
          destructive
            ? "bg-error/10 text-error hover:bg-error/20"
            : "bg-accent/10 text-accent hover:bg-accent/20"
        }`}
      >
        {confirmLabel}
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onCancel} className="max-w-sm" footer={footer}>
      <div className="flex flex-col items-center gap-4 px-6 py-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
          <AlertTriangle className="h-6 w-6 text-warning" />
        </div>
        <div className="text-center">
          <h3 className="mb-2 font-mono text-base font-semibold text-text">{title}</h3>
          <p className="font-mono text-sm text-text-muted">{message}</p>
        </div>
      </div>
    </Modal>
  );
}
