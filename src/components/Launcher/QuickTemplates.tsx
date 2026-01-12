import { useProjectStore } from "@/stores/projectStore";
import type { QuickTemplate, TemplateType, WebTemplateConfig } from "@/types";
import {
  Globe,
  Atom,
  Server,
  Terminal,
  Cog,
  Coffee,
  FileCode,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface QuickTemplatesProps {
  onCreate: (template: TemplateType, config?: WebTemplateConfig) => void;
}

const ICON_MAP: Record<string, LucideIcon> = {
  globe: Globe,
  atom: Atom,
  server: Server,
  terminal: Terminal,
  cog: Cog,
  coffee: Coffee,
  code: FileCode,
};

const COLOR_MAP: Record<string, string> = {
  "web-vanilla": "var(--color-template-web)",
  "web-react": "var(--color-template-react)",
  node: "var(--color-template-node)",
  python: "var(--color-template-python)",
  rust: "var(--color-template-rust)",
  java: "var(--color-template-java)",
};

const DESCRIPTION_MAP: Record<string, string> = {
  "web-vanilla": "Classic web stack",
  "web-react": "Modern React app",
  node: "Server-side JavaScript",
  python: "Versatile scripting",
  rust: "Systems programming",
  java: "Enterprise ready",
};

export function QuickTemplates({ onCreate }: QuickTemplatesProps) {
  const { quickTemplates } = useProjectStore();

  const handleClick = (template: QuickTemplate) => {
    onCreate(template.type, template.config);
  };

  return (
    <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-2 lg:grid-cols-3">
      {quickTemplates.map((template, index) => {
        const Icon = ICON_MAP[template.icon] || FileCode;
        const glowColor = COLOR_MAP[template.id] || "var(--color-accent)";
        const description = DESCRIPTION_MAP[template.id] || "";

        return (
          <button
            key={template.id}
            onClick={() => handleClick(template)}
            className={`template-card group rounded-xl border border-border bg-surface-0/50 p-5 text-left animate-fade-in backdrop-blur-sm stagger-${index + 1}`}
            style={
              {
                "--glow-color": glowColor,
              } as React.CSSProperties
            }
          >
            {/* Icon with glow */}
            <div
              className="mb-4 inline-flex rounded-lg p-2 transition-colors"
              style={{
                backgroundColor: `color-mix(in srgb, ${glowColor} 15%, transparent)`,
              }}
            >
              <Icon
                className="h-5 w-5 transition-transform group-hover:scale-110"
                style={{ color: glowColor }}
                strokeWidth={1.5}
              />
            </div>

            {/* Name */}
            <h3 className="mb-1 font-mono text-sm font-medium text-text">
              {template.name}
            </h3>

            {/* Description */}
            <p className="font-mono text-xs text-text-muted">{description}</p>

            {/* Corner accent */}
            <div
              className="absolute bottom-0 right-0 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                background: `linear-gradient(135deg, transparent 50%, color-mix(in srgb, ${glowColor} 20%, transparent) 100%)`,
                borderBottomRightRadius: "0.75rem",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
