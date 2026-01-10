use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
pub async fn open_editor_window(
    app: AppHandle,
    project_id: String,
    template_type: String,
) -> Result<(), String> {
    let window_label = format!("editor-{}", project_id);

    // Determine window type based on template
    let is_web = template_type == "web";
    let (width, height) = if is_web { (1400, 900) } else { (1200, 800) };

    let url = format!("/editor?projectId={}&type={}", project_id, template_type);

    WebviewWindowBuilder::new(&app, &window_label, WebviewUrl::App(url.into()))
        .title("CodeCell Editor")
        .inner_size(width as f64, height as f64)
        .min_inner_size(800.0, 600.0)
        .resizable(true)
        .center()
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn close_editor_window(app: AppHandle, project_id: String) -> Result<(), String> {
    let window_label = format!("editor-{}", project_id);
    if let Some(window) = app.get_webview_window(&window_label) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn focus_launcher(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("launcher") {
        window.set_focus().map_err(|e| e.to_string())?;
    }
    Ok(())
}
