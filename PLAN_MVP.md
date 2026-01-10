# CodeCell - Plan Implementacji MVP

## Przegląd Projektu

**CodeCell** to desktopowa aplikacja będąca notatnikiem i snippet runnerem dla programistów. Umożliwia tworzenie notatek w formie bloków (podobnie do Notion) z możliwością uruchamiania kodu lokalnie.

---

## Stack Technologiczny

| Warstwa | Technologia |
|---------|-------------|
| Desktop Framework | Tauri 2.x (Rust + Web) |
| Frontend | React 18 + TypeScript |
| Edytor blokowy | TipTap (ProseMirror) |
| Storage | Pliki (Markdown/JSON) + SQLite (indeks) |
| Code Executor | Natywne runtime'y (Node.js, Python, Java) |
| Styling | Tailwind CSS |
| State Management | Zustand |

---

## Architektura Aplikacji

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Editor    │  │  Sidebar    │  │  Output Panel   │  │
│  │  (TipTap)   │  │ (Explorer)  │  │  (Results)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ Tauri IPC
┌────────────────────────┴────────────────────────────────┐
│                   Backend (Rust)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │    File     │  │   SQLite    │  │  Code Executor  │  │
│  │   Manager   │  │   Index     │  │    Service      │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Struktura Plików Projektu

```
codecell/
├── src/                      # Frontend (React)
│   ├── components/
│   │   ├── Editor/           # Edytor TipTap
│   │   │   ├── Editor.tsx
│   │   │   ├── extensions/   # Custom TipTap extensions
│   │   │   │   ├── CodeBlock.tsx
│   │   │   │   └── ...
│   │   │   └── blocks/       # Komponenty bloków
│   │   ├── Sidebar/          # Panel boczny
│   │   │   ├── FileTree.tsx
│   │   │   ├── TagList.tsx
│   │   │   └── Search.tsx
│   │   ├── OutputPanel/      # Panel wyników
│   │   └── Layout/           # Layout aplikacji
│   ├── stores/               # Zustand stores
│   │   ├── notesStore.ts
│   │   ├── editorStore.ts
│   │   └── settingsStore.ts
│   ├── hooks/                # Custom hooks
│   ├── services/             # Komunikacja z Tauri
│   │   ├── fileService.ts
│   │   ├── executorService.ts
│   │   └── searchService.ts
│   ├── types/                # TypeScript types
│   └── utils/                # Utility functions
├── src-tauri/                # Backend (Rust)
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/         # Tauri commands
│   │   │   ├── files.rs
│   │   │   ├── executor.rs
│   │   │   └── search.rs
│   │   ├── services/
│   │   │   ├── file_manager.rs
│   │   │   ├── sqlite_index.rs
│   │   │   ├── code_executor.rs
│   │   │   └── template_engine.rs
│   │   └── models/
│   └── Cargo.toml
├── templates/                # Szablony snippetów
│   ├── python/
│   ├── javascript/
│   ├── typescript/
│   └── java/
└── data/                     # Dane użytkownika (gitignore)
    ├── notes/                # Pliki notatek
    └── codecell.db           # SQLite index
```

---

## Format Danych Notatki

Każda notatka to plik JSON z następującą strukturą:

```json
{
  "id": "uuid-v4",
  "title": "Nazwa notatki",
  "createdAt": "2024-01-09T12:00:00Z",
  "updatedAt": "2024-01-09T12:00:00Z",
  "tags": ["python", "algorytmy"],
  "blocks": [
    {
      "id": "block-uuid",
      "type": "heading",
      "content": "Nagłówek",
      "level": 1
    },
    {
      "id": "block-uuid",
      "type": "paragraph",
      "content": "Tekst akapitu..."
    },
    {
      "id": "block-uuid",
      "type": "code",
      "language": "python",
      "content": "print('Hello World')",
      "lastOutput": {
        "stdout": "Hello World\n",
        "stderr": "",
        "exitCode": 0,
        "executedAt": "2024-01-09T12:00:00Z"
      }
    }
  ]
}
```

---

## Fazy Implementacji

### Faza 1: Fundament (Tydzień 1-2)

#### 1.1 Inicjalizacja projektu
- [ ] Utworzenie projektu Tauri z React + TypeScript
- [ ] Konfiguracja Tailwind CSS
- [ ] Konfiguracja ESLint + Prettier
- [ ] Struktura folderów

#### 1.2 Podstawowy layout
- [ ] Komponent Layout (sidebar + main area + output panel)
- [ ] Responsywny design z resizable panels
- [ ] Dark/Light theme support

#### 1.3 File Manager (Rust)
- [ ] CRUD operacje na plikach notatek
- [ ] Obsługa struktury folderów
- [ ] Tauri commands dla operacji plikowych

---

### Faza 2: Edytor Blokowy (Tydzień 3-4)

#### 2.1 Integracja TipTap
- [ ] Podstawowa konfiguracja TipTap
- [ ] Blok: Paragraph
- [ ] Blok: Heading (H1-H3)
- [ ] Blok: Bullet List
- [ ] Blok: Numbered List
- [ ] Blok: Blockquote

#### 2.2 Custom Code Block
- [ ] Rozszerzenie TipTap dla bloków kodu
- [ ] Syntax highlighting (Prism.js lub Shiki)
- [ ] Selector języka programowania
- [ ] Przycisk "Run" dla bloku
- [ ] Panel output pod blokiem kodu

#### 2.3 Block Operations
- [ ] Drag & drop bloków
- [ ] Slash commands (/)
- [ ] Konwersja między typami bloków

---

### Faza 3: Code Executor (Tydzień 5-6)

#### 3.1 Executor Service (Rust)
- [ ] Bazowa architektura executora
- [ ] Wykrywanie zainstalowanych runtime'ów
- [ ] Timeout handling
- [ ] Proces isolation

#### 3.2 Implementacja języków
- [ ] Python executor
- [ ] JavaScript (Node.js) executor
- [ ] TypeScript executor (ts-node lub kompilacja)
- [ ] Java executor (kompilacja + uruchomienie)

#### 3.3 Output handling
- [ ] Streaming stdout/stderr do UI
- [ ] Formatowanie output (ANSI colors)
- [ ] Historia wykonań

---

### Faza 4: System Szablonów (Tydzień 7)

#### 4.1 Template Engine
- [ ] Format szablonów (YAML/JSON)
- [ ] Parsowanie szablonów
- [ ] Zmienne w szablonach

#### 4.2 Wbudowane szablony
- [ ] Python: basic, with imports, class, function
- [ ] JavaScript: basic, async, module
- [ ] TypeScript: basic, interface, class
- [ ] Java: basic class, main method

#### 4.3 UI dla szablonów
- [ ] Modal wyboru szablonu
- [ ] Podgląd szablonu
- [ ] Edycja zmiennych szablonu

---

### Faza 5: Organizacja i Wyszukiwanie (Tydzień 8-9)

#### 5.1 SQLite Index
- [ ] Schema bazy danych
- [ ] Indeksowanie notatek przy zapisie
- [ ] Full-text search

#### 5.2 Sidebar - File Explorer
- [ ] Drzewo folderów
- [ ] Tworzenie/usuwanie/rename folderów
- [ ] Przenoszenie notatek między folderami

#### 5.3 System tagów
- [ ] Dodawanie tagów do notatek
- [ ] Filtrowanie po tagach
- [ ] Autouzupełnianie tagów

#### 5.4 Wyszukiwarka
- [ ] Wyszukiwanie po tytule
- [ ] Wyszukiwanie w treści
- [ ] Wyszukiwanie po tagach
- [ ] Kombinowane filtry

---

### Faza 6: Polish & UX (Tydzień 10)

#### 6.1 Keyboard shortcuts
- [ ] Globalne skróty (Ctrl+N, Ctrl+S, etc.)
- [ ] Skróty w edytorze
- [ ] Ctrl+Enter do uruchomienia kodu

#### 6.2 Settings
- [ ] Konfiguracja ścieżek runtime'ów
- [ ] Theme selection
- [ ] Font size/family
- [ ] Default language

#### 6.3 Quality of Life
- [ ] Auto-save
- [ ] Undo/Redo
- [ ] Recent notes
- [ ] Splash screen / empty state

---

## Schema Bazy SQLite (Index)

```sql
-- Notatki (cache/index)
CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    folder_path TEXT,
    file_path TEXT NOT NULL,
    created_at DATETIME,
    updated_at DATETIME,
    content_preview TEXT
);

-- Tagi
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

-- Relacja notatki-tagi
CREATE TABLE note_tags (
    note_id TEXT REFERENCES notes(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

-- Full-text search
CREATE VIRTUAL TABLE notes_fts USING fts5(
    title,
    content,
    content='notes',
    content_rowid='rowid'
);
```

---

## Konfiguracja Języków (Extensibility)

Plik `languages.json` dla przyszłej rozszerzalności:

```json
{
  "languages": [
    {
      "id": "python",
      "name": "Python",
      "extension": ".py",
      "runtime": "python3",
      "runCommand": "{runtime} {file}",
      "icon": "python-icon",
      "templates": ["basic", "with-imports", "class"]
    },
    {
      "id": "javascript",
      "name": "JavaScript",
      "extension": ".js",
      "runtime": "node",
      "runCommand": "{runtime} {file}",
      "icon": "js-icon",
      "templates": ["basic", "async", "module"]
    },
    {
      "id": "typescript",
      "name": "TypeScript",
      "extension": ".ts",
      "runtime": "npx ts-node",
      "runCommand": "{runtime} {file}",
      "icon": "ts-icon",
      "templates": ["basic", "interface", "class"]
    },
    {
      "id": "java",
      "name": "Java",
      "extension": ".java",
      "runtime": "java",
      "compileCommand": "javac {file}",
      "runCommand": "{runtime} {className}",
      "icon": "java-icon",
      "templates": ["basic", "main-class"]
    }
  ]
}
```

---

## Wymagania Systemowe

- **OS:** Windows 10+, macOS 10.15+, Linux (Ubuntu 20.04+)
- **Runtime'y (opcjonalne, dla uruchamiania kodu):**
  - Node.js 18+ (dla JS/TS)
  - Python 3.8+
  - Java JDK 11+

---

## Metryki Sukcesu MVP

- [ ] Można tworzyć, edytować i usuwać notatki
- [ ] Edytor obsługuje minimum 5 typów bloków
- [ ] Kod można uruchomić w 4 językach (Python, JS, TS, Java)
- [ ] Wyniki wykonania wyświetlają się w UI
- [ ] Notatki można organizować w foldery
- [ ] Działa wyszukiwanie i filtrowanie po tagach
- [ ] Aplikacja działa na Windows, macOS i Linux

---

## Przyszłe Rozszerzenia (Po MVP)

- Git integration (automatyczny backup)
- Więcej języków (Go, Rust, C++, SQL)
- Docker execution mode
- Export do Markdown/PDF
- Snippets sharing
- Plugin system
- AI integration (code completion, explanation)
