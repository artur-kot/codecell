import { useProjectStore } from "@/stores/projectStore";
import type { QuickTemplate } from "@/types";
import {
  Globe,
  Atom,
  Server,
  Terminal,
  Cog,
  Coffee,
  FileCode,
  Star,
  Zap,
  Rocket,
  Code2,
  Braces,
  Trash2,
  type LucideIcon,
} from "lucide-react";

interface QuickTemplatesProps {
  onCreate: (template: QuickTemplate) => void;
}

const ICON_MAP: Record<string, LucideIcon> = {
  globe: Globe,
  atom: Atom,
  server: Server,
  terminal: Terminal,
  cog: Cog,
  coffee: Coffee,
  code: FileCode,
  "file-code": FileCode,
  star: Star,
  zap: Zap,
  rocket: Rocket,
  code2: Code2,
  braces: Braces,
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
  const { quickTemplates, deleteCustomTemplate } = useProjectStore();

  // Separate built-in and custom templates
  const builtInTemplates = quickTemplates.filter((t) => t.isBuiltIn);
  const customTemplates = quickTemplates.filter((t) => !t.isBuiltIn);

  const handleDelete = async (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    await deleteCustomTemplate(templateId);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Built-in Templates */}
      <div className="flex flex-col gap-1">
        {builtInTemplates.map((template, index) => (
          <TemplateRow
            key={template.id}
            template={template}
            index={index}
            onClick={() => onCreate(template)}
          />
        ))}
      </div>

      {/* Custom Templates */}
      {customTemplates.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="mb-2 font-mono text-xs font-medium uppercase tracking-wider text-text-subtle">
            My Templates
          </h3>
          {customTemplates.map((template, index) => (
            <TemplateRow
              key={template.id}
              template={template}
              index={index + builtInTemplates.length}
              onClick={() => onCreate(template)}
              onDelete={(e) => handleDelete(e, template.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TemplateRowProps {
  template: QuickTemplate;
  index: number;
  onClick: () => void;
  onDelete?: (e: React.MouseEvent) => void;
}

function TemplateRow({ template, index, onClick, onDelete }: TemplateRowProps) {
  const Icon = ICON_MAP[template.icon] || FileCode;
  const color = COLOR_MAP[template.id] || "var(--color-accent)";
  const description = DESCRIPTION_MAP[template.id] || (template.isBuiltIn ? "" : "Custom template");

  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-3 rounded-lg border border-transparent bg-transparent px-3 py-2.5 text-left transition-all animate-fade-in hover:border-border hover:bg-surface-0/50 stagger-${Math.min(index + 1, 6)}`}
    >
      {/* Icon */}
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md transition-colors"
        style={{
          backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
        }}
      >
        <Icon className="h-4 w-4" style={{ color }} strokeWidth={1.5} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="font-mono text-sm font-medium text-text">{template.name}</p>
        {description && <p className="font-mono text-xs text-text-subtle">{description}</p>}
      </div>

      {/* Delete button for custom templates */}
      {onDelete && (
        <button
          onClick={onDelete}
          className="rounded p-1.5 text-text-subtle opacity-0 transition-all hover:bg-error/10 hover:text-error group-hover:opacity-100"
          title="Delete template"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Hover indicator */}
      <div
        className="h-1.5 w-1.5 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
        style={{ backgroundColor: color }}
      />
    </button>
  );
}
