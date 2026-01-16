use std::process::Command;

/// Information about a runtime environment
#[derive(Debug, Clone)]
pub struct RuntimeInfo {
    pub name: &'static str,
    pub command: &'static str,
    pub download_url: &'static str,
}

/// Platform and package manager information
#[derive(Debug)]
pub enum Platform {
    MacOS { has_homebrew: bool },
    Linux { distro: LinuxDistro },
    Windows { has_winget: bool },
    Unknown,
}

#[derive(Debug)]
pub enum LinuxDistro {
    Debian,  // apt (Ubuntu, Debian, Pop!_OS, etc.)
    Fedora,  // dnf (Fedora, RHEL, CentOS)
    Arch,    // pacman (Arch, Manjaro, EndeavourOS)
    Unknown,
}

/// Runtime detection result
#[derive(Debug)]
pub struct RuntimeCheckResult {
    pub available: bool,
    pub install_hint: Option<String>,
}

impl RuntimeInfo {
    pub const NODE: RuntimeInfo = RuntimeInfo {
        name: "Node.js",
        command: "node",
        download_url: "https://nodejs.org/",
    };

    pub const PYTHON: RuntimeInfo = RuntimeInfo {
        name: "Python",
        command: "python3",
        download_url: "https://www.python.org/downloads/",
    };

    pub const RUST: RuntimeInfo = RuntimeInfo {
        name: "Rust",
        command: "rustc",
        download_url: "https://rustup.rs/",
    };

    pub const JAVA: RuntimeInfo = RuntimeInfo {
        name: "Java",
        command: "java",
        download_url: "https://adoptium.net/",
    };

    pub const JAVAC: RuntimeInfo = RuntimeInfo {
        name: "Java Compiler",
        command: "javac",
        download_url: "https://adoptium.net/",
    };

    pub const NPX: RuntimeInfo = RuntimeInfo {
        name: "npx (Node.js)",
        command: "npx",
        download_url: "https://nodejs.org/",
    };
}

/// Check if a command exists in PATH
fn command_exists(cmd: &str) -> bool {
    #[cfg(target_os = "windows")]
    {
        Command::new("where")
            .arg(cmd)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    #[cfg(not(target_os = "windows"))]
    {
        Command::new("which")
            .arg(cmd)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
}

/// Detect the current platform and available package managers
pub fn detect_platform() -> Platform {
    #[cfg(target_os = "macos")]
    {
        let has_homebrew = command_exists("brew");
        Platform::MacOS { has_homebrew }
    }

    #[cfg(target_os = "linux")]
    {
        let distro = detect_linux_distro();
        Platform::Linux { distro }
    }

    #[cfg(target_os = "windows")]
    {
        let has_winget = command_exists("winget");
        Platform::Windows { has_winget }
    }

    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    {
        Platform::Unknown
    }
}

#[cfg(target_os = "linux")]
fn detect_linux_distro() -> LinuxDistro {
    // Check for common package managers
    if command_exists("apt") {
        return LinuxDistro::Debian;
    }
    if command_exists("dnf") {
        return LinuxDistro::Fedora;
    }
    if command_exists("pacman") {
        return LinuxDistro::Arch;
    }

    // Fallback: try to read /etc/os-release
    if let Ok(content) = std::fs::read_to_string("/etc/os-release") {
        let content_lower = content.to_lowercase();
        if content_lower.contains("ubuntu")
            || content_lower.contains("debian")
            || content_lower.contains("pop")
            || content_lower.contains("mint")
        {
            return LinuxDistro::Debian;
        }
        if content_lower.contains("fedora")
            || content_lower.contains("rhel")
            || content_lower.contains("centos")
        {
            return LinuxDistro::Fedora;
        }
        if content_lower.contains("arch")
            || content_lower.contains("manjaro")
            || content_lower.contains("endeavour")
            || content_lower.contains("cachyos")
        {
            return LinuxDistro::Arch;
        }
    }

    LinuxDistro::Unknown
}

/// Get install command for a runtime based on platform
fn get_install_command(runtime: &RuntimeInfo, platform: &Platform) -> Option<String> {
    match (runtime.command, platform) {
        // Node.js
        ("node" | "npx", Platform::MacOS { has_homebrew: true }) => {
            Some("brew install node".to_string())
        }
        ("node" | "npx", Platform::Linux { distro: LinuxDistro::Debian }) => {
            Some("sudo apt install nodejs npm".to_string())
        }
        ("node" | "npx", Platform::Linux { distro: LinuxDistro::Fedora }) => {
            Some("sudo dnf install nodejs npm".to_string())
        }
        ("node" | "npx", Platform::Linux { distro: LinuxDistro::Arch }) => {
            Some("sudo pacman -S nodejs npm".to_string())
        }
        ("node" | "npx", Platform::Windows { has_winget: true }) => {
            Some("winget install OpenJS.NodeJS".to_string())
        }

        // Python
        ("python3", Platform::MacOS { has_homebrew: true }) => {
            Some("brew install python".to_string())
        }
        ("python3", Platform::Linux { distro: LinuxDistro::Debian }) => {
            Some("sudo apt install python3".to_string())
        }
        ("python3", Platform::Linux { distro: LinuxDistro::Fedora }) => {
            Some("sudo dnf install python3".to_string())
        }
        ("python3", Platform::Linux { distro: LinuxDistro::Arch }) => {
            Some("sudo pacman -S python".to_string())
        }
        ("python3", Platform::Windows { has_winget: true }) => {
            Some("winget install Python.Python.3.12".to_string())
        }

        // Rust
        ("rustc", Platform::MacOS { has_homebrew: true }) => Some("brew install rust".to_string()),
        ("rustc", Platform::Linux { distro: LinuxDistro::Arch }) => {
            Some("sudo pacman -S rust".to_string())
        }
        ("rustc", Platform::Linux { .. }) => {
            Some("curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh".to_string())
        }
        ("rustc", Platform::Windows { has_winget: true }) => {
            Some("winget install Rustlang.Rustup".to_string())
        }

        // Java
        ("java" | "javac", Platform::MacOS { has_homebrew: true }) => {
            Some("brew install openjdk".to_string())
        }
        ("java" | "javac", Platform::Linux { distro: LinuxDistro::Debian }) => {
            Some("sudo apt install default-jdk".to_string())
        }
        ("java" | "javac", Platform::Linux { distro: LinuxDistro::Fedora }) => {
            Some("sudo dnf install java-latest-openjdk-devel".to_string())
        }
        ("java" | "javac", Platform::Linux { distro: LinuxDistro::Arch }) => {
            Some("sudo pacman -S jdk-openjdk".to_string())
        }
        ("java" | "javac", Platform::Windows { has_winget: true }) => {
            Some("winget install EclipseAdoptium.Temurin.21.JDK".to_string())
        }

        _ => None,
    }
}

/// Check if a runtime is available and return install hints if not
pub fn check_runtime(runtime: &RuntimeInfo) -> RuntimeCheckResult {
    if command_exists(runtime.command) {
        return RuntimeCheckResult {
            available: true,
            install_hint: None,
        };
    }

    let platform = detect_platform();
    let install_cmd = get_install_command(runtime, &platform);

    let hint = format_install_hint(runtime, install_cmd);

    RuntimeCheckResult {
        available: false,
        install_hint: Some(hint),
    }
}

/// Format a user-friendly install hint message
fn format_install_hint(runtime: &RuntimeInfo, install_cmd: Option<String>) -> String {
    let mut hint = format!("Error: {} is not installed\n\n", runtime.name);

    if let Some(cmd) = install_cmd {
        hint.push_str(&format!("To install {} on your system:\n", runtime.name));
        hint.push_str(&format!("  {}\n\n", cmd));
    }

    hint.push_str(&format!("Or download from: {}\n", runtime.download_url));

    hint
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_command_exists() {
        // "ls" or "dir" should exist on any system
        #[cfg(not(target_os = "windows"))]
        assert!(command_exists("ls"));

        #[cfg(target_os = "windows")]
        assert!(command_exists("dir"));

        // This shouldn't exist
        assert!(!command_exists("definitely_not_a_real_command_12345"));
    }

    #[test]
    fn test_format_install_hint() {
        let hint = format_install_hint(&RuntimeInfo::NODE, Some("brew install node".to_string()));
        assert!(hint.contains("Node.js is not installed"));
        assert!(hint.contains("brew install node"));
        assert!(hint.contains("https://nodejs.org/"));
    }
}
