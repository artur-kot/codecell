use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use std::time::Instant;
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
    pub stream: String, // "stdout" or "stderr"
}

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

    pub async fn has_process(&self, window_id: &str) -> bool {
        let processes = self.processes.lock().await;
        processes.contains_key(window_id)
    }
}

#[tauri::command]
pub async fn stop_execution(
    window_id: String,
    processes: State<'_, RunningProcesses>,
    app: AppHandle,
) -> Result<bool, String> {
    let killed = processes.kill(&window_id).await;

    // Update menu state - disable Stop
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

fn update_stop_menu_state(app: &AppHandle, window_id: &str, enabled: bool) {
    // Emit event to frontend to update UI state
    if let Some(window) = app.get_webview_window(window_id) {
        let _ = window.emit("execution:state-changed", enabled);
    }
}

#[tauri::command]
pub async fn execute_python(
    code: String,
    window_id: String,
    processes: State<'_, RunningProcesses>,
    app: AppHandle,
) -> Result<(), String> {
    // Write code to temp file
    let temp_dir = std::env::temp_dir();
    let file_path = temp_dir.join(format!("codecell_{}.py", window_id.replace("editor-", "")));
    std::fs::write(&file_path, &code).map_err(|e| e.to_string())?;

    let mut child = Command::new("python3")
        .arg(&file_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("Failed to execute Python: {}", e))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    processes.insert(window_id.clone(), child).await;
    update_stop_menu_state(&app, &window_id, true);

    // Spawn background task to stream output
    let app_clone = app.clone();
    let window_id_clone = window_id.clone();
    let processes_clone = processes.inner().clone();
    let file_path_clone = file_path.clone();
    let start = Instant::now();

    tauri::async_runtime::spawn(async move {
        let mut stdout_output = String::new();
        let mut stderr_output = String::new();

        if let Some(stdout) = stdout {
            let app_for_stdout = app_clone.clone();
            let window_id_for_stdout = window_id_clone.clone();
            let mut reader = BufReader::new(stdout);
            let mut line = String::new();
            while reader.read_line(&mut line).await.unwrap_or(0) > 0 {
                stdout_output.push_str(&line);
                if let Some(window) = app_for_stdout.get_webview_window(&window_id_for_stdout) {
                    let _ = window.emit("execution:output", ExecutionOutput {
                        line: line.clone(),
                        stream: "stdout".to_string(),
                    });
                }
                line.clear();
            }
        }

        if let Some(stderr) = stderr {
            let app_for_stderr = app_clone.clone();
            let window_id_for_stderr = window_id_clone.clone();
            let mut reader = BufReader::new(stderr);
            let mut line = String::new();
            while reader.read_line(&mut line).await.unwrap_or(0) > 0 {
                stderr_output.push_str(&line);
                if let Some(window) = app_for_stderr.get_webview_window(&window_id_for_stderr) {
                    let _ = window.emit("execution:output", ExecutionOutput {
                        line: line.clone(),
                        stream: "stderr".to_string(),
                    });
                }
                line.clear();
            }
        }

        let exit_code = if let Some(mut child) = processes_clone.remove(&window_id_clone).await {
            child.wait().await.ok().and_then(|s| s.code()).unwrap_or(-1)
        } else {
            -1
        };

        let _ = std::fs::remove_file(&file_path_clone);

        if let Some(window) = app_clone.get_webview_window(&window_id_clone) {
            let _ = window.emit("execution:completed", ExecutionResult {
                stdout: stdout_output,
                stderr: stderr_output,
                exit_code,
                duration_ms: start.elapsed().as_millis() as u64,
            });
        }

        update_stop_menu_state(&app_clone, &window_id_clone, false);
    });

    Ok(())
}

#[tauri::command]
pub async fn execute_node(
    code: String,
    window_id: String,
    processes: State<'_, RunningProcesses>,
    app: AppHandle,
) -> Result<(), String> {
    // Write code to temp file
    let temp_dir = std::env::temp_dir();
    let file_path = temp_dir.join(format!("codecell_{}.js", window_id.replace("editor-", "")));
    std::fs::write(&file_path, &code).map_err(|e| e.to_string())?;

    let mut child = Command::new("node")
        .arg(&file_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("Failed to execute Node.js: {}", e))?;

    // Take stdout/stderr before storing
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    // Store process immediately
    processes.insert(window_id.clone(), child).await;
    update_stop_menu_state(&app, &window_id, true);

    // Spawn background task to stream output
    let app_clone = app.clone();
    let window_id_clone = window_id.clone();
    let processes_clone = processes.inner().clone();
    let file_path_clone = file_path.clone();
    let start = Instant::now();

    tauri::async_runtime::spawn(async move {
        let mut stdout_output = String::new();
        let mut stderr_output = String::new();

        // Read stdout in background
        if let Some(stdout) = stdout {
            let app_for_stdout = app_clone.clone();
            let window_id_for_stdout = window_id_clone.clone();
            let mut reader = BufReader::new(stdout);
            let mut line = String::new();
            while reader.read_line(&mut line).await.unwrap_or(0) > 0 {
                stdout_output.push_str(&line);
                // Stream output line to frontend
                if let Some(window) = app_for_stdout.get_webview_window(&window_id_for_stdout) {
                    let _ = window.emit("execution:output", ExecutionOutput {
                        line: line.clone(),
                        stream: "stdout".to_string(),
                    });
                }
                line.clear();
            }
        }

        // Read stderr
        if let Some(stderr) = stderr {
            let app_for_stderr = app_clone.clone();
            let window_id_for_stderr = window_id_clone.clone();
            let mut reader = BufReader::new(stderr);
            let mut line = String::new();
            while reader.read_line(&mut line).await.unwrap_or(0) > 0 {
                stderr_output.push_str(&line);
                // Stream output line to frontend
                if let Some(window) = app_for_stderr.get_webview_window(&window_id_for_stderr) {
                    let _ = window.emit("execution:output", ExecutionOutput {
                        line: line.clone(),
                        stream: "stderr".to_string(),
                    });
                }
                line.clear();
            }
        }

        // Get exit code
        let exit_code = if let Some(mut child) = processes_clone.remove(&window_id_clone).await {
            child.wait().await.ok().and_then(|s| s.code()).unwrap_or(-1)
        } else {
            -1 // Process was killed
        };

        // Cleanup temp file
        let _ = std::fs::remove_file(&file_path_clone);

        // Emit completion event
        if let Some(window) = app_clone.get_webview_window(&window_id_clone) {
            let _ = window.emit("execution:completed", ExecutionResult {
                stdout: stdout_output,
                stderr: stderr_output,
                exit_code,
                duration_ms: start.elapsed().as_millis() as u64,
            });
        }

        // Update menu state
        update_stop_menu_state(&app_clone, &window_id_clone, false);
    });

    Ok(())
}

#[tauri::command]
pub async fn execute_rust(
    code: String,
    window_id: String,
    processes: State<'_, RunningProcesses>,
    app: AppHandle,
) -> Result<(), String> {
    let start = Instant::now();

    // Write code to temp file
    let temp_dir = std::env::temp_dir();
    let id = window_id.replace("editor-", "");
    let source_path = temp_dir.join(format!("codecell_{}.rs", id));
    let binary_path = temp_dir.join(format!("codecell_{}_bin", id));

    std::fs::write(&source_path, &code).map_err(|e| e.to_string())?;

    // Compile (not tracked - compilation is usually fast)
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
        // Emit compile error as completion
        if let Some(window) = app.get_webview_window(&window_id) {
            let _ = window.emit("execution:completed", ExecutionResult {
                stdout: String::new(),
                stderr: String::from_utf8_lossy(&compile_output.stderr).to_string(),
                exit_code: compile_output.status.code().unwrap_or(-1),
                duration_ms: start.elapsed().as_millis() as u64,
            });
        }
        return Ok(());
    }

    // Execute
    let mut child = Command::new(&binary_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("Failed to run Rust binary: {}", e))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    processes.insert(window_id.clone(), child).await;
    update_stop_menu_state(&app, &window_id, true);

    let app_clone = app.clone();
    let window_id_clone = window_id.clone();
    let processes_clone = processes.inner().clone();
    let source_path_clone = source_path.clone();
    let binary_path_clone = binary_path.clone();

    tauri::async_runtime::spawn(async move {
        let mut stdout_output = String::new();
        let mut stderr_output = String::new();

        if let Some(stdout) = stdout {
            let app_for_stdout = app_clone.clone();
            let window_id_for_stdout = window_id_clone.clone();
            let mut reader = BufReader::new(stdout);
            let mut line = String::new();
            while reader.read_line(&mut line).await.unwrap_or(0) > 0 {
                stdout_output.push_str(&line);
                if let Some(window) = app_for_stdout.get_webview_window(&window_id_for_stdout) {
                    let _ = window.emit("execution:output", ExecutionOutput {
                        line: line.clone(),
                        stream: "stdout".to_string(),
                    });
                }
                line.clear();
            }
        }

        if let Some(stderr) = stderr {
            let app_for_stderr = app_clone.clone();
            let window_id_for_stderr = window_id_clone.clone();
            let mut reader = BufReader::new(stderr);
            let mut line = String::new();
            while reader.read_line(&mut line).await.unwrap_or(0) > 0 {
                stderr_output.push_str(&line);
                if let Some(window) = app_for_stderr.get_webview_window(&window_id_for_stderr) {
                    let _ = window.emit("execution:output", ExecutionOutput {
                        line: line.clone(),
                        stream: "stderr".to_string(),
                    });
                }
                line.clear();
            }
        }

        let exit_code = if let Some(mut child) = processes_clone.remove(&window_id_clone).await {
            child.wait().await.ok().and_then(|s| s.code()).unwrap_or(-1)
        } else {
            -1
        };

        let _ = std::fs::remove_file(&source_path_clone);
        let _ = std::fs::remove_file(&binary_path_clone);

        if let Some(window) = app_clone.get_webview_window(&window_id_clone) {
            let _ = window.emit("execution:completed", ExecutionResult {
                stdout: stdout_output,
                stderr: stderr_output,
                exit_code,
                duration_ms: start.elapsed().as_millis() as u64,
            });
        }

        update_stop_menu_state(&app_clone, &window_id_clone, false);
    });

    Ok(())
}

#[tauri::command]
pub async fn execute_java(
    code: String,
    window_id: String,
    processes: State<'_, RunningProcesses>,
    app: AppHandle,
) -> Result<(), String> {
    let start = Instant::now();

    // Extract class name from code
    let class_name = extract_java_class_name(&code).unwrap_or("Main".to_string());

    // Create temp directory for Java
    let id = window_id.replace("editor-", "");
    let temp_dir = std::env::temp_dir().join(format!("codecell_java_{}", id));
    std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let source_path = temp_dir.join(format!("{}.java", class_name));
    std::fs::write(&source_path, &code).map_err(|e| e.to_string())?;

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
        if let Some(window) = app.get_webview_window(&window_id) {
            let _ = window.emit("execution:completed", ExecutionResult {
                stdout: String::new(),
                stderr: String::from_utf8_lossy(&compile_output.stderr).to_string(),
                exit_code: compile_output.status.code().unwrap_or(-1),
                duration_ms: start.elapsed().as_millis() as u64,
            });
        }
        return Ok(());
    }

    // Execute
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
    processes.insert(window_id.clone(), child).await;
    update_stop_menu_state(&app, &window_id, true);

    let app_clone = app.clone();
    let window_id_clone = window_id.clone();
    let processes_clone = processes.inner().clone();
    let temp_dir_clone = temp_dir.clone();

    tauri::async_runtime::spawn(async move {
        let mut stdout_output = String::new();
        let mut stderr_output = String::new();

        if let Some(stdout) = stdout {
            let app_for_stdout = app_clone.clone();
            let window_id_for_stdout = window_id_clone.clone();
            let mut reader = BufReader::new(stdout);
            let mut line = String::new();
            while reader.read_line(&mut line).await.unwrap_or(0) > 0 {
                stdout_output.push_str(&line);
                if let Some(window) = app_for_stdout.get_webview_window(&window_id_for_stdout) {
                    let _ = window.emit("execution:output", ExecutionOutput {
                        line: line.clone(),
                        stream: "stdout".to_string(),
                    });
                }
                line.clear();
            }
        }

        if let Some(stderr) = stderr {
            let app_for_stderr = app_clone.clone();
            let window_id_for_stderr = window_id_clone.clone();
            let mut reader = BufReader::new(stderr);
            let mut line = String::new();
            while reader.read_line(&mut line).await.unwrap_or(0) > 0 {
                stderr_output.push_str(&line);
                if let Some(window) = app_for_stderr.get_webview_window(&window_id_for_stderr) {
                    let _ = window.emit("execution:output", ExecutionOutput {
                        line: line.clone(),
                        stream: "stderr".to_string(),
                    });
                }
                line.clear();
            }
        }

        let exit_code = if let Some(mut child) = processes_clone.remove(&window_id_clone).await {
            child.wait().await.ok().and_then(|s| s.code()).unwrap_or(-1)
        } else {
            -1
        };

        let _ = std::fs::remove_dir_all(&temp_dir_clone);

        if let Some(window) = app_clone.get_webview_window(&window_id_clone) {
            let _ = window.emit("execution:completed", ExecutionResult {
                stdout: stdout_output,
                stderr: stderr_output,
                exit_code,
                duration_ms: start.elapsed().as_millis() as u64,
            });
        }

        update_stop_menu_state(&app_clone, &window_id_clone, false);
    });

    Ok(())
}

#[tauri::command]
pub async fn execute_typescript(
    code: String,
    window_id: String,
    processes: State<'_, RunningProcesses>,
    app: AppHandle,
) -> Result<(), String> {
    // Write code to temp file
    let temp_dir = std::env::temp_dir();
    let file_path = temp_dir.join(format!("codecell_{}.ts", window_id.replace("editor-", "")));
    std::fs::write(&file_path, &code).map_err(|e| e.to_string())?;

    let mut child = Command::new("npx")
        .arg("tsx")
        .arg(&file_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("Failed to execute TypeScript: {}", e))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();
    processes.insert(window_id.clone(), child).await;
    update_stop_menu_state(&app, &window_id, true);

    let app_clone = app.clone();
    let window_id_clone = window_id.clone();
    let processes_clone = processes.inner().clone();
    let file_path_clone = file_path.clone();
    let start = Instant::now();

    tauri::async_runtime::spawn(async move {
        let mut stdout_output = String::new();
        let mut stderr_output = String::new();

        if let Some(stdout) = stdout {
            let app_for_stdout = app_clone.clone();
            let window_id_for_stdout = window_id_clone.clone();
            let mut reader = BufReader::new(stdout);
            let mut line = String::new();
            while reader.read_line(&mut line).await.unwrap_or(0) > 0 {
                stdout_output.push_str(&line);
                if let Some(window) = app_for_stdout.get_webview_window(&window_id_for_stdout) {
                    let _ = window.emit("execution:output", ExecutionOutput {
                        line: line.clone(),
                        stream: "stdout".to_string(),
                    });
                }
                line.clear();
            }
        }

        if let Some(stderr) = stderr {
            let app_for_stderr = app_clone.clone();
            let window_id_for_stderr = window_id_clone.clone();
            let mut reader = BufReader::new(stderr);
            let mut line = String::new();
            while reader.read_line(&mut line).await.unwrap_or(0) > 0 {
                stderr_output.push_str(&line);
                if let Some(window) = app_for_stderr.get_webview_window(&window_id_for_stderr) {
                    let _ = window.emit("execution:output", ExecutionOutput {
                        line: line.clone(),
                        stream: "stderr".to_string(),
                    });
                }
                line.clear();
            }
        }

        let exit_code = if let Some(mut child) = processes_clone.remove(&window_id_clone).await {
            child.wait().await.ok().and_then(|s| s.code()).unwrap_or(-1)
        } else {
            -1
        };

        let _ = std::fs::remove_file(&file_path_clone);

        if let Some(window) = app_clone.get_webview_window(&window_id_clone) {
            let _ = window.emit("execution:completed", ExecutionResult {
                stdout: stdout_output,
                stderr: stderr_output,
                exit_code,
                duration_ms: start.elapsed().as_millis() as u64,
            });
        }

        update_stop_menu_state(&app_clone, &window_id_clone, false);
    });

    Ok(())
}

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
