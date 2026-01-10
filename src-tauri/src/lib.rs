mod commands;
mod models;
mod services;

use commands::{AppState, RunningProcesses};
use services::ProjectManager;
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder},
    Emitter, Manager,
};

fn build_menu(app: &tauri::App) -> tauri::Result<Menu<tauri::Wry>> {
    let app_menu = SubmenuBuilder::new(app, "CodeCell")
        .item(&PredefinedMenuItem::about(app, Some("About CodeCell"), None)?)
        .separator()
        .item(&PredefinedMenuItem::services(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::hide(app, None)?)
        .item(&PredefinedMenuItem::hide_others(app, None)?)
        .item(&PredefinedMenuItem::show_all(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::quit(app, None)?)
        .build()?;

    let new_project = MenuItemBuilder::with_id("new_project", "New Project...")
        .accelerator("CmdOrCtrl+N")
        .build(app)?;

    let new_web = MenuItemBuilder::with_id("new_web", "HTML/CSS/JS").build(app)?;
    let new_react = MenuItemBuilder::with_id("new_react", "React + TypeScript").build(app)?;
    let new_node = MenuItemBuilder::with_id("new_node", "Node.js").build(app)?;
    let new_python = MenuItemBuilder::with_id("new_python", "Python").build(app)?;
    let new_rust = MenuItemBuilder::with_id("new_rust", "Rust").build(app)?;
    let new_java = MenuItemBuilder::with_id("new_java", "Java").build(app)?;

    let new_from_template =
        SubmenuBuilder::new(app, "New from Template")
            .items(&[
                &new_web, &new_react, &new_node, &new_python, &new_rust, &new_java,
            ])
            .build()?;

    let open = MenuItemBuilder::with_id("open", "Open...")
        .accelerator("CmdOrCtrl+O")
        .build(app)?;

    let save = MenuItemBuilder::with_id("save", "Save")
        .accelerator("CmdOrCtrl+S")
        .build(app)?;

    let save_as = MenuItemBuilder::with_id("save_as", "Save As...")
        .accelerator("CmdOrCtrl+Shift+S")
        .build(app)?;

    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&new_project)
        .item(&new_from_template)
        .item(&open)
        .separator()
        .item(&save)
        .item(&save_as)
        .separator()
        .item(&PredefinedMenuItem::close_window(app, None)?)
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(&PredefinedMenuItem::undo(app, None)?)
        .item(&PredefinedMenuItem::redo(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::cut(app, None)?)
        .item(&PredefinedMenuItem::copy(app, None)?)
        .item(&PredefinedMenuItem::paste(app, None)?)
        .item(&PredefinedMenuItem::select_all(app, None)?)
        .build()?;

    let toggle_preview = MenuItemBuilder::with_id("toggle_preview", "Toggle Preview")
        .accelerator("CmdOrCtrl+P")
        .build(app)?;

    let toggle_output = MenuItemBuilder::with_id("toggle_output", "Toggle Output")
        .accelerator("CmdOrCtrl+`")
        .build(app)?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .item(&toggle_preview)
        .item(&toggle_output)
        .separator()
        .item(&PredefinedMenuItem::fullscreen(app, None)?)
        .build()?;

    let run_code = MenuItemBuilder::with_id("run_code", "Run Code")
        .accelerator("CmdOrCtrl+Enter")
        .build(app)?;

    let stop_code = MenuItemBuilder::with_id("stop_code", "Stop")
        .accelerator("CmdOrCtrl+.")
        .build(app)?;

    let run_menu = SubmenuBuilder::new(app, "Run")
        .item(&run_code)
        .item(&stop_code)
        .build()?;

    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(&MenuItemBuilder::with_id("documentation", "Documentation").build(app)?)
        .item(&MenuItemBuilder::with_id("report_issue", "Report Issue").build(app)?)
        .build()?;

    let menu = Menu::with_items(
        app,
        &[
            &app_menu, &file_menu, &edit_menu, &view_menu, &run_menu, &help_menu,
        ],
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

            // Build native menu
            let menu = build_menu(app)?;
            app.set_menu(menu)?;

            // Handle menu events
            app.on_menu_event(|app, event| {
                let id = event.id().as_ref();
                match id {
                    "new_project" => {
                        let _ = app.emit("menu:new-project", ());
                    }
                    "new_web" => {
                        let _ = app.emit("menu:new-template", "web");
                    }
                    "new_react" => {
                        let _ = app.emit("menu:new-template", "web-react");
                    }
                    "new_node" => {
                        let _ = app.emit("menu:new-template", "node");
                    }
                    "new_python" => {
                        let _ = app.emit("menu:new-template", "python");
                    }
                    "new_rust" => {
                        let _ = app.emit("menu:new-template", "rust");
                    }
                    "new_java" => {
                        let _ = app.emit("menu:new-template", "java");
                    }
                    "open" => {
                        let _ = app.emit("menu:open", ());
                    }
                    "save" => {
                        let _ = app.emit("menu:save", ());
                    }
                    "save_as" => {
                        let _ = app.emit("menu:save-as", ());
                    }
                    "toggle_preview" => {
                        let _ = app.emit("menu:toggle-preview", ());
                    }
                    "toggle_output" => {
                        let _ = app.emit("menu:toggle-output", ());
                    }
                    "run_code" => {
                        let _ = app.emit("menu:run-code", ());
                    }
                    "stop_code" => {
                        let _ = app.emit("menu:stop-code", ());
                    }
                    _ => {}
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
            commands::open_editor_window,
            commands::close_editor_window,
            commands::focus_launcher,
            commands::execute_python,
            commands::execute_node,
            commands::execute_rust,
            commands::execute_java,
            commands::execute_typescript,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
