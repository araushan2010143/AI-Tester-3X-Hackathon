"use client";

import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import { Skeleton } from "@/components/ui/skeleton";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  readOnly?: boolean;
  height?: string;
  ariaLabel?: string;
}

const EDITOR_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 13,
  lineNumbers: "on" as const,
  scrollBeyondLastLine: false,
  wordWrap: "on" as const,
  automaticLayout: true,
  padding: { top: 12, bottom: 12 },
  renderLineHighlight: "none" as const,
};

export function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  height = "260px",
  ariaLabel,
}: CodeEditorProps) {
  const handleMount: OnMount = (editor) => {
    if (ariaLabel) {
      editor.getDomNode()?.setAttribute("aria-label", ariaLabel);
    }
  };

  // Monaco's built-in "vs-dark" is a hardcoded #1e1e1e, unrelated to the app's navy tokens —
  // define a theme that matches so the editor reads as recessed below its card, not a
  // mismatched gray box sitting on top of it.
  const handleBeforeMount: BeforeMount = (monaco) => {
    monaco.editor.defineTheme("tracefix-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#0b1220",
        "editor.foreground": "#e5eef9",
        "editorLineNumber.foreground": "#475569",
        "editorLineNumber.activeForeground": "#94a3b8",
        "editorCursor.foreground": "#4f8cff",
        "editor.selectionBackground": "#4f8cff33",
        "editor.inactiveSelectionBackground": "#4f8cff22",
      },
    });
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Editor
        height={height}
        language={language}
        theme="tracefix-dark"
        value={value}
        onChange={(v) => onChange(v ?? "")}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        options={{ ...EDITOR_OPTIONS, readOnly }}
        loading={<Skeleton className="h-full w-full" />}
      />
    </div>
  );
}
