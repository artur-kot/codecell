import { useEffect, useRef, useCallback } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { syntaxHighlighting, bracketMatching, HighlightStyle } from "@codemirror/language";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { java } from "@codemirror/lang-java";
import { tags } from "@lezer/highlight";
import { useSettingsStore } from "@/stores/settingsStore";

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

// Compartments for dynamic switching
const themeCompartment = new Compartment();
const editorStyleCompartment = new Compartment();

// Create dynamic editor styles based on settings
function createEditorStyles(fontFamily: string, fontSize: number) {
  return EditorView.theme({
    "&": {
      fontSize: `${fontSize}px`,
    },
    ".cm-content": {
      fontFamily: `"${fontFamily}", var(--font-mono)`,
      fontSize: `${fontSize}px`,
    },
    ".cm-scroller": {
      fontFamily: `"${fontFamily}", var(--font-mono)`,
      lineHeight: "1.6",
    },
    ".cm-gutters": {
      fontSize: `${fontSize}px`,
    },
    ".cm-lineNumbers .cm-gutterElement": {
      fontSize: `${fontSize}px`,
    },
  });
}

// Catppuccin Latte (light) syntax highlighting
const catppuccinLatteHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#8839ef" },
  { tag: tags.comment, color: "#9ca0b0", fontStyle: "italic" },
  { tag: tags.string, color: "#40a02b" },
  { tag: tags.number, color: "#fe640b" },
  { tag: tags.bool, color: "#fe640b" },
  { tag: tags.null, color: "#fe640b" },
  { tag: tags.className, color: "#df8e1d" },
  { tag: tags.function(tags.variableName), color: "#1e66f5" },
  { tag: tags.propertyName, color: "#1e66f5" },
  { tag: tags.operator, color: "#04a5e5" },
  { tag: tags.punctuation, color: "#6c6f85" },
  { tag: tags.typeName, color: "#df8e1d" },
  { tag: tags.tagName, color: "#d20f39" },
  { tag: tags.attributeName, color: "#df8e1d" },
  { tag: tags.attributeValue, color: "#40a02b" },
  { tag: tags.variableName, color: "#4c4f69" },
  { tag: tags.definition(tags.variableName), color: "#1e66f5" },
  { tag: tags.self, color: "#d20f39" },
]);

// Catppuccin Mocha (dark) syntax highlighting
const catppuccinMochaHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#cba6f7" },
  { tag: tags.comment, color: "#6c7086", fontStyle: "italic" },
  { tag: tags.string, color: "#a6e3a1" },
  { tag: tags.number, color: "#fab387" },
  { tag: tags.bool, color: "#fab387" },
  { tag: tags.null, color: "#fab387" },
  { tag: tags.className, color: "#f9e2af" },
  { tag: tags.function(tags.variableName), color: "#89b4fa" },
  { tag: tags.propertyName, color: "#89b4fa" },
  { tag: tags.operator, color: "#89dceb" },
  { tag: tags.punctuation, color: "#a6adc8" },
  { tag: tags.typeName, color: "#f9e2af" },
  { tag: tags.tagName, color: "#f38ba8" },
  { tag: tags.attributeName, color: "#f9e2af" },
  { tag: tags.attributeValue, color: "#a6e3a1" },
  { tag: tags.variableName, color: "#cdd6f4" },
  { tag: tags.definition(tags.variableName), color: "#89b4fa" },
  { tag: tags.self, color: "#f38ba8" },
]);

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

// Get syntax highlighting based on theme
function getSyntaxHighlighting(isDark: boolean) {
  return syntaxHighlighting(isDark ? catppuccinMochaHighlight : catppuccinLatteHighlight);
}

export function CodeEditor({ value, language, onChange, readOnly = false }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const resolvedTheme = useSettingsStore((state) => state.resolvedTheme);
  const editorSettings = useSettingsStore((state) => state.editorSettings);

  // Keep onChange ref updated (in effect to avoid updating during render)
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

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

    const isDark = resolvedTheme === "dark";
    const { fontFamily, fontSize } = editorSettings;

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
        editorStyleCompartment.of(createEditorStyles(fontFamily, fontSize)),
        themeCompartment.of(getSyntaxHighlighting(isDark)),
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
  }, [language, readOnly, getLanguageExtension, resolvedTheme, editorSettings]);

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

  return <div ref={containerRef} className="h-full w-full overflow-hidden" />;
}
