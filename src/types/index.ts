// Template Types
export type TemplateType = "web" | "node" | "python" | "rust" | "java" | "typescript";

export interface WebTemplateConfig {
  markup: "html";
  styling: "css";
  script: "javascript" | "typescript";
  framework: "none" | "react" | "vue";
}

export interface QuickTemplate {
  id: string;
  name: string;
  type: TemplateType;
  config?: WebTemplateConfig;
  icon: string;
  isBuiltIn: boolean;
}

// Project Types
export interface Project {
  id: string;
  name: string;
  template: TemplateType;
  webConfig?: WebTemplateConfig;
  files: ProjectFile[];
  createdAt: string;
  updatedAt: string;
  savedPath: string | null;
}

export interface ProjectFile {
  name: string;
  content: string;
  language: string;
}

export interface RecentProject {
  id: string;
  name: string;
  template: TemplateType;
  path: string;
  updatedAt: string;
}

// Window Types
export type WindowType = "launcher" | "web-editor" | "compiled-editor";

export interface WindowState {
  type: WindowType;
  projectId?: string;
}

// Editor Types
export interface EditorTab {
  id: string;
  name: string;
  language: string;
  content: string;
  isActive: boolean;
}

// Execution Types
export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}

// Re-export template utilities
export { TEMPLATE_MAP, type TemplateDefinition } from "./templates";
