"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { DiagnosisFix, Framework } from "@/lib/types";

interface BeforeAfterDiffProps {
  fix: DiagnosisFix;
  framework: Framework;
}

function CodeBlock({
  label,
  code,
  variant,
}: {
  label: string;
  code: string;
  variant: "before" | "after";
}) {
  const accent =
    variant === "before"
      ? "border-red-500/30 bg-red-500/5"
      : "border-emerald-500/30 bg-emerald-500/5";

  return (
    <div className={`overflow-hidden rounded-lg border ${accent}`}>
      <div className="border-b border-inherit px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed whitespace-pre-wrap break-words">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

export function BeforeAfterDiff({ fix, framework }: BeforeAfterDiffProps) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fix.after);
      toast.success("Fix copied to clipboard");
    } catch {
      toast.error("Couldn't copy — copy it manually below");
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <CodeBlock label="Before" code={fix.before} variant="before" />
        <CodeBlock label="After" code={fix.after} variant="after" />
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{fix.explanation}</p>
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" onClick={handleCopy}>
          <Copy className="h-3.5 w-3.5" />
          Copy Fix
        </Button>
      </div>
      <p className="sr-only">Framework: {framework}</p>
    </div>
  );
}
