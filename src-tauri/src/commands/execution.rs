use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use std::time::Instant;
use tauri::State;
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

#[derive(Default)]
pub struct RunningProcesses {
    processes: Arc<Mutex<HashMap<String, tokio::process::Child>>>,
}

impl RunningProcesses {
    pub fn new() -> Self {
        Self {
            processes: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[tauri::command]
pub async fn execute_python(
    code: String,
    _processes: State<'_, RunningProcesses>,
) -> Result<ExecutionResult, String> {
    let start = Instant::now();

    // Write code to temp file
    let temp_dir = std::env::temp_dir();
    let file_path = temp_dir.join("codecell_temp.py");
    std::fs::write(&file_path, &code).map_err(|e| e.to_string())?;

    let output = Command::new("python3")
        .arg(&file_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to execute Python: {}", e))?;

    // Cleanup temp file
    let _ = std::fs::remove_file(&file_path);

    Ok(ExecutionResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
        duration_ms: start.elapsed().as_millis() as u64,
    })
}

#[tauri::command]
pub async fn execute_node(
    code: String,
    _processes: State<'_, RunningProcesses>,
) -> Result<ExecutionResult, String> {
    let start = Instant::now();

    // Write code to temp file
    let temp_dir = std::env::temp_dir();
    let file_path = temp_dir.join("codecell_temp.js");
    std::fs::write(&file_path, &code).map_err(|e| e.to_string())?;

    let output = Command::new("node")
        .arg(&file_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to execute Node.js: {}", e))?;

    // Cleanup temp file
    let _ = std::fs::remove_file(&file_path);

    Ok(ExecutionResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
        duration_ms: start.elapsed().as_millis() as u64,
    })
}

#[tauri::command]
pub async fn execute_rust(
    code: String,
    _processes: State<'_, RunningProcesses>,
) -> Result<ExecutionResult, String> {
    let start = Instant::now();

    // Write code to temp file
    let temp_dir = std::env::temp_dir();
    let source_path = temp_dir.join("codecell_temp.rs");
    let binary_path = temp_dir.join("codecell_temp_bin");

    std::fs::write(&source_path, &code).map_err(|e| e.to_string())?;

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
        return Ok(ExecutionResult {
            stdout: String::new(),
            stderr: String::from_utf8_lossy(&compile_output.stderr).to_string(),
            exit_code: compile_output.status.code().unwrap_or(-1),
            duration_ms: start.elapsed().as_millis() as u64,
        });
    }

    // Execute
    let run_output = Command::new(&binary_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to run Rust binary: {}", e))?;

    // Cleanup
    let _ = std::fs::remove_file(&source_path);
    let _ = std::fs::remove_file(&binary_path);

    Ok(ExecutionResult {
        stdout: String::from_utf8_lossy(&run_output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&run_output.stderr).to_string(),
        exit_code: run_output.status.code().unwrap_or(-1),
        duration_ms: start.elapsed().as_millis() as u64,
    })
}

#[tauri::command]
pub async fn execute_java(
    code: String,
    _processes: State<'_, RunningProcesses>,
) -> Result<ExecutionResult, String> {
    let start = Instant::now();

    // Extract class name from code (simple regex)
    let class_name = extract_java_class_name(&code).unwrap_or("Main".to_string());

    // Create temp directory for Java
    let temp_dir = std::env::temp_dir().join("codecell_java");
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
        return Ok(ExecutionResult {
            stdout: String::new(),
            stderr: String::from_utf8_lossy(&compile_output.stderr).to_string(),
            exit_code: compile_output.status.code().unwrap_or(-1),
            duration_ms: start.elapsed().as_millis() as u64,
        });
    }

    // Execute
    let run_output = Command::new("java")
        .arg(&class_name)
        .current_dir(&temp_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to run Java: {}", e))?;

    // Cleanup
    let _ = std::fs::remove_dir_all(&temp_dir);

    Ok(ExecutionResult {
        stdout: String::from_utf8_lossy(&run_output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&run_output.stderr).to_string(),
        exit_code: run_output.status.code().unwrap_or(-1),
        duration_ms: start.elapsed().as_millis() as u64,
    })
}

#[tauri::command]
pub async fn execute_typescript(
    code: String,
    _processes: State<'_, RunningProcesses>,
) -> Result<ExecutionResult, String> {
    let start = Instant::now();

    // Write code to temp file
    let temp_dir = std::env::temp_dir();
    let file_path = temp_dir.join("codecell_temp.ts");
    std::fs::write(&file_path, &code).map_err(|e| e.to_string())?;

    // Try using tsx or ts-node, fallback to npx tsx
    let output = Command::new("npx")
        .arg("tsx")
        .arg(&file_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .await
        .map_err(|e| format!("Failed to execute TypeScript: {}", e))?;

    // Cleanup temp file
    let _ = std::fs::remove_file(&file_path);

    Ok(ExecutionResult {
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code().unwrap_or(-1),
        duration_ms: start.elapsed().as_millis() as u64,
    })
}

fn extract_java_class_name(code: &str) -> Option<String> {
    // Simple regex to find "public class ClassName"
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
