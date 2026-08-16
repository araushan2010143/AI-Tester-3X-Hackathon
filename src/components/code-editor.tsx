"use client";

import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/skeleton";
import { useHydrated } from "@/lib/use-hydrated";

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
  // `resolvedTheme` is unknown during SSR — default to dark (matches layout.tsx's
  // defaultTheme="dark") until hydrated, then track the real theme afterward.
  const { resolvedTheme } = useTheme();
  const mounted = useHydrated();
  const isLight = mounted && resolvedTheme === "light";

  const handleMount: OnMount = (editor) => {
    if (ariaLabel) {
      editor.getDomNode()?.setAttribute("aria-label", ariaLabel);
    }
  };

  // Monaco's built-in themes ("vs-dark"/"vs") are hardcoded, unrelated to the app's tokens —
  // define both so the editor always reads as recessed below its card (background matches
  // --background in each theme), not a mismatched box sitting on top of it.
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
    monaco.editor.defineTheme("tracefix-light", {
      base: "vs",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#f7f9fc",
        "editor.foreground": "#101828",
        "editorLineNumber.foreground": "#94a3b8",
        "editorLineNumber.activeForeground": "#5b6472",
        "editorCursor.foreground": "#4f8cff",
        "editor.selectionBackground": "#4f8cff26",
        "editor.inactiveSelectionBackground": "#4f8cff18",
      },
    });
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Editor
        height={height}
        language={language}
        theme={isLight ? "tracefix-light" : "tracefix-dark"}
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
