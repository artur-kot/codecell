mod commands;
mod models;
mod services;

use commands::{AppState, RunningProcesses};
use services::ProjectManager;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder},
    Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_shell::ShellExt;

pub fn build_menu(app: &tauri::AppHandle, is_web_editor: bool) -> tauri::Result<Menu<tauri::Wry>> {
    let about_codecell = MenuItemBuilder::with_id("about", "About CodeCell").build(app)?;

    // App menu - simplified for cross-platform compatibility
    let app_menu = SubmenuBuilder::new(app, "CodeCell")
        .item(&about_codecell)
        .separator()
        .item(&PredefinedMenuItem::quit(app, None)?)
        .build()?;

    // File menu - New from Template submenu
    let new_web = MenuItemBuilder::with_id("new_web", "HTML/CSS/JS").build(app)?;
    let new_react = MenuItemBuilder::with_id("new_react", "React + TypeScript").build(app)?;
    let new_node = MenuItemBuilder::with_id("new_node", "Node.js").build(app)?;
    let new_python = MenuItemBuilder::with_id("new_python", "Python").build(app)?;
    let new_rust = MenuItemBuilder::with_id("new_rust", "Rust").build(app)?;
    let new_java = MenuItemBuilder::with_id("new_java", "Java").build(app)?;

    let mut template_builder = SubmenuBuilder::new(app, "New from Template")
        .items(&[
            &new_web,
            &new_react,
            &new_node,
            &new_python,
            &new_rust,
            &new_java,
        ]);

    // Add custom templates if available
    if let Some(state) = app.try_state::<AppState>() {
        if let Ok(manager) = state.project_manager.lock() {
            if let Ok(custom_templates) = manager.get_custom_templates() {
                if !custom_templates.is_empty() {
                    // Add separator and header
                    template_builder = template_builder.separator();
                    let my_templates_header =
                        MenuItemBuilder::with_id("my_templates_header", "MY TEMPLATES")
                            .enabled(false)
                            .build(app)?;
                    template_builder = template_builder.item(&my_templates_header);

                    // Add custom template items
                    for template in custom_templates.iter() {
                        let item = MenuItemBuilder::with_id(
                            &format!("custom_template_{}", template.id),
                            &template.name,
                        )
                        .build(app)?;
                        template_builder = template_builder.item(&item);
                    }
                }
            }
        }
    }

    let new_from_template = template_builder.build()?;

    let open = MenuItemBuilder::with_id("open", "Open...")
        .accelerator("CmdOrCtrl+O")
        .build(app)?;

    // Build Recent Notes submenu
    let recent_submenu = {
        let mut builder = SubmenuBuilder::new(app, "Recent Notes");

        // Try to get recent projects from state
        if let Some(state) = app.try_state::<AppState>() {
            if let Ok(manager) = state.project_manager.lock() {
                if let Ok(recent) = manager.get_recent_projects() {
                    if recent.is_empty() {
                        let no_recent = MenuItemBuilder::with_id("no_recent", "No Recent Notes")
                            .enabled(false)
                            .build(app)?;
                        builder = builder.item(&no_recent);
                    } else {
                        for (i, project) in recent.iter().take(10).enumerate() {
                            let item =
                                MenuItemBuilder::with_id(&format!("recent_{}", i), &project.name)
                                    .build(app)?;
                            builder = builder.item(&item);
                        }
                    }
                } else {
                    let no_recent = MenuItemBuilder::with_id("no_recent", "No Recent Notes")
                        .enabled(false)
                        .build(app)?;
                    builder = builder.item(&no_recent);
                }
            } else {
                let no_recent = MenuItemBuilder::with_id("no_recent", "No Recent Notes")
                    .enabled(false)
                    .build(app)?;
                builder = builder.item(&no_recent);
            }
        } else {
            let no_recent = MenuItemBuilder::with_id("no_recent", "No Recent Notes")
                .enabled(false)
                .build(app)?;
            builder = builder.item(&no_recent);
        }

        builder.build()?
    };

    let save = MenuItemBuilder::with_id("save", "Save")
        .accelerator("CmdOrCtrl+S")
        .build(app)?;

    let save_as = MenuItemBuilder::with_id("save_as", "Save As...")
        .accelerator("CmdOrCtrl+Shift+S")
        .build(app)?;

    let save_as_template = MenuItemBuilder::with_id("save_as_template", "Save as Template...")
        .build(app)?;

    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&new_from_template)
        .item(&open)
        .item(&recent_submenu)
        .separator()
        .item(&save)
        .item(&save_as)
        .item(&save_as_template)
        .separator()
        .item(&PredefinedMenuItem::close_window(app, None)?)
        .build()?;

    // View menu - different options based on editor type, no orphan separators
    let view_menu = if is_web_editor {
        let toggle_preview = MenuItemBuilder::with_id("toggle_preview", "Toggle Preview")
            .accelerator("CmdOrCtrl+P")
            .build(app)?;

        SubmenuBuilder::new(app, "View")
            .item(&toggle_preview)
            .item(&PredefinedMenuItem::fullscreen(app, None)?)
            .build()?
    } else {
        let toggle_output = MenuItemBuilder::with_id("toggle_output", "Toggle Output")
            .accelerator("CmdOrCtrl+`")
            .build(app)?;

        SubmenuBuilder::new(app, "View")
            .item(&toggle_output)
            .item(&PredefinedMenuItem::fullscreen(app, None)?)
            .build()?
    };

    // Run menu
    let run_code = MenuItemBuilder::with_id("run_code", "Run Code")
        .accelerator("CmdOrCtrl+Enter")
        .build(app)?;

    let stop_code = MenuItemBuilder::with_id("stop_code", "Stop")
        .accelerator("CmdOrCtrl+.")
        .enabled(false) // Start disabled, enable when code is running
        .build(app)?;

    let run_menu = SubmenuBuilder::new(app, "Run")
        .item(&run_code)
        .item(&stop_code)
        .build()?;

    // Help menu
    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(&MenuItemBuilder::with_id("homepage", "Homepage").build(app)?)
        .item(&MenuItemBuilder::with_id("report_issue", "Report Issue...").build(app)?)
        .build()?;

    let menu = Menu::with_items(
        app,
        &[&app_menu, &file_menu, &view_menu, &run_menu, &help_menu],
    )?;

    Ok(menu)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Get app data directory
            let app_data = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            // Initialize project manager
            let project_manager = ProjectManager::new(app_data.clone());
            project_manager
                .init()
                .expect("Failed to initialize project manager");

            // Cleanup old temp projects (older than 7 days)
            let _ = project_manager.cleanup_old_temp_projects(7);

            // Create app state
            let state = AppState {
                project_manager: Mutex::new(project_manager),
            };

            app.manage(state);
            app.manage(RunningProcesses::new());

            // Hide menu on launcher window (editor windows get menus when created)
            if let Some(launcher) = app.get_webview_window("launcher") {
                let _ = launcher.remove_menu();
            }

            // Handle menu events
            app.on_menu_event(|app, event| {
                let id = event.id().as_ref();

                // Helper to emit to editor windows - tries focused first, falls back to all
                let emit_to_editors = |event_name: &str, payload: Option<&str>| {
                    let windows: Vec<_> = app
                        .webview_windows()
                        .into_iter()
                        .filter(|(label, _)| label.starts_with("editor-"))
                        .collect();

                    // Try focused window first
                    for (_, window) in &windows {
                        if window.is_focused().unwrap_or(false) {
                            if let Some(p) = payload {
                                let _ = window.emit(event_name, p);
                            } else {
                                let _ = window.emit(event_name, ());
                            }
                            return;
                        }
                    }

                    // Fallback: emit to all editor windows (only one should be active)
                    for (_, window) in &windows {
                        if let Some(p) = payload {
                            let _ = window.emit(event_name, p);
                        } else {
                            let _ = window.emit(event_name, ());
                        }
                    }
                };

                match id {
                    // These create new windows, so broadcast to editor windows
                    "new_web" => emit_to_editors("menu:new-template", Some("web")),
                    "new_react" => emit_to_editors("menu:new-template", Some("web-react")),
                    "new_node" => emit_to_editors("menu:new-template", Some("node")),
                    "new_python" => emit_to_editors("menu:new-template", Some("python")),
                    "new_rust" => emit_to_editors("menu:new-template", Some("rust")),
                    "new_java" => emit_to_editors("menu:new-template", Some("java")),

                    // Window-specific actions - emit to editor windows
                    "open" => emit_to_editors("menu:open", None),
                    "save" => emit_to_editors("menu:save", None),
                    "save_as" => emit_to_editors("menu:save-as", None),
                    "save_as_template" => emit_to_editors("menu:save-as-template", None),
                    "toggle_preview" => emit_to_editors("menu:toggle-preview", None),
                    "toggle_output" => emit_to_editors("menu:toggle-output", None),
                    "run_code" => emit_to_editors("menu:run-code", None),
                    "stop_code" => emit_to_editors("menu:stop-code", None),

                    // Help menu actions
                    "homepage" => {
                        let _ = app.shell().open("https://codecells.app", None);
                    }
                    "report_issue" => {
                        let _ = app.shell().open(
                            "mailto:artur.kot@outlook.com?subject=CodeCell%20Feedback",
                            None,
                        );
                    }
                    "about" => {
                        let _ = app.emit("menu:about", ());
                    }
                    _ => {
                        // Handle recent notes menu items (recent_0, recent_1, etc.)
                        if id.starts_with("recent_") {
                            if let Ok(index) = id.strip_prefix("recent_").unwrap().parse::<usize>()
                            {
                                if let Some(state) = app.try_state::<AppState>() {
                                    if let Ok(manager) = state.project_manager.lock() {
                                        if let Ok(recent) = manager.get_recent_projects() {
                                            if let Some(project) = recent.get(index) {
                                                // Check if window for this project is already open
                                                let window_label = format!("editor-{}", project.id);
                                                if let Some(window) =
                                                    app.get_webview_window(&window_label)
                                                {
                                                    // Window exists, focus it
                                                    let _ = window.set_focus();
                                                } else {
                                                    // Window doesn't exist, emit to open it
                                                    let _ =
                                                        app.emit("menu:open-recent", &project.path);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        // Handle custom template menu items (custom_template_<id>)
                        else if id.starts_with("custom_template_") {
                            if let Some(template_id) = id.strip_prefix("custom_template_") {
                                emit_to_editors(
                                    "menu:new-custom-template",
                                    Some(template_id),
                                );
                            }
                        }
                    }
                }
            });

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::save_temp_project,
            commands::load_temp_project,
            commands::delete_temp_project,
            commands::save_project_to_path,
            commands::load_project_from_path,
            commands::get_recent_projects,
            commands::add_recent_project,
            commands::save_custom_template,
            commands::get_custom_templates,
            commands::delete_custom_template,
            commands::open_editor_window,
            commands::open_settings_window,
            commands::open_about_window,
            commands::close_editor_window,
            commands::focus_launcher,
            commands::execute_python,
            commands::execute_node,
            commands::execute_rust,
            commands::execute_java,
            commands::execute_typescript,
            commands::stop_execution,
            commands::kill_window_processes,
            commands::get_system_fonts,
        ])
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { .. } = event {
                let label = window.label().to_string();
                let app = window.app_handle().clone();

                // Check if this is an editor window
                if label.starts_with("editor-") {
                    // Kill any running processes for this window
                    if let Some(processes) = app.try_state::<RunningProcesses>() {
                        let processes = processes.inner().clone();
                        let window_id = label.clone();
                        tauri::async_runtime::spawn(async move {
                            processes.kill(&window_id).await;
                        });
                    }

                    // Count remaining editor windows (excluding this one being closed)
                    let editor_count = app
                        .webview_windows()
                        .keys()
                        .filter(|l| l.starts_with("editor-") && *l != &label)
                        .count();

                    // If no other editors remain, recreate launcher
                    if editor_count == 0 {
                        if let Ok(launcher) =
                            WebviewWindowBuilder::new(&app, "launcher", WebviewUrl::App("/".into()))
                                .title("CodeCell")
                                .inner_size(900.0, 600.0)
                                .min_inner_size(700.0, 500.0)
                                .resizable(true)
                                .center()
                                .decorations(false)
                                .shadow(true)
                                .transparent(true)
                                .build()
                        {
                            // Hide menu on launcher
                            let _ = launcher.remove_menu();
                        }
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
