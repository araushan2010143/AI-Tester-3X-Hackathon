"use client";

import Editor, { type OnMount } from "@monaco-editor/react";
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

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Editor
        height={height}
        language={language}
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v ?? "")}
        onMount={handleMount}
        options={{ ...EDITOR_OPTIONS, readOnly }}
        loading={<Skeleton className="h-full w-full" />}
      />
    </div>
  );
}
