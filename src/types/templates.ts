import type { TemplateType, WebTemplateConfig } from "./index";

export interface TemplateDefinition {
  type: TemplateType;
  config?: WebTemplateConfig;
}

/**
 * Mapping from template IDs to their type and configuration.
 * Used when creating new projects from menu items or command palette.
 */
export const TEMPLATE_MAP: Record<string, TemplateDefinition> = {
  web: {
    type: "web",
    config: { markup: "html", styling: "css", script: "javascript", framework: "none" },
  },
  "web-react": {
    type: "web",
    config: { markup: "html", styling: "css", script: "typescript", framework: "react" },
  },
  node: { type: "node" },
  python: { type: "python" },
  rust: { type: "rust" },
  java: { type: "java" },
};
