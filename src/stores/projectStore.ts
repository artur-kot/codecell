import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import type {
  Project,
  ProjectFile,
  RecentProject,
  QuickTemplate,
  CustomTemplate,
  TemplateType,
  WebTemplateConfig,
} from "@/types";

interface ProjectState {
  currentProject: Project | null;
  recentProjects: RecentProject[];
  quickTemplates: QuickTemplate[];
  isDirty: boolean;
  lastSavedAt: string | null;
  cleanFilesSnapshot: Map<string, string>; // Snapshot of file contents when last saved/loaded

  // Actions
  setCurrentProject: (project: Project | null) => void;
  updateFile: (fileName: string, content: string) => void;
  addRecentProject: (project: RecentProject) => void;
  loadRecentProjects: () => Promise<void>;
  loadQuickTemplates: () => Promise<void>;
  createProject: (template: TemplateType, config?: WebTemplateConfig) => Project;
  createProjectFromTemplate: (template: QuickTemplate) => Project;
  createProjectWithoutSettingCurrent: (
    template: TemplateType,
    config?: WebTemplateConfig
  ) => Project;
  saveProject: () => Promise<boolean>;
  saveProjectAs: () => Promise<boolean>;
  openProject: () => Promise<boolean>;
  openProjectInNewWindow: () => Promise<boolean>;
  openProjectFromPath: (path: string) => Promise<boolean>;
  markClean: () => void;
  saveAsTemplate: (name: string, icon: string) => Promise<boolean>;
  deleteCustomTemplate: (id: string) => Promise<boolean>;
}

const DEFAULT_QUICK_TEMPLATES: QuickTemplate[] = [
  {
    id: "web-vanilla",
    name: "HTML/CSS/JS",
    type: "web",
    config: { markup: "html", styling: "css", script: "javascript", framework: "none" },
    icon: "globe",
    isBuiltIn: true,
  },
  {
    id: "web-react",
    name: "React + TypeScript",
    type: "web",
    config: { markup: "html", styling: "css", script: "typescript", framework: "react" },
    icon: "atom",
    isBuiltIn: true,
  },
  {
    id: "node",
    name: "Node.js",
    type: "node",
    icon: "server",
    isBuiltIn: true,
  },
  {
    id: "python",
    name: "Python",
    type: "python",
    icon: "terminal",
    isBuiltIn: true,
  },
  {
    id: "rust",
    name: "Rust",
    type: "rust",
    icon: "cog",
    isBuiltIn: true,
  },
  {
    id: "java",
    name: "Java",
    type: "java",
    icon: "coffee",
    isBuiltIn: true,
  },
];

function generateDefaultFiles(template: TemplateType, _config?: WebTemplateConfig): ProjectFile[] {
  switch (template) {
    case "web":
      return [
        {
          name: "index.html",
          language: "html",
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeCell</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Hello, CodeCell!</h1>
  <script src="script.js"></script>
</body>
</html>`,
        },
        {
          name: "style.css",
          language: "css",
          content: `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: system-ui, sans-serif;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #eee;
}

h1 {
  font-size: 3rem;
  background: linear-gradient(90deg, #89b4fa, #cba6f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}`,
        },
        {
          name: "script.js",
          language: "javascript",
          content: `// Your JavaScript code here
console.log("Hello from CodeCell!");

document.querySelector("h1").addEventListener("click", () => {
  alert("You clicked the heading!");
});`,
        },
      ];

    case "node":
      return [
        {
          name: "index.js",
          language: "javascript",
          content: `// Node.js script
const greeting = "Hello from CodeCell!";

console.log(greeting);
console.log("Node.js version:", process.version);

// Example: Simple HTTP server
// const http = require('http');
// http.createServer((req, res) => {
//   res.writeHead(200, {'Content-Type': 'text/plain'});
//   res.end('Hello World!');
// }).listen(3000);`,
        },
      ];

    case "python":
      return [
        {
          name: "main.py",
          language: "python",
          content: `# Python script
def main():
    print("Hello from CodeCell!")

    # Example: Simple calculation
    numbers = [1, 2, 3, 4, 5]
    print(f"Sum: {sum(numbers)}")
    print(f"Average: {sum(numbers) / len(numbers)}")

if __name__ == "__main__":
    main()`,
        },
      ];

    case "rust":
      return [
        {
          name: "main.rs",
          language: "rust",
          content: `fn main() {
    println!("Hello from CodeCell!");

    // Example: Simple calculation
    let numbers = vec![1, 2, 3, 4, 5];
    let sum: i32 = numbers.iter().sum();
    let avg = sum as f64 / numbers.len() as f64;

    println!("Sum: {}", sum);
    println!("Average: {:.2}", avg);
}`,
        },
      ];

    case "java":
      return [
        {
          name: "Main.java",
          language: "java",
          content: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from CodeCell!");

        // Example: Simple calculation
        int[] numbers = {1, 2, 3, 4, 5};
        int sum = 0;
        for (int n : numbers) {
            sum += n;
        }
        double avg = (double) sum / numbers.length;

        System.out.println("Sum: " + sum);
        System.out.println("Average: " + avg);
    }
}`,
        },
      ];

    case "typescript":
      return [
        {
          name: "index.ts",
          language: "typescript",
          content: `// TypeScript script
interface Greeting {
  message: string;
  timestamp: Date;
}

function greet(): Greeting {
  return {
    message: "Hello from CodeCell!",
    timestamp: new Date()
  };
}

const greeting = greet();
console.log(greeting.message);
console.log("Time:", greeting.timestamp.toISOString());`,
        },
      ];

    default:
      return [];
  }
}

/**
 * Creates a new Project object with the given template and config.
 * This is a pure function that doesn't interact with store state.
 */
function buildProject(template: TemplateType, config?: WebTemplateConfig): Project {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  return {
    id,
    name: "Untitled",
    template,
    webConfig: template === "web" ? config : undefined,
    files: generateDefaultFiles(template, config),
    createdAt: now,
    updatedAt: now,
    savedPath: null,
  };
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  recentProjects: [],
  quickTemplates: DEFAULT_QUICK_TEMPLATES,
  isDirty: false,
  lastSavedAt: null,
  cleanFilesSnapshot: new Map(),

  setCurrentProject: (project) => {
    const snapshot = new Map<string, string>();
    if (project) {
      project.files.forEach((f) => snapshot.set(f.name, f.content));
    }
    set({ currentProject: project, isDirty: false, cleanFilesSnapshot: snapshot });
  },

  updateFile: (fileName, content) => {
    const { currentProject, cleanFilesSnapshot } = get();
    if (!currentProject) return;

    const updatedFiles = currentProject.files.map((f) =>
      f.name === fileName ? { ...f, content } : f
    );

    // Check if content actually differs from clean state
    const isActuallyDirty = updatedFiles.some((file) => {
      const cleanContent = cleanFilesSnapshot.get(file.name);
      return cleanContent !== file.content;
    });

    set({
      currentProject: {
        ...currentProject,
        files: updatedFiles,
        updatedAt: new Date().toISOString(),
      },
      isDirty: isActuallyDirty,
    });
  },

  markClean: () => {
    const { currentProject } = get();
    const snapshot = new Map<string, string>();
    if (currentProject) {
      currentProject.files.forEach((f) => snapshot.set(f.name, f.content));
    }
    set({ isDirty: false, lastSavedAt: new Date().toISOString(), cleanFilesSnapshot: snapshot });
  },

  saveProject: async () => {
    const { currentProject, saveProjectAs, markClean } = get();
    if (!currentProject) return false;

    // If no saved path, use Save As
    if (!currentProject.savedPath) {
      return saveProjectAs();
    }

    try {
      await invoke("save_project_to_path", {
        project: currentProject,
        path: currentProject.savedPath,
      });
      markClean();
      return true;
    } catch (error) {
      console.error("Failed to save project:", error);
      return false;
    }
  },

  saveProjectAs: async () => {
    const { currentProject, markClean } = get();
    if (!currentProject) return false;

    try {
      const path = await save({
        defaultPath: `${currentProject.name}.codecell`,
        filters: [{ name: "CodeCell Project", extensions: ["codecell"] }],
      });

      if (!path) return false;

      // Update project with new path and name
      const fileName = path.split(/[/\\]/).pop() || currentProject.name;
      const projectName = fileName.replace(/\.codecell$/, "");

      const updatedProject = {
        ...currentProject,
        name: projectName,
        savedPath: path,
        updatedAt: new Date().toISOString(),
      };

      await invoke("save_project_to_path", {
        project: updatedProject,
        path,
      });

      set({ currentProject: updatedProject });
      markClean();

      // Add to recent projects
      await invoke("add_recent_project", {
        project: {
          id: updatedProject.id,
          name: updatedProject.name,
          template: updatedProject.template,
          path,
          updatedAt: updatedProject.updatedAt,
        },
      });

      return true;
    } catch (error) {
      console.error("Failed to save project:", error);
      return false;
    }
  },

  openProject: async () => {
    try {
      const path = await open({
        filters: [{ name: "CodeCell Project", extensions: ["codecell"] }],
        multiple: false,
      });

      if (!path || Array.isArray(path)) return false;

      const project = await invoke<Project>("load_project_from_path", { path });

      // Ensure savedPath is set
      project.savedPath = path;

      // Create clean snapshot for dirty tracking
      const snapshot = new Map<string, string>();
      project.files.forEach((f) => snapshot.set(f.name, f.content));

      // Update current window with the project
      set({ currentProject: project, isDirty: false, cleanFilesSnapshot: snapshot });

      // Add to recent projects
      await invoke("add_recent_project", {
        project: {
          id: project.id,
          name: project.name,
          template: project.template,
          path,
          updatedAt: project.updatedAt,
        },
      });

      return true;
    } catch (error) {
      console.error("Failed to open project:", error);
      return false;
    }
  },

  openProjectInNewWindow: async () => {
    try {
      const path = await open({
        filters: [{ name: "CodeCell Project", extensions: ["codecell"] }],
        multiple: false,
      });

      if (!path || Array.isArray(path)) return false;

      const project = await invoke<Project>("load_project_from_path", { path });
      project.savedPath = path;

      // Save to temp storage for the new window to load
      await invoke("save_temp_project", { project });

      // Open new editor window
      await invoke("open_editor_window", {
        projectId: project.id,
        templateType: project.template,
      });

      // Add to recent projects
      await invoke("add_recent_project", {
        project: {
          id: project.id,
          name: project.name,
          template: project.template,
          path,
          updatedAt: project.updatedAt,
        },
      });

      return true;
    } catch (error) {
      console.error("Failed to open project in new window:", error);
      return false;
    }
  },

  openProjectFromPath: async (path: string) => {
    try {
      const project = await invoke<Project>("load_project_from_path", { path });
      project.savedPath = path;

      // Save to temp storage for the new window to load
      await invoke("save_temp_project", { project });

      // Open new editor window
      await invoke("open_editor_window", {
        projectId: project.id,
        templateType: project.template,
      });

      // Add to recent projects
      await invoke("add_recent_project", {
        project: {
          id: project.id,
          name: project.name,
          template: project.template,
          path,
          updatedAt: project.updatedAt,
        },
      });

      return true;
    } catch (error) {
      console.error("Failed to open project from path:", error);
      return false;
    }
  },

  addRecentProject: (project) => {
    set((state) => ({
      recentProjects: [project, ...state.recentProjects.filter((p) => p.id !== project.id)].slice(
        0,
        10
      ),
    }));
  },

  loadRecentProjects: async () => {
    try {
      const recent = await invoke<RecentProject[]>("get_recent_projects");
      set({ recentProjects: recent });
    } catch (error) {
      console.error("Failed to load recent projects:", error);
      set({ recentProjects: [] });
    }
  },

  loadQuickTemplates: async () => {
    try {
      const customTemplates = await invoke<CustomTemplate[]>("get_custom_templates");

      // Convert custom templates to QuickTemplate format
      const customQuickTemplates: QuickTemplate[] = customTemplates.map((ct) => ({
        id: ct.id,
        name: ct.name,
        type: ct.type,
        config: ct.config,
        icon: ct.icon,
        isBuiltIn: false,
        files: ct.files,
      }));

      // Merge: custom templates first, then built-in
      set({ quickTemplates: [...customQuickTemplates, ...DEFAULT_QUICK_TEMPLATES] });
    } catch (error) {
      console.error("Failed to load custom templates:", error);
      set({ quickTemplates: DEFAULT_QUICK_TEMPLATES });
    }
  },

  createProject: (template, config) => {
    const project = buildProject(template, config);
    set({ currentProject: project });
    return project;
  },

  // Creates a project without updating the global currentProject state.
  // Use this when opening a new window from an existing editor to avoid state conflicts.
  createProjectWithoutSettingCurrent: (template, config) => {
    return buildProject(template, config);
  },

  // Creates a project from a QuickTemplate (handles both built-in and custom)
  createProjectFromTemplate: (template) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Use template files if available (custom templates), otherwise generate defaults
    const files =
      template.files && template.files.length > 0
        ? template.files.map((f) => ({ ...f })) // Clone files
        : generateDefaultFiles(template.type, template.config);

    const project: Project = {
      id,
      name: "Untitled",
      template: template.type,
      webConfig: template.type === "web" ? template.config : undefined,
      files,
      createdAt: now,
      updatedAt: now,
      savedPath: null,
    };

    // Create clean snapshot for dirty tracking
    const snapshot = new Map<string, string>();
    files.forEach((f) => snapshot.set(f.name, f.content));

    set({ currentProject: project, isDirty: false, cleanFilesSnapshot: snapshot });
    return project;
  },

  saveAsTemplate: async (name, icon) => {
    const { currentProject, loadQuickTemplates } = get();
    if (!currentProject) return false;

    try {
      const customTemplate: CustomTemplate = {
        id: crypto.randomUUID(),
        name,
        type: currentProject.template,
        config: currentProject.webConfig,
        icon,
        files: currentProject.files.map((f) => ({ ...f })),
        createdAt: new Date().toISOString(),
      };

      await invoke("save_custom_template", { template: customTemplate });

      // Reload templates to include the new one
      await loadQuickTemplates();

      return true;
    } catch (error) {
      console.error("Failed to save template:", error);
      return false;
    }
  },

  deleteCustomTemplate: async (id) => {
    const { loadQuickTemplates } = get();

    try {
      await invoke("delete_custom_template", { id });

      // Reload templates to reflect deletion
      await loadQuickTemplates();

      return true;
    } catch (error) {
      console.error("Failed to delete template:", error);
      return false;
    }
  },
}));
