# Runtime Dependency Detection

## Overview

CodeCell detects missing runtime dependencies when users attempt to execute code, providing smart installation guidance based on the user's operating system and available package managers.

## Design Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Detection timing | On first run | No startup overhead, errors only when relevant |
| UX | Inline error in output | Non-intrusive, contextual feedback |
| Guidance | Smart OS/package manager detection | Actionable, copy-paste commands |
| Version check | None | Accept any version, let runtime errors surface |
| Scope | All templates | Node.js, Python, Rust, Java |

## Implementation

### 1. Runtime Detection (Rust)

Location: `src-tauri/src/services/runtime_detector.rs`

```rust
pub struct RuntimeInfo {
    pub name: &'static str,
    pub command: &'static str,
    pub version_flag: &'static str,
}

pub const RUNTIMES: &[(&str, RuntimeInfo)] = &[
    ("node", RuntimeInfo { name: "Node.js", command: "node", version_flag: "--version" }),
    ("python", RuntimeInfo { name: "Python", command: "python3", version_flag: "--version" }),
    ("rust", RuntimeInfo { name: "Rust", command: "rustc", version_flag: "--version" }),
    ("java", RuntimeInfo { name: "Java", command: "java", version_flag: "-version" }),
];
```

Detection method:
- Use `which` (Unix) or `where` (Windows) to check if command exists in PATH
- Fallback: attempt to run `<command> --version` and check exit code

### 2. Platform Detection

Detect OS and package manager:

```rust
pub enum Platform {
    MacOS { has_homebrew: bool },
    Linux { distro: LinuxDistro, has_package_manager: bool },
    Windows { has_winget: bool, has_chocolatey: bool },
}

pub enum LinuxDistro {
    Debian,  // apt
    Fedora,  // dnf
    Arch,    // pacman
    Unknown,
}
```

### 3. Install Commands

| Runtime | macOS (Homebrew) | Debian/Ubuntu | Fedora | Arch | Windows |
|---------|------------------|---------------|--------|------|---------|
| Node.js | `brew install node` | `sudo apt install nodejs npm` | `sudo dnf install nodejs` | `sudo pacman -S nodejs npm` | `winget install OpenJS.NodeJS` |
| Python | `brew install python` | `sudo apt install python3` | `sudo dnf install python3` | `sudo pacman -S python` | `winget install Python.Python.3` |
| Rust | `brew install rust` | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` | (same) | `sudo pacman -S rust` | `winget install Rustlang.Rust.MSVC` |
| Java | `brew install openjdk` | `sudo apt install default-jdk` | `sudo dnf install java-latest-openjdk` | `sudo pacman -S jdk-openjdk` | `winget install Oracle.JDK` |

### 4. Error Message Format

```
Error: Node.js is not installed

To install Node.js on your system:
  brew install node

Or download from: https://nodejs.org/
```

### 5. Integration Points

1. **execution.rs**: Before spawning process, check runtime availability
2. **On detection failure**: Return structured error with install instructions
3. **Frontend**: Display error in output panel with proper formatting

## File Changes

- `src-tauri/src/services/mod.rs` - Add runtime_detector module
- `src-tauri/src/services/runtime_detector.rs` - New file with detection logic
- `src-tauri/src/commands/execution.rs` - Add runtime check before execution
