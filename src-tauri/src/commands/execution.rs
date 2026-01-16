use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Arc;
use std::time::Instant;
use tauri::menu::MenuItemKind;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecutionOutput {
    pub line: String,
    pub stream: String,
}

// --- Process Management ---

#[derive(Default, Clone)]
pub struct RunningProcesses {
    processes: Arc<Mutex<HashMap<String, tokio::process::Child>>>,
}

impl RunningProcesses {
    pub fn new() -> Self {
        Self {
            processes: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn insert(&self, window_id: String, child: tokio::process::Child) {
        let mut processes = self.processes.lock().await;
        processes.insert(window_id, child);
    }

    pub async fn remove(&self, window_id: &str) -> Option<tokio::process::Child> {
        let mut processes = self.processes.lock().await;
        processes.remove(window_id)
    }

    pub async fn kill(&self, window_id: &str) -> bool {
        if let Some(mut child) = self.remove(window_id).await {
            let _ = child.kill().await;
            true
        } else {
            false
        }
    }
}

// --- Menu State Updates ---

fn update_stop_menu_state(app: &AppHandle, window_id: &str, enabled: bool) {
    // Use emit_to to send event only to the specific window
    let _ = app.emit_to(window_id, "execution:state-changed", enabled);

    if let Some(window) = app.get_webview_window(window_id) {
        if let Some(menu) = window.menu() {
            if let Ok(items) = menu.items() {
                for item in items {
                    if let MenuItemKind::Submenu(submenu) = item {
                        if let Ok(sub_items) = submenu.items() {
                            for sub_item in sub_items {
                                if let MenuItemKind::MenuItem(menu_item) = sub_item {
                                    if menu_item.id().0 == "stop_code" {
                                        let _ = menu_item.set_enabled(enabled);
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// --- Public Commands ---

#[tauri::command]
pub async fn stop_execution(
    window_id: String,
    processes: State<'_, RunningProcesses>,
    app: AppHandle,
) -> Result<bool, String> {
    let killed = processes.kill(&window_id).await;
    update_stop_menu_state(&app, &window_id, false);
    Ok(killed)
}

#[tauri::command]
pub async fn kill_window_processes(
    window_id: String,
    processes: State<'_, RunningProcesses>,
) -> Result<(), String> {
    processes.kill(&window_id).await;
    Ok(())
}

#[tauri::command]
pub async fn execute_python(
    code: String,
    window_id: String,
    processes: State<'_, RunningProcesses>,
    app: AppHandle,
) -> Result<(), String> {
    execute_interpreted(&code, &window_id, "py", "python3", &[], &processes, &app).await
}

#[tauri::command]
pub async fn execute_node(
    code: String,
    window_id: String,
    processes: State<'_, RunningProcesses>,
    app: AppHandle,
) -> Result<(), String> {
    execute_interpreted(&code, &window_id, "js", "node", &[], &processes, &app).await
}

#[tauri::command]
pub async fn execute_typescript(
    code: String,
    window_id: String,
    processes: State<'_, RunningProcesses>,
    app: AppHandle,
) -> Result<(), String> {
    execute_interpreted(&code, &window_id, "ts", "npx", &["tsx"], &processes, &app).await
}

#[tauri::command]
pub async fn execute_rust(
    code: String,
    window_id: String,
    processes: State<'_, RunningProcesses>,
    app: AppHandle,
) -> Result<(), String> {
    execute_compiled_rust(&code, &window_id, &processes, &app).await
}

#[tauri::command]
pub async fn execute_java(
    code: String,
    window_id: String,
    processes: State<'_, RunningProcesses>,
    app: AppHandle,
) -> Result<(), String> {
    execute_compiled_java(&code, &window_id, &processes, &app).await
}

// --- Generic Execution Helpers ---

/// Execute an interpreted language (Python, Node, TypeScript)
async fn execute_interpreted(
    code: &str,
    window_id: &str,
    extension: &str,
    command: &str,
    extra_args: &[&str],
    processes: &State<'_, RunningProcesses>,
    app: &AppHandle,
) -> Result<(), String> {
    let temp_dir = std::env::temp_dir();
    let id = window_id.replace("editor-", "");
    let file_path = temp_dir.join(format!("codecell_{}.{}", id, extension));

    std::fs::write(&file_path, code).map_err(|e| e.to_string())?;

    let mut cmd = Command::new(command);
    for arg in extra_args {
        cmd.arg(arg);
    }
    cmd.arg(&file_path);

    let mut child = cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("Failed to execute {}: {}", command, e))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    processes.insert(window_id.to_string(), child).await;
    update_stop_menu_state(app, window_id, true);

    spawn_output_streamer(
        stdout,
        stderr,
        window_id.to_string(),
        app.clone(),
        processes.inner().clone(),
        vec![file_path],
    );

    Ok(())
}

/// Execute Rust (compile then run)
async fn execute_compiled_rust(
    code: &str,
    window_id: &str,
    processes: &State<'_, RunningProcesses>,
    app: &AppHandle,
) -> Result<(), String> {
    let start = Instant::now();
    let temp_dir = std::env::temp_dir();
    let id = window_id.replace("editor-", "");
    let source_path = temp_dir.join(format!("codecell_{}.rs", id));
    let binary_path = temp_dir.join(format!("codecell_{}_bin", id));

    std::fs::write(&source_path, code).map_err(|e| e.to_string())?;

    // Compile
    let compile_output = Command::new("rustc")
        .arg(&source_path)
        .arg("-o")
        .arg(&binary_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to compile Rust: {}", e))?;

    if !compile_output.status.success() {
        let _ = std::fs::remove_file(&source_path);
        emit_completion(
            app,
            window_id,
            "",
            &String::from_utf8_lossy(&compile_output.stderr),
            compile_output.status.code().unwrap_or(-1),
            start.elapsed().as_millis() as u64,
        );
        return Ok(());
    }

    // Run
    let mut child = Command::new(&binary_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("Failed to run Rust binary: {}", e))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    processes.insert(window_id.to_string(), child).await;
    update_stop_menu_state(app, window_id, true);

    spawn_output_streamer(
        stdout,
        stderr,
        window_id.to_string(),
        app.clone(),
        processes.inner().clone(),
        vec![source_path, binary_path],
    );

    Ok(())
}

/// Execute Java (compile then run)
async fn execute_compiled_java(
    code: &str,
    window_id: &str,
    processes: &State<'_, RunningProcesses>,
    app: &AppHandle,
) -> Result<(), String> {
    let start = Instant::now();
    let class_name = extract_java_class_name(code).unwrap_or_else(|| "Main".to_string());
    let id = window_id.replace("editor-", "");
    let temp_dir = std::env::temp_dir().join(format!("codecell_java_{}", id));

    std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let source_path = temp_dir.join(format!("{}.java", class_name));
    std::fs::write(&source_path, code).map_err(|e| e.to_string())?;

    // Compile
    let compile_output = Command::new("javac")
        .arg(&source_path)
        .current_dir(&temp_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to compile Java: {}", e))?;

    if !compile_output.status.success() {
        let _ = std::fs::remove_dir_all(&temp_dir);
        emit_completion(
            app,
            window_id,
            "",
            &String::from_utf8_lossy(&compile_output.stderr),
            compile_output.status.code().unwrap_or(-1),
            start.elapsed().as_millis() as u64,
        );
        return Ok(());
    }

    // Run
    let mut child = Command::new("java")
        .arg(&class_name)
        .current_dir(&temp_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("Failed to run Java: {}", e))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    processes.insert(window_id.to_string(), child).await;
    update_stop_menu_state(app, window_id, true);

    spawn_output_streamer_with_dir(
        stdout,
        stderr,
        window_id.to_string(),
        app.clone(),
        processes.inner().clone(),
        temp_dir,
    );

    Ok(())
}

// --- Output Streaming ---

fn spawn_output_streamer(
    stdout: Option<tokio::process::ChildStdout>,
    stderr: Option<tokio::process::ChildStderr>,
    window_id: String,
    app: AppHandle,
    processes: RunningProcesses,
    cleanup_files: Vec<PathBuf>,
) {
    let start = Instant::now();

    tauri::async_runtime::spawn(async move {
        let (stdout_output, stderr_output) = stream_outputs(stdout, stderr, &window_id, &app).await;

        let exit_code = wait_for_process(&processes, &window_id).await;

        // Cleanup files
        for file in cleanup_files {
            let _ = std::fs::remove_file(&file);
        }

        emit_completion(
            &app,
            &window_id,
            &stdout_output,
            &stderr_output,
            exit_code,
            start.elapsed().as_millis() as u64,
        );

        update_stop_menu_state(&app, &window_id, false);
    });
}

fn spawn_output_streamer_with_dir(
    stdout: Option<tokio::process::ChildStdout>,
    stderr: Option<tokio::process::ChildStderr>,
    window_id: String,
    app: AppHandle,
    processes: RunningProcesses,
    cleanup_dir: PathBuf,
) {
    let start = Instant::now();

    tauri::async_runtime::spawn(async move {
        let (stdout_output, stderr_output) = stream_outputs(stdout, stderr, &window_id, &app).await;

        let exit_code = wait_for_process(&processes, &window_id).await;

        // Cleanup directory
        let _ = std::fs::remove_dir_all(&cleanup_dir);

        emit_completion(
            &app,
            &window_id,
            &stdout_output,
            &stderr_output,
            exit_code,
            start.elapsed().as_millis() as u64,
        );

        update_stop_menu_state(&app, &window_id, false);
    });
}

async fn stream_outputs(
    stdout: Option<tokio::process::ChildStdout>,
    stderr: Option<tokio::process::ChildStderr>,
    window_id: &str,
    app: &AppHandle,
) -> (String, String) {
    let mut stdout_output = String::new();
    let mut stderr_output = String::new();

    if let Some(stdout) = stdout {
        let mut reader = BufReader::new(stdout);
        let mut line = String::new();
        while reader.read_line(&mut line).await.unwrap_or(0) > 0 {
            stdout_output.push_str(&line);
            emit_output(app, window_id, &line, "stdout");
            line.clear();
        }
    }

    if let Some(stderr) = stderr {
        let mut reader = BufReader::new(stderr);
        let mut line = String::new();
        while reader.read_line(&mut line).await.unwrap_or(0) > 0 {
            stderr_output.push_str(&line);
            emit_output(app, window_id, &line, "stderr");
            line.clear();
        }
    }

    (stdout_output, stderr_output)
}

async fn wait_for_process(processes: &RunningProcesses, window_id: &str) -> i32 {
    if let Some(mut child) = processes.remove(window_id).await {
        child.wait().await.ok().and_then(|s| s.code()).unwrap_or(-1)
    } else {
        -1
    }
}

fn emit_output(app: &AppHandle, window_id: &str, line: &str, stream: &str) {
    // Use emit_to to send event only to the specific window
    let _ = app.emit_to(
        window_id,
        "execution:output",
        ExecutionOutput {
            line: line.to_string(),
            stream: stream.to_string(),
        },
    );
}

fn emit_completion(
    app: &AppHandle,
    window_id: &str,
    stdout: &str,
    stderr: &str,
    exit_code: i32,
    duration_ms: u64,
) {
    // Use emit_to to send event only to the specific window
    let _ = app.emit_to(
        window_id,
        "execution:completed",
        ExecutionResult {
            stdout: stdout.to_string(),
            stderr: stderr.to_string(),
            exit_code,
            duration_ms,
        },
    );
}

// --- Utilities ---

fn extract_java_class_name(code: &str) -> Option<String> {
    for line in code.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("public class ") {
            let rest = &trimmed[13..];
            let class_name: String = rest
                .chars()
                .take_while(|c| c.is_alphanumeric() || *c == '_')
                .collect();
            if !class_name.is_empty() {
                return Some(class_name);
            }
        }
    }
    None
}
