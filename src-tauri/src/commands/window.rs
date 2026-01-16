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

    let window = WebviewWindowBuilder::new(&app, &window_label, WebviewUrl::App(url.into()))
        .title("CodeCell Editor")
        .inner_size(width as f64, height as f64)
        .min_inner_size(800.0, 600.0)
        .resizable(true)
        .center()
        .decorations(false)
        .shadow(true)
        .transparent(true)
        .build()
        .map_err(|e| e.to_string())?;

    // Remove native menu - we use custom menubar in the UI
    let _ = window.remove_menu();

    Ok(())
}

#[tauri::command]
pub async fn open_settings_window(app: AppHandle) -> Result<(), String> {
    // Check if settings window already exists
    if let Some(window) = app.get_webview_window("settings") {
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, "settings", WebviewUrl::App("/settings".into()))
        .title("Settings")
        .inner_size(500.0, 520.0)
        .min_inner_size(400.0, 400.0)
        .resizable(true)
        .center()
        .decorations(false)
        .shadow(true)
        .transparent(true)
        .build()
        .map_err(|e| e.to_string())?;

    // Remove menu from settings window
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.remove_menu();
    }

    Ok(())
}

#[tauri::command]
pub async fn open_about_window(app: AppHandle) -> Result<(), String> {
    // Check if about window already exists
    if let Some(window) = app.get_webview_window("about") {
        window.set_focus().map_err(|e| e.to_string())?;
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, "about", WebviewUrl::App("/about".into()))
        .title("About CodeCell")
        .inner_size(400.0, 480.0)
        .min_inner_size(350.0, 400.0)
        .resizable(false)
        .center()
        .decorations(false)
        .shadow(true)
        .transparent(true)
        .build()
        .map_err(|e| e.to_string())?;

    // Remove menu from about window
    if let Some(window) = app.get_webview_window("about") {
        let _ = window.remove_menu();
    }

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
