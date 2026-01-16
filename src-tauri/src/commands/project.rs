use crate::commands::AppState;
use crate::models::{CustomTemplate, Project, RecentProject};
use tauri::State;

#[tauri::command]
pub fn save_temp_project(state: State<AppState>, project: Project) -> Result<String, String> {
    let manager = state.project_manager.lock().unwrap();
    manager
        .save_temp_project(&project)
        .map(|path| path.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_temp_project(state: State<AppState>, id: String) -> Result<Project, String> {
    let manager = state.project_manager.lock().unwrap();
    manager.load_temp_project(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_temp_project(state: State<AppState>, id: String) -> Result<(), String> {
    let manager = state.project_manager.lock().unwrap();
    manager.delete_temp_project(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_project_to_path(
    state: State<AppState>,
    project: Project,
    path: String,
) -> Result<(), String> {
    let manager = state.project_manager.lock().unwrap();
    manager
        .save_project_to_path(&project, &path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_project_from_path(state: State<AppState>, path: String) -> Result<Project, String> {
    let manager = state.project_manager.lock().unwrap();
    manager
        .load_project_from_path(&path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_recent_projects(state: State<AppState>) -> Result<Vec<RecentProject>, String> {
    let manager = state.project_manager.lock().unwrap();
    manager.get_recent_projects().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_recent_project(state: State<AppState>, project: RecentProject) -> Result<(), String> {
    let manager = state.project_manager.lock().unwrap();
    manager
        .add_recent_project(project)
        .map_err(|e| e.to_string())
}

// Custom template commands

#[tauri::command]
pub fn save_custom_template(state: State<AppState>, template: CustomTemplate) -> Result<(), String> {
    let manager = state.project_manager.lock().unwrap();
    manager
        .save_custom_template(&template)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_custom_templates(state: State<AppState>) -> Result<Vec<CustomTemplate>, String> {
    let manager = state.project_manager.lock().unwrap();
    manager.get_custom_templates().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_custom_template(state: State<AppState>, id: String) -> Result<(), String> {
    let manager = state.project_manager.lock().unwrap();
    manager
        .delete_custom_template(&id)
        .map_err(|e| e.to_string())
}
