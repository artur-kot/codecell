import { useRef, useEffect } from "react";
import { X, Hexagon, Github, Mail, Heart } from "lucide-react";

interface AboutProps {
  isOpen: boolean;
  onClose: () => void;
}

export function About({ isOpen, onClose }: AboutProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-crust/80 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-sm rounded-xl border border-border bg-base shadow-2xl animate-fade-in"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-0 hover:text-text"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center p-8">
          {/* Logo */}
          <div className="relative mb-4">
            <Hexagon
              className="h-16 w-16 text-accent"
              strokeWidth={1}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-5 w-5 rounded-md bg-accent/80" />
            </div>
          </div>

          {/* App name and version */}
          <h1 className="font-mono text-2xl font-bold tracking-tight text-text">
            CodeCell
          </h1>
          <p className="mt-1 font-mono text-sm text-text-muted">
            Version 0.1.0
          </p>

          {/* Description */}
          <p className="mt-4 text-center font-mono text-xs leading-relaxed text-text-subtle">
            A lightweight code playground for quick experiments and prototyping.
            Built with Tauri, React, and TypeScript.
          </p>

          {/* Divider */}
          <div className="my-6 h-px w-full bg-border" />

          {/* Author */}
          <div className="flex items-center gap-2 text-text-muted">
            <span className="font-mono text-xs">Made with</span>
            <Heart className="h-3.5 w-3.5 text-error" fill="currentColor" />
            <span className="font-mono text-xs">by</span>
          </div>
          <p className="mt-1 font-mono text-sm font-medium text-text">
            Artur Kot
          </p>

          {/* Links */}
          <div className="mt-6 flex items-center gap-4">
            <a
              href="https://github.com/arturkot/codecell"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md px-3 py-2 font-mono text-xs text-text-muted transition-colors hover:bg-surface-0 hover:text-text"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
            <a
              href="mailto:artur.kot@outlook.com"
              className="flex items-center gap-2 rounded-md px-3 py-2 font-mono text-xs text-text-muted transition-colors hover:bg-surface-0 hover:text-text"
            >
              <Mail className="h-4 w-4" />
              Contact
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-3">
          <p className="text-center font-mono text-[10px] text-text-subtle">
            &copy; {new Date().getFullYear()} Artur Kot. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
