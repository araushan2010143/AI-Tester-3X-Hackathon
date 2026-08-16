"use client";

import { useState } from "react";
import { Sparkles, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CodeEditor } from "@/components/code-editor";
import { FrameworkSelector } from "@/components/framework-selector";
import { DiagnosisPanel } from "@/components/diagnosis-panel";
import { EmptyState } from "@/components/empty-state";
import { HistoryPanel } from "@/components/history-panel";
import { addHistoryEntry } from "@/lib/history";
import { DEMOS } from "@/lib/demo-data";
import { FRAMEWORK_LABELS, type DiagnoseRequest, type DiagnosisResult, type Framework, type HistoryEntry } from "@/lib/types";

const MONACO_LANGUAGE: Record<Framework, string> = {
  "playwright-ts": "typescript",
  "selenium-java": "java",
};

export default function Home() {
  const [framework, setFramework] = useState<Framework>("playwright-ts");
  const [testCode, setTestCode] = useState("");
  const [ciLog, setCiLog] = useState("");
  const [domSnippet, setDomSnippet] = useState("");
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const canDiagnose = testCode.trim().length > 0 && ciLog.trim().length > 0 && !loading;

  async function handleDiagnose() {
    if (!canDiagnose) {
      toast.error("Paste the failed test code and CI log first.");
      return;
    }

    setLoading(true);
    setResult(null);

    const request: DiagnoseRequest = {
      testCode,
      ciLog,
      domSnippet: domSnippet.trim() || undefined,
      framework,
    };

    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Diagnosis failed.");
        return;
      }

      setResult(data as DiagnosisResult);
      addHistoryEntry(request, data as DiagnosisResult);
    } catch {
      toast.error("Couldn't reach the diagnose API. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleLoadDemo() {
    const demo = DEMOS[framework];
    setTestCode(demo.request.testCode);
    setCiLog(demo.request.ciLog);
    setDomSnippet(demo.request.domSnippet ?? "");
    setResult(demo.result);
    toast.success("Demo example loaded — no API key needed to view this result.");
  }

  function handleFrameworkChange(next: Framework) {
    if (next === framework) return;

    const hasContent = testCode.trim() || ciLog.trim() || domSnippet.trim() || result;
    setFramework(next);
    if (hasContent) {
      setTestCode("");
      setCiLog("");
      setDomSnippet("");
      setResult(null);
      toast.info(`Switched to ${FRAMEWORK_LABELS[next]} — cleared the previous example so code doesn't get mixed up.`);
    }
  }

  function handleSelectHistory(entry: HistoryEntry) {
    setFramework(entry.request.framework);
    setTestCode(entry.request.testCode);
    setCiLog(entry.request.ciLog);
    setDomSnippet(entry.request.domSnippet ?? "");
    setResult(entry.result);
  }

  function handleAnalyzeAgain() {
    setResult(null);
    setTestCode("");
    setCiLog("");
    setDomSnippet("");
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl">
            🩺
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">TraceFix AI</h1>
            <p className="text-sm text-muted-foreground">
              From CI failure to production-ready fix in seconds
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleLoadDemo}>
            <Sparkles className="h-4 w-4" />
            Load Demo
          </Button>
          <HistoryPanel onSelect={handleSelectHistory} />
        </div>
      </header>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm font-medium">Test Framework</label>
            <FrameworkSelector value={framework} onChange={handleFrameworkChange} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Failed Test Code</label>
              <CodeEditor
                value={testCode}
                onChange={setTestCode}
                language={MONACO_LANGUAGE[framework]}
                ariaLabel="Failed test code"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">CI/CD Error Log</label>
              <CodeEditor
                value={ciLog}
                onChange={setCiLog}
                language="plaintext"
                ariaLabel="CI/CD error log"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">
              DOM / HTML Snippet <span className="font-normal text-muted-foreground">(optional, improves accuracy)</span>
            </label>
            <Textarea
              value={domSnippet}
              onChange={(e) => setDomSnippet(e.target.value)}
              placeholder="Paste the relevant DOM/HTML around the failing element, if you have it…"
              className="min-h-20 font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button size="lg" onClick={handleDiagnose} disabled={!canDiagnose}>
          <Search className="h-4 w-4" />
          {loading ? "Diagnosing…" : "Diagnose & Fix"}
        </Button>
      </div>

      <section className="space-y-4">
        {loading && (
          <Card>
            <CardContent className="space-y-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        )}

        {!loading && result && (
          <>
            <DiagnosisPanel result={result} />
            <div className="flex justify-center">
              <Button variant="ghost" onClick={handleAnalyzeAgain}>
                <RotateCcw className="h-4 w-4" />
                Analyze Again
              </Button>
            </div>
          </>
        )}

        {!loading && !result && <EmptyState />}
      </section>
    </div>
  );
}
