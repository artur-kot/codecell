import { create } from "zustand";
import type { Project, ProjectFile, RecentProject, QuickTemplate, TemplateType, WebTemplateConfig } from "@/types";

interface ProjectState {
  currentProject: Project | null;
  recentProjects: RecentProject[];
  quickTemplates: QuickTemplate[];

  // Actions
  setCurrentProject: (project: Project | null) => void;
  updateFile: (fileName: string, content: string) => void;
  addRecentProject: (project: RecentProject) => void;
  loadRecentProjects: () => Promise<void>;
  loadQuickTemplates: () => Promise<void>;
  createProject: (template: TemplateType, config?: WebTemplateConfig) => Project;
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

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  recentProjects: [],
  quickTemplates: DEFAULT_QUICK_TEMPLATES,

  setCurrentProject: (project) => set({ currentProject: project }),

  updateFile: (fileName, content) => {
    const { currentProject } = get();
    if (!currentProject) return;

    const updatedFiles = currentProject.files.map((f) =>
      f.name === fileName ? { ...f, content } : f
    );

    set({
      currentProject: {
        ...currentProject,
        files: updatedFiles,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  addRecentProject: (project) => {
    set((state) => ({
      recentProjects: [
        project,
        ...state.recentProjects.filter((p) => p.id !== project.id),
      ].slice(0, 10),
    }));
  },

  loadRecentProjects: async () => {
    // TODO: Load from Tauri storage
    set({ recentProjects: [] });
  },

  loadQuickTemplates: async () => {
    // TODO: Load custom templates from storage
    set({ quickTemplates: DEFAULT_QUICK_TEMPLATES });
  },

  createProject: (template, config) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const project: Project = {
      id,
      name: "Untitled",
      template,
      webConfig: template === "web" ? config : undefined,
      files: generateDefaultFiles(template, config),
      createdAt: now,
      updatedAt: now,
      savedPath: null,
    };

    set({ currentProject: project });
    return project;
  },
}));
