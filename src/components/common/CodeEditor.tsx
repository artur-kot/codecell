import { useEffect, useRef, useCallback } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from "@codemirror/language";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { java } from "@codemirror/lang-java";
import { oneDark } from "@codemirror/theme-one-dark";

interface CodeEditorProps {
  value: string;
  language: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

const languageExtensions: Record<string, () => ReturnType<typeof html>> = {
  html: html,
  css: css,
  javascript: () => javascript({ jsx: true, typescript: false }),
  typescript: () => javascript({ jsx: true, typescript: true }),
  python: python,
  rust: rust,
  java: java,
};

// Custom Catppuccin-inspired theme
const catppuccinTheme = EditorView.theme({
  "&": {
    backgroundColor: "var(--color-base)",
    color: "var(--color-text)",
    fontSize: "13px",
    height: "100%",
  },
  ".cm-content": {
    fontFamily: "var(--font-mono)",
    padding: "12px 0",
    caretColor: "var(--color-accent)",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--color-accent)",
    borderLeftWidth: "2px",
  },
  ".cm-gutters": {
    backgroundColor: "var(--color-mantle)",
    color: "var(--color-text-subtle)",
    border: "none",
    borderRight: "1px solid var(--color-border)",
  },
  ".cm-gutter-lint": {
    width: "0.6em",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 12px 0 16px",
    minWidth: "3em",
  },
  ".cm-activeLine": {
    backgroundColor: "var(--color-surface-0)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--color-surface-0)",
    color: "var(--color-text-muted)",
  },
  ".cm-selectionBackground": {
    backgroundColor: "var(--color-accent-glow) !important",
  },
  "&.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--color-accent-glow) !important",
  },
  ".cm-matchingBracket": {
    backgroundColor: "var(--color-accent-glow)",
    outline: "1px solid var(--color-accent)",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "var(--font-mono)",
    lineHeight: "1.6",
  },
  ".cm-line": {
    padding: "0 16px",
  },
});

// Catppuccin syntax highlighting
const catppuccinHighlight = syntaxHighlighting(defaultHighlightStyle);

export function CodeEditor({ value, language, onChange, readOnly = false }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  // Keep onChange ref updated
  onChangeRef.current = onChange;

  const getLanguageExtension = useCallback(() => {
    const langFn = languageExtensions[language];
    return langFn ? langFn() : javascript();
  }, [language]);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && onChangeRef.current) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        bracketMatching(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        getLanguageExtension(),
        catppuccinTheme,
        catppuccinHighlight,
        oneDark,
        updateListener,
        EditorView.lineWrapping,
        EditorState.readOnly.of(readOnly),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language, readOnly, getLanguageExtension]);

  // Update content when value prop changes externally
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentValue = view.state.doc.toString();
    if (currentValue !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: value,
        },
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden"
    />
  );
}
