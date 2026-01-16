import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Window } from "@tauri-apps/api/window";
import { useProjectStore } from "@/stores/projectStore";
import { TEMPLATE_MAP, type CustomTemplate, type Project, type RecentProject } from "@/types";
import { ChevronRight } from "lucide-react";

// Menu item types
interface MenuItemBase {
  id: string;
  label: string;
  disabled?: boolean;
}

interface MenuActionItem extends MenuItemBase {
  type: "action";
  shortcut?: string;
  action: () => void;
}

interface MenuSeparator {
  type: "separator";
}

interface MenuSubmenu extends MenuItemBase {
  type: "submenu";
  items: MenuItem[];
}

interface MenuHeader extends MenuItemBase {
  type: "header";
}

type MenuItem = MenuActionItem | MenuSeparator | MenuSubmenu | MenuHeader;

interface MenuDefinition {
  id: string;
  label: string;
  items: MenuItem[];
}

interface MenuBarProps {
  menus: MenuDefinition[];
  className?: string;
}

export function MenuBar({ menus, className = "" }: MenuBarProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openSubmenuId, setOpenSubmenuId] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
        setOpenSubmenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenuId(null);
        setOpenSubmenuId(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleMenuClick = (menuId: string) => {
    setOpenMenuId(openMenuId === menuId ? null : menuId);
    setOpenSubmenuId(null);
  };

  const handleMenuHover = (menuId: string) => {
    if (openMenuId !== null) {
      setOpenMenuId(menuId);
      setOpenSubmenuId(null);
    }
  };

  const handleItemClick = (item: MenuActionItem) => {
    if (!item.disabled) {
      item.action();
      setOpenMenuId(null);
      setOpenSubmenuId(null);
    }
  };

  return (
    <div ref={menuBarRef} className={`flex items-center ${className}`}>
      {menus.map((menu) => (
        <div key={menu.id} className="relative">
          <button
            onClick={() => handleMenuClick(menu.id)}
            onMouseEnter={() => handleMenuHover(menu.id)}
            className={`px-3 py-1.5 font-mono text-xs transition-colors ${
              openMenuId === menu.id
                ? "bg-surface-0 text-text"
                : "text-text-muted hover:bg-surface-0/50 hover:text-text"
            }`}
          >
            {menu.label}
          </button>

          {openMenuId === menu.id && (
            <MenuDropdown
              items={menu.items}
              onItemClick={handleItemClick}
              openSubmenuId={openSubmenuId}
              onSubmenuHover={setOpenSubmenuId}
            />
          )}
        </div>
      ))}
    </div>
  );
}

interface MenuDropdownProps {
  items: MenuItem[];
  onItemClick: (item: MenuActionItem) => void;
  openSubmenuId: string | null;
  onSubmenuHover: (id: string | null) => void;
  isSubmenu?: boolean;
}

function MenuDropdown({
  items,
  onItemClick,
  openSubmenuId,
  onSubmenuHover,
  isSubmenu = false,
}: MenuDropdownProps) {
  return (
    <div
      className={`absolute z-50 min-w-[200px] rounded-md border border-border bg-mantle py-1 shadow-lg ${
        isSubmenu ? "left-full top-0 -mt-1" : "left-0 top-full"
      }`}
    >
      {items.map((item, index) => {
        if (item.type === "separator") {
          return <div key={index} className="my-1 h-px bg-border" />;
        }

        if (item.type === "header") {
          return (
            <div
              key={item.id}
              className="px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-subtle"
            >
              {item.label}
            </div>
          );
        }

        if (item.type === "submenu") {
          return (
            <div
              key={item.id}
              className="relative"
              onMouseEnter={() => onSubmenuHover(item.id)}
              onMouseLeave={() => onSubmenuHover(null)}
            >
              <div
                className={`flex cursor-default items-center justify-between px-3 py-1.5 font-mono text-xs ${
                  item.disabled ? "text-text-subtle" : "text-text hover:bg-surface-0"
                }`}
              >
                <span>{item.label}</span>
                <ChevronRight className="h-3 w-3 text-text-muted" />
              </div>

              {openSubmenuId === item.id && (
                <MenuDropdown
                  items={item.items}
                  onItemClick={onItemClick}
                  openSubmenuId={null}
                  onSubmenuHover={() => {}}
                  isSubmenu
                />
              )}
            </div>
          );
        }

        // Action item
        return (
          <button
            key={item.id}
            onClick={() => onItemClick(item)}
            disabled={item.disabled}
            className={`flex w-full items-center justify-between px-3 py-1.5 font-mono text-xs ${
              item.disabled ? "cursor-default text-text-subtle" : "text-text hover:bg-surface-0"
            }`}
          >
            <span>{item.label}</span>
            {item.shortcut && <span className="ml-4 text-text-subtle">{item.shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
}

// Helper hook to create menu definitions for editors
export function useEditorMenus(options: {
  isWebEditor: boolean;
  isRunning?: boolean;
  onSave: () => void;
  onSaveAs: () => void;
  onSaveAsTemplate: () => void;
  onOpen: () => void;
  onTogglePreview?: () => void;
  onToggleOutput?: () => void;
  onRun?: () => void;
  onStop?: () => void;
  onSettings?: () => void;
}): MenuDefinition[] {
  const {
    isWebEditor,
    isRunning = false,
    onSave,
    onSaveAs,
    onSaveAsTemplate,
    onOpen,
    onTogglePreview,
    onToggleOutput,
    onRun,
    onStop,
    onSettings,
  } = options;

  // Fetch custom templates and recent projects
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [templates, recent] = await Promise.all([
          invoke<CustomTemplate[]>("get_custom_templates"),
          invoke<RecentProject[]>("get_recent_projects"),
        ]);
        setCustomTemplates(templates);
        setRecentProjects(recent);
      } catch (error) {
        console.error("Failed to load menu data:", error);
      }
    };
    loadData();
  }, []);

  const handleOpenRecentProject = useCallback(async (path: string) => {
    const store = useProjectStore.getState();
    await store.openProjectFromPath(path);
  }, []);

  const handleClose = useCallback(async () => {
    await Window.getCurrent().close();
  }, []);

  const handleNewTemplate = useCallback(async (templateId: string) => {
    const template = TEMPLATE_MAP[templateId];
    if (!template) return;

    const store = useProjectStore.getState();
    const project = store.createProjectWithoutSettingCurrent(template.type, template.config);
    await invoke("save_temp_project", { project });
    await invoke("open_editor_window", {
      projectId: project.id,
      templateType: template.type,
    });
  }, []);

  const handleNewCustomTemplate = useCallback(async (template: CustomTemplate) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const project: Project = {
      id,
      name: "Untitled",
      template: template.type,
      webConfig: template.config,
      files: template.files.map((f) => ({ ...f })),
      createdAt: now,
      updatedAt: now,
      savedPath: null,
    };

    await invoke("save_temp_project", { project });
    await invoke("open_editor_window", {
      projectId: project.id,
      templateType: template.type,
    });
  }, []);

  // Build the New from Template submenu items
  const newFromTemplateItems = useMemo((): MenuItem[] => {
    const builtInItems: MenuItem[] = [
      {
        type: "action",
        id: "new-web",
        label: "HTML/CSS/JS",
        action: () => handleNewTemplate("web"),
      },
      {
        type: "action",
        id: "new-react",
        label: "React + TypeScript",
        action: () => handleNewTemplate("web-react"),
      },
      { type: "action", id: "new-node", label: "Node.js", action: () => handleNewTemplate("node") },
      {
        type: "action",
        id: "new-python",
        label: "Python",
        action: () => handleNewTemplate("python"),
      },
      { type: "action", id: "new-rust", label: "Rust", action: () => handleNewTemplate("rust") },
      { type: "action", id: "new-java", label: "Java", action: () => handleNewTemplate("java") },
    ];

    if (customTemplates.length === 0) {
      return builtInItems;
    }

    // Add custom templates section
    const customItems: MenuItem[] = [
      { type: "separator" },
      { type: "header", id: "my-templates-header", label: "My Templates" },
      ...customTemplates.map(
        (template): MenuActionItem => ({
          type: "action",
          id: `custom-${template.id}`,
          label: template.name,
          action: () => handleNewCustomTemplate(template),
        })
      ),
    ];

    return [...builtInItems, ...customItems];
  }, [customTemplates, handleNewTemplate, handleNewCustomTemplate]);

  // Build the Recent Notes submenu items
  const recentNotesItems = useMemo((): MenuItem[] => {
    if (recentProjects.length === 0) {
      return [
        {
          type: "action",
          id: "no-recent",
          label: "No Recent Notes",
          disabled: true,
          action: () => {},
        },
      ];
    }

    return recentProjects.slice(0, 10).map(
      (project): MenuActionItem => ({
        type: "action",
        id: `recent-${project.id}`,
        label: project.name,
        action: () => handleOpenRecentProject(project.path),
      })
    );
  }, [recentProjects, handleOpenRecentProject]);

  const fileMenu: MenuDefinition = {
    id: "file",
    label: "File",
    items: [
      {
        type: "submenu",
        id: "new-from-template",
        label: "New from Template",
        items: newFromTemplateItems,
      },
      { type: "action", id: "open", label: "Open...", shortcut: "Ctrl+O", action: onOpen },
      {
        type: "submenu",
        id: "recent-notes",
        label: "Recent Notes",
        items: recentNotesItems,
      },
      { type: "separator" },
      { type: "action", id: "save", label: "Save", shortcut: "Ctrl+S", action: onSave },
      {
        type: "action",
        id: "save-as",
        label: "Save As...",
        shortcut: "Ctrl+Shift+S",
        action: onSaveAs,
      },
      {
        type: "action",
        id: "save-template",
        label: "Save as Template...",
        action: onSaveAsTemplate,
      },
      { type: "separator" },
      { type: "action", id: "settings", label: "Settings...", action: onSettings || (() => {}) },
      { type: "separator" },
      { type: "action", id: "close", label: "Close Window", action: handleClose },
    ],
  };

  const viewMenu: MenuDefinition = {
    id: "view",
    label: "View",
    items: isWebEditor
      ? [
          {
            type: "action",
            id: "toggle-preview",
            label: "Toggle Preview",
            shortcut: "Ctrl+P",
            action: onTogglePreview || (() => {}),
          },
        ]
      : [
          {
            type: "action",
            id: "toggle-output",
            label: "Toggle Output",
            shortcut: "Ctrl+`",
            action: onToggleOutput || (() => {}),
          },
        ],
  };

  const runMenu: MenuDefinition = {
    id: "run",
    label: "Run",
    items: [
      {
        type: "action",
        id: "run-code",
        label: "Run Code",
        shortcut: "Ctrl+Enter",
        action: onRun || (() => {}),
        disabled: isRunning,
      },
      {
        type: "action",
        id: "stop-code",
        label: "Stop",
        shortcut: "Ctrl+.",
        action: onStop || (() => {}),
        disabled: !isRunning,
      },
    ],
  };

  const handleOpenAbout = useCallback(async () => {
    await invoke("open_about_window");
  }, []);

  const helpMenu: MenuDefinition = {
    id: "help",
    label: "Help",
    items: [
      { type: "action", id: "about", label: "About CodeCell", action: handleOpenAbout },
      { type: "separator" },
      {
        type: "action",
        id: "homepage",
        label: "Homepage",
        action: () => window.open("https://github.com/arturkot/codecell", "_blank"),
      },
      {
        type: "action",
        id: "report-issue",
        label: "Report Issue...",
        action: () =>
          window.open("mailto:artur.kot@outlook.com?subject=CodeCell%20Feedback", "_blank"),
      },
    ],
  };

  // Build menus based on editor type
  const menus: MenuDefinition[] = [fileMenu, viewMenu];

  if (!isWebEditor) {
    menus.push(runMenu);
  }

  menus.push(helpMenu);

  return menus;
}
