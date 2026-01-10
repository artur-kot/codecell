# CodeCell v2 - Plan Implementacji

## Zmiana Koncepcji

**Z:** Notion-like notebook z blokami kodu
**Na:** CodePen/CodeSandbox-like playground z wieloma oknami

---

## Architektura Aplikacji

```
┌─────────────────────────────────────────────────────────────┐
│                    MAIN WINDOW (Launcher)                    │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Logo + "CodeCell"                                      ││
│  ├─────────────────────────────────────────────────────────┤│
│  │  [+ Nowy Projekt]              Quick Templates:         ││
│  │                                 • HTML/CSS/JS           ││
│  │  Ostatnie projekty:            • React + TS + Vite     ││
│  │  ├─ projekt1.cc (2 min ago)    • Node.js               ││
│  │  ├─ projekt2.cc (1h ago)       • Python                ││
│  │  └─ projekt3.cc (wczoraj)                              ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              EDITOR WINDOW (Web Template)                    │
│  ┌──────────┬──────────────────────────────────────────────┐│
│  │ [HTML]   │                                              ││
│  │ [CSS]    │              LIVE PREVIEW                    ││
│  │ [JS]     │           (iframe sandbox)                   ││
│  │          │                                              ││
│  │  Editor  │                                              ││
│  │  Monaco/ │                                              ││
│  │  CodeMir │                                              ││
│  └──────────┴──────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│            EDITOR WINDOW (Compiled Language)                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                                                         ││
│  │                    CODE EDITOR                          ││
│  │                                                         ││
│  ├─────────────────────────────────────────────────────────┤│
│  │  Output    │ [▶ Run] [Stop]                             ││
│  │  $ ./main                                               ││
│  │  Hello, World!                                          ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## System Szablonów

### Quick Templates (Menu + Launcher)
Zapisane kombinacje dla szybkiego dostępu:
- HTML/CSS/JS
- React + TypeScript + Vite
- Node.js
- Python
- Rust
- Java

### Template Wizard (Modal)
Konfigurowalny kreator dla web templates:

```
┌─────────────────────────────────────────────┐
│  Nowy Projekt Web                           │
├─────────────────────────────────────────────┤
│  Markup:     ○ HTML  ○ Pug  ○ Markdown     │
│  Styling:    ○ CSS   ○ SCSS ○ Tailwind     │
│  Script:     ○ JS    ○ TypeScript          │
│  Framework:  ○ None  ○ React  ○ Vue        │
│                                             │
│  [Zapisz jako Quick Template]               │
│                                             │
│        [Anuluj]        [Utwórz]            │
└─────────────────────────────────────────────┘
```

---

## Struktura Plików Projektu

```
~/.codecell/
├── config.json              # Ustawienia aplikacji
├── quick-templates.json     # Zapisane szybkie szablony
├── recent.json              # Ostatnie projekty
└── temp/                    # Tymczasowe projekty
    └── {uuid}/
        ├── meta.json        # Metadata projektu
        ├── index.html       # (web)
        ├── style.css        # (web)
        ├── script.js        # (web)
        └── main.rs          # (rust) / main.py (python) etc.
```

### Format meta.json
```json
{
  "id": "uuid",
  "name": "Untitled",
  "template": "web-html-css-js",
  "createdAt": "2024-01-09T12:00:00Z",
  "updatedAt": "2024-01-09T12:00:00Z",
  "files": ["index.html", "style.css", "script.js"],
  "savedPath": null
}
```

---

## Natywne Menu (Tauri)

```
File
├── New Project          Ctrl+N  → Template Wizard
├── New from Template    →       → Submenu z Quick Templates
├── Open...              Ctrl+O
├── Open Recent          →       → Lista ostatnich
├── ─────────────────
├── Save                 Ctrl+S
├── Save As...           Ctrl+Shift+S
├── ─────────────────
└── Exit

Edit
├── Undo                 Ctrl+Z
├── Redo                 Ctrl+Y
├── ─────────────────
├── Cut                  Ctrl+X
├── Copy                 Ctrl+C
└── Paste                Ctrl+V

View
├── Toggle Preview       Ctrl+P   (tylko web)
├── Toggle Output        Ctrl+`   (tylko compiled)
└── Zoom                 →

Run
├── Run Code             Ctrl+Enter / F5
└── Stop                 Ctrl+C

Help
├── Documentation
├── Report Issue
└── About CodeCell
```

---

## Fazy Implementacji

### Faza 1: Refaktor Architektury
- [ ] Usunięcie starego kodu (TipTap, bloki, notatnik)
- [ ] Konfiguracja multi-window w Tauri
- [ ] System szablonów (config + typy)
- [ ] Natywne menu systemowe

### Faza 2: Launcher Window
- [ ] UI Launchera (lista ostatnich + quick templates)
- [ ] Quick Templates management
- [ ] Otwieranie/tworzenie projektów
- [ ] Recent projects tracking

### Faza 3: Editor Window - Web
- [ ] Layout: Zakładki + Preview
- [ ] Integracja Monaco Editor / CodeMirror
- [ ] Live preview z iframe sandbox
- [ ] Debounced auto-refresh (500ms)
- [ ] Obsługa HTML/CSS/JS
- [ ] Obsługa preprocessorów (SCSS, TypeScript)

### Faza 4: Editor Window - Compiled
- [ ] Layout: Editor + Output panel
- [ ] Code execution dla Python
- [ ] Code execution dla Node.js
- [ ] Code execution dla Rust (kompilacja + run)
- [ ] Code execution dla Java

### Faza 5: Template Wizard
- [ ] UI Wizarda
- [ ] Wybór opcji dla web templates
- [ ] Zapisywanie jako Quick Template
- [ ] Generowanie plików projektu

### Faza 6: File Management
- [ ] Save / Save As
- [ ] Temp files cleanup
- [ ] Export projektu
- [ ] Import projektu

### Faza 7: Polish
- [ ] Keyboard shortcuts
- [ ] Themes (dark/light)
- [ ] Settings window
- [ ] Error handling & UX

---

## Stack Technologiczny

| Warstwa | Technologia |
|---------|-------------|
| Desktop Framework | Tauri 2.x |
| Frontend | React 18 + TypeScript |
| Code Editor | CodeMirror 6 |
| Bundler (web frameworks) | esbuild-wasm |
| Styling | Tailwind CSS v4 |
| State Management | Zustand |
| Web Preview | iframe z srcdoc |
| Code Execution | Tauri Shell plugin |

### Decyzje MVP
- **Preprocessory:** Nie w MVP (tylko HTML/CSS/JS)
- **Frameworki:** React/Vue przez esbuild-wasm bundling

---

## Typy Szablonów

```typescript
type TemplateType =
  | "web"           // HTML/CSS/JS + warianty
  | "node"          // Node.js
  | "python"        // Python
  | "rust"          // Rust
  | "java"          // Java
  | "typescript";   // TypeScript standalone

interface WebTemplateConfig {
  markup: "html" | "pug" | "markdown";
  styling: "css" | "scss" | "tailwind";
  script: "javascript" | "typescript";
  framework: "none" | "react" | "vue" | "svelte";
}

interface QuickTemplate {
  id: string;
  name: string;
  type: TemplateType;
  config?: WebTemplateConfig;
  icon?: string;
  isBuiltIn: boolean;
}
```

---

## Pytania do Rozstrzygnięcia

1. **Monaco vs CodeMirror** - Monaco jest cięższy ale ma lepsze features (autocomplete, intellisense). CodeMirror jest lżejszy. Propozycja: Monaco.

2. **Preprocessory w MVP?** - SCSS, TypeScript, Pug wymagają kompilacji w przeglądarce. Propozycja: MVP bez preprocessorów, dodanie później.

3. **React/Vue w web template** - Wymaga bundlera. Propozycja: Prosty setup z ESM imports dla MVP, pełny bundler później.

---

## Metryki Sukcesu MVP

- [ ] Launcher window z listą ostatnich i quick templates
- [ ] Tworzenie nowego projektu z szablonu
- [ ] Web template: HTML/CSS/JS z live preview
- [ ] Compiled template: Python/Node.js z wykonaniem kodu
- [ ] Save As do wybranej lokalizacji
- [ ] Natywne menu systemowe działające
