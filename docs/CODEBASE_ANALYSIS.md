# CodeCell Codebase Analysis & Improvement Plan

## Executive Summary

CodeCell is a well-architected Tauri + React code playground at MVP stage (v0.1.0). The codebase has solid foundations but needs improved linting, code deduplication, and feature completion. This document outlines lint rules, missing features, and a roadmap for keeping the app maintainable and feature-rich.

---

## 1. Lint Rules Implementation

### 1.1 Frontend (ESLint) - Code Quality Rules

The current ESLint setup is good but lacks rules to prevent spaghetti code. Add these to `eslint.config.js`:

```javascript
// eslint.config.js - Add to rules section
{
  rules: {
    // === COMPLEXITY LIMITS (Prevent Spaghetti Code) ===
    "complexity": ["warn", 10],                          // Max cyclomatic complexity per function
    "max-lines": ["warn", { max: 300, skipBlankLines: true, skipComments: true }],
    "max-lines-per-function": ["warn", { max: 80, skipBlankLines: true, skipComments: true }],
    "max-nested-callbacks": ["warn", 3],
    "max-depth": ["warn", 4],                            // Max nesting depth in functions
    "max-params": ["warn", 4],                           // Max function parameters

    // === CODE QUALITY ===
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "no-duplicate-imports": "error",
    "no-else-return": "warn",
    "prefer-const": "error",
    "no-var": "error",
    "eqeqeq": ["error", "always"],

    // === TYPESCRIPT SPECIFIC ===
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": ["warn", {
      allowExpressions: true,
      allowTypedFunctionExpressions: true
    }],
    "@typescript-eslint/no-unused-vars": ["error", {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_"
    }],
    "@typescript-eslint/consistent-type-imports": "warn",
    "@typescript-eslint/no-floating-promises": "error",

    // === REACT SPECIFIC ===
    "react-hooks/exhaustive-deps": "warn",
    "react/jsx-no-useless-fragment": "warn",
    "react/self-closing-comp": "warn",
  }
}
```

### 1.2 Frontend - Add Missing npm Scripts

```json
// package.json - Add to scripts
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,css}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx,json,css}\"",
    "typecheck": "tsc --noEmit",
    "check": "npm run typecheck && npm run lint && npm run format:check"
  }
}
```

### 1.3 Rust (Clippy) - Create Configuration

Create `src-tauri/.cargo/config.toml`:

```toml
[target.'cfg(all())']
rustflags = [
  # === DENY (Errors) ===
  "-Dclippy::unwrap_used",           # Prevent .unwrap() - use ? or expect with context
  "-Dclippy::expect_used",           # Prevent bare .expect() without good reason
  "-Dclippy::panic",                 # Prevent panic!() in library code
  "-Dclippy::todo",                  # Prevent todo!() in committed code

  # === WARN ===
  "-Wclippy::pedantic",              # Enable pedantic lints
  "-Wclippy::nursery",               # Enable nursery lints
  "-Wclippy::cognitive_complexity",  # Flag overly complex functions
  "-Wclippy::too_many_lines",        # Flag functions > 100 lines
  "-Wclippy::fn_params_excessive_bools", # Prevent boolean parameter soup
  "-Wclippy::implicit_clone",        # Prefer explicit .clone()

  # === ALLOW (Override pedantic) ===
  "-Aclippy::module_name_repetitions", # Allow ModuleName in module::ModuleName
  "-Aclippy::must_use_candidate",      # Too noisy for commands
]
```

Create `src-tauri/rustfmt.toml`:

```toml
edition = "2021"
max_width = 100
tab_spaces = 4
use_small_heuristics = "Default"
imports_granularity = "Module"
group_imports = "StdExternalCrate"
reorder_imports = true
reorder_modules = true
fn_single_line = false
where_single_line = false
```

### 1.4 Add Rust Lint Scripts

```json
// package.json - Add to scripts
{
  "scripts": {
    "rust:check": "cd src-tauri && cargo clippy --all-targets --all-features -- -D warnings",
    "rust:fmt": "cd src-tauri && cargo fmt",
    "rust:fmt:check": "cd src-tauri && cargo fmt --check",
    "check:all": "npm run check && npm run rust:check && npm run rust:fmt:check"
  }
}
```

### 1.5 Pre-commit Hooks (Husky + lint-staged)

```bash
# Install dependencies
npm install -D husky lint-staged
npx husky init
```

```json
// package.json - Add lint-staged config
{
  "lint-staged": {
    "src/**/*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "src-tauri/src/**/*.rs": [
      "cd src-tauri && cargo fmt --"
    ]
  }
}
```

```bash
# .husky/pre-commit
npm run lint-staged
cd src-tauri && cargo clippy --all-targets -- -D warnings
```

---

## 2. Missing Features Analysis

### 2.1 Critical Missing Features

| Feature | Status | Impact | Notes |
|---------|--------|--------|-------|
| **Custom Templates** | TODO in code | High | `projectStore.ts:418` - loading not implemented |
| **Template Wizard** | Empty folder | Medium | `TemplateWizard/` directory exists but empty |
| **Error Boundaries** | Missing | High | No React error boundaries for crash recovery |
| **Error UI Feedback** | Minimal | Medium | Errors only go to console, not shown to user |

### 2.2 Planned but Not Implemented

Based on template config and type definitions:

| Feature | Evidence | Priority |
|---------|----------|----------|
| **Pug/Markdown markup** | `markup: "html"` suggests more options planned | Low |
| **SCSS/Tailwind CSS** | `styling: "css"` suggests more options planned | Medium |
| **Vue.js framework** | `framework: "none" \| "react" \| "vue"` | Medium |
| **TypeScript standalone** | Type exists but no launcher template | Low |

### 2.3 UX Gaps

| Gap | Description | Severity |
|-----|-------------|----------|
| **No keyboard shortcut hints** | Command palette works but undiscoverable | Low |
| **No unsaved changes warning** | Can close window with unsaved work | High |
| **No project rename** | Must "Save As" to rename | Low |
| **No file tabs in compiled editor** | Single file only (vs web's multi-file) | Medium |
| **No output copy button** | Can't easily copy execution output | Low |
| **No clear output button** | Must re-run to clear | Low |

### 2.4 Technical Debt

| Issue | Location | Impact |
|-------|----------|--------|
| **Duplicated editor logic** | `CompiledEditor.tsx` / `WebEditor.tsx` share ~70% code | High |
| **Duplicated Rust executors** | `execution.rs` has 5 nearly-identical functions | Critical |
| **Magic strings** | `"editor-"`, `"codecell_"` scattered | Medium |
| **Inconsistent error handling** | Mix of `.unwrap()`, `.map_err()`, `?` | High |

---

## 3. Recommendations & Future Roadmap

### 3.1 Immediate Actions (Technical Health)

#### A. Extract Shared Editor Logic
```
Current:
  CompiledEditor.tsx (592 lines)
  WebEditor.tsx (503 lines)

Target:
  hooks/
    useEditorBase.ts       # Shared state, menu listeners, autosave
    useProjectLoader.ts    # Project loading from URL params
    useMenuEvents.ts       # Centralized menu event handling
  components/
    EditorLayout.tsx       # Shared header, status bar, structure
    EditorHeader.tsx       # Title bar with controls
    ExecutionPanel.tsx     # Output panel (extracted from CompiledEditor)
  CompiledEditor.tsx (~150 lines)
  WebEditor.tsx (~200 lines)
```

#### B. Refactor Rust Execution Module

Extract common execution logic:

```rust
// execution.rs - New structure
struct ExecutorConfig {
    language: Language,
    file_extension: &'static str,
    compile_command: Option<Vec<&'static str>>,
    run_command: Vec<&'static str>,
}

async fn execute_with_config(
    code: String,
    window_id: String,
    config: ExecutorConfig,
    app_handle: &AppHandle,
    running_processes: &State<RunningProcesses>,
) -> Result<ExecutionResult, String> {
    // Single implementation for all languages
}
```

This would reduce `execution.rs` from 670 lines to ~250 lines.

#### C. Add Error Boundaries

```tsx
// components/common/ErrorBoundary.tsx
export class ErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onRetry={...} />;
    }
    return this.props.children;
  }
}
```

### 3.2 Short-term Features (Next Release)

| Feature | Effort | Value | Priority |
|---------|--------|-------|----------|
| **Unsaved changes dialog** | Low | High | P0 |
| **Clear output button** | Low | Medium | P1 |
| **Copy output button** | Low | Medium | P1 |
| **Keyboard shortcut overlay** | Medium | Medium | P1 |
| **Custom template saving** | Medium | High | P1 |
| **Error toast notifications** | Medium | High | P1 |

### 3.3 Medium-term Features (Future Releases)

| Feature | Description | Complexity |
|---------|-------------|------------|
| **SCSS support** | Add node-sass/sass compilation for web projects | Medium |
| **Tailwind CSS** | JIT compilation for web projects | Medium |
| **Vue.js template** | Add Vue SFC support with Vite | Medium |
| **Multi-file compiled projects** | Allow multiple source files for Node/Python | High |
| **Snippets library** | Save and reuse code snippets | Medium |
| **Project search** | Search across recent projects | Medium |
| **Export to CodePen/JSFiddle** | Share web projects | Low |

### 3.4 Architecture Improvements

#### State Management Refactor
```
Current: projectStore.ts (433 lines, mixed concerns)

Target:
  stores/
    projectStore.ts        # Pure project state
    fileStore.ts           # File operations
    uiStore.ts             # UI state (dirty, loading, etc.)
  services/
    projectService.ts      # Tauri invoke wrappers
    templateService.ts     # Template loading/saving
```

#### Event System Refactor
```tsx
// hooks/useMenuEventDispatcher.ts
const MENU_EVENTS = {
  'menu:save': handleSave,
  'menu:save-as': handleSaveAs,
  'menu:open': handleOpen,
  // ...
} as const;

export function useMenuEventDispatcher(handlers: Partial<typeof MENU_EVENTS>) {
  useEffect(() => {
    const unlisten = Object.entries(handlers).map(([event, handler]) =>
      listen(event, handler)
    );
    return () => unlisten.forEach(u => u.then(fn => fn()));
  }, [handlers]);
}
```

### 3.5 Keeping the App "Cool" - Design Philosophy

1. **Stay Lightweight**: Don't become VS Code. Focus on quick experiments.
   - Single-file or minimal-file projects
   - Instant startup
   - No workspace concept needed

2. **Delight in Details**:
   - Smooth animations (already good!)
   - Catppuccin theme is distinctive
   - Consider: sound effects for run/success/error?
   - Consider: confetti on first successful run?

3. **Developer Experience**:
   - Add `/docs` keyboard shortcut to open language docs
   - Add "Share as Gist" feature
   - Add code formatting (prettier/rustfmt) button

4. **Community Features** (Long-term):
   - Public template gallery
   - "Explore" tab with community snippets
   - One-click "try this code" links

### 3.6 Recommended Project Structure Evolution

```
codecell/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── CodeEditor/
│   │   │   ├── Modal/
│   │   │   ├── ErrorBoundary/
│   │   │   └── Toast/              # NEW
│   │   ├── editors/
│   │   │   ├── shared/             # NEW - Extracted logic
│   │   │   │   ├── EditorLayout.tsx
│   │   │   │   ├── EditorHeader.tsx
│   │   │   │   └── ExecutionPanel.tsx
│   │   │   ├── WebEditor/
│   │   │   └── CompiledEditor/
│   │   ├── Launcher/
│   │   ├── Settings/
│   │   └── TemplateWizard/         # Implement this
│   ├── hooks/                      # NEW
│   │   ├── useEditorBase.ts
│   │   ├── useProjectLoader.ts
│   │   ├── useMenuEvents.ts
│   │   └── useAutosave.ts
│   ├── services/                   # NEW
│   │   ├── projectService.ts
│   │   └── templateService.ts
│   ├── stores/
│   └── types/
├── src-tauri/
│   ├── src/
│   │   ├── commands/
│   │   │   ├── execution/          # Split into module
│   │   │   │   ├── mod.rs
│   │   │   │   ├── executor.rs     # Generic executor
│   │   │   │   └── languages.rs    # Language configs
│   │   │   ├── project.rs
│   │   │   └── window.rs
│   │   └── services/
│   └── Cargo.toml
└── package.json
```

---

## 4. Priority Matrix

```
                    HIGH VALUE
                        │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
    │  P0: DO NOW       │  P1: NEXT SPRINT  │
    │  ─────────────    │  ──────────────   │
    │  • Lint rules     │  • Custom templates│
    │  • Error boundary │  • SCSS support   │
    │  • Unsaved dialog │  • Copy output    │
    │  • Rust dedup     │  • Error toasts   │
LOW │                   │                   │ HIGH
EFFORT──────────────────┼───────────────────EFFORT
    │                   │                   │
    │  P2: NICE TO HAVE │  P3: LATER        │
    │  ───────────────  │  ─────────────    │
    │  • Clear output   │  • Vue support    │
    │  • Shortcuts help │  • Multi-file     │
    │  • Project rename │  • Gist sharing   │
    │                   │  • Template gallery│
    │                   │                   │
    └───────────────────┼───────────────────┘
                        │
                    LOW VALUE
```

---

## 5. Conclusion

CodeCell has a solid foundation with:
- Clean React architecture
- Good TypeScript configuration
- Well-organized Tauri backend
- Distinctive UI design

The main areas for improvement are:
1. **Code deduplication** (both editors + Rust executors)
2. **Lint rule enforcement** (prevent future complexity)
3. **Error handling consistency** (especially Rust)
4. **Feature completion** (custom templates, unsaved warning)

Following this plan will keep the codebase maintainable while adding valuable features.
