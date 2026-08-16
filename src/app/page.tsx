"use client";

import { useState } from "react";
import { Sparkles, RotateCcw, Search, ListTree, Activity } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CodeEditor } from "@/components/code-editor";
import { FrameworkSelector } from "@/components/framework-selector";
import { ScreenshotUpload } from "@/components/screenshot-upload";
import { DiagnosisPanel } from "@/components/diagnosis-panel";
import { EmptyState } from "@/components/empty-state";
import { HistoryPanel } from "@/components/history-panel";
import { BulkHistoryPanel } from "@/components/bulk-history-panel";
import { BulkResults } from "@/components/bulk-results";
import { FlakyStatsPanel } from "@/components/flaky-stats-panel";
import { addHistoryEntry } from "@/lib/history";
import { addBulkHistoryEntry } from "@/lib/bulk-history";
import { DEMOS } from "@/lib/demo-data";
import { DEMO_BULK_LOG } from "@/lib/demo-bulk-log";
import { DEMO_FLAKY_RUN } from "@/lib/demo-flaky-run";
import { FRAMEWORK_LABELS, type DiagnoseRequest, type DiagnosisResult, type Framework, type HistoryEntry, type BulkStreamEvent, type RunHistoryStats } from "@/lib/types";
import type { BulkHistoryEntry, ClusterRowState } from "@/lib/bulk-types";

const MONACO_LANGUAGE: Record<Framework, string> = {
  "playwright-ts": "typescript",
  "playwright-js": "javascript",
  "selenium-java": "java",
};

export default function Home() {
  const [mode, setMode] = useState<"single" | "bulk" | "flaky">("single");

  // --- Single-test mode ---
  const [framework, setFramework] = useState<Framework>("playwright-ts");
  const [testCode, setTestCode] = useState("");
  const [ciLog, setCiLog] = useState("");
  const [domSnippet, setDomSnippet] = useState("");
  const [consoleLog, setConsoleLog] = useState("");
  const [networkLog, setNetworkLog] = useState("");
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
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
      consoleLog: consoleLog.trim() || undefined,
      networkLog: networkLog.trim() || undefined,
      framework,
    };

    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...request, screenshotDataUrl: screenshotDataUrl ?? undefined }),
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
    setConsoleLog("");
    setNetworkLog("");
    setScreenshotDataUrl(null);
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
      setConsoleLog("");
      setNetworkLog("");
      setScreenshotDataUrl(null);
      setResult(null);
      toast.info(`Switched to ${FRAMEWORK_LABELS[next]} — cleared the previous example so code doesn't get mixed up.`);
    }
  }

  function handleSelectHistory(entry: HistoryEntry) {
    setMode("single");
    setFramework(entry.request.framework);
    setTestCode(entry.request.testCode);
    setCiLog(entry.request.ciLog);
    setDomSnippet(entry.request.domSnippet ?? "");
    setConsoleLog(entry.request.consoleLog ?? "");
    setNetworkLog(entry.request.networkLog ?? "");
    setScreenshotDataUrl(null);
    setResult(entry.result);
  }

  function handleAnalyzeAgain() {
    setResult(null);
    setTestCode("");
    setCiLog("");
    setDomSnippet("");
    setConsoleLog("");
    setNetworkLog("");
    setScreenshotDataUrl(null);
  }

  // --- Bulk mode ---
  const [bulkFramework, setBulkFramework] = useState<Framework>("playwright-ts");
  const [bulkLog, setBulkLog] = useState("");
  const [bulkStreaming, setBulkStreaming] = useState(false);
  const [bulkStarted, setBulkStarted] = useState(false);
  const [bulkTotalFailures, setBulkTotalFailures] = useState(0);
  const [bulkTotalClusters, setBulkTotalClusters] = useState(0);
  const [bulkRows, setBulkRows] = useState<ClusterRowState[]>([]);

  const canAnalyzeLog = bulkLog.trim().length > 0 && !bulkStreaming;

  function handleSelectBulkHistory(entry: BulkHistoryEntry) {
    setMode("bulk");
    setBulkFramework(entry.framework);
    setBulkTotalFailures(entry.totalFailures);
    setBulkTotalClusters(entry.totalClusters);
    setBulkRows(entry.rows);
    setBulkStarted(true);
    setBulkStreaming(false);
  }

  function handleLoadBulkDemo() {
    setBulkFramework("playwright-ts");
    setBulkLog(DEMO_BULK_LOG);
    toast.success("Demo log loaded — hit Analyze Log to run the real clustering + diagnosis pipeline.");
  }

  async function handleAnalyzeLog() {
    if (!canAnalyzeLog) {
      toast.error("Paste a Jenkins/CI console log first.");
      return;
    }

    setBulkStreaming(true);
    setBulkStarted(true);
    setBulkRows([]);
    setBulkTotalFailures(0);
    setBulkTotalClusters(0);

    // Mirrors the React state locally so the final `done` event can save a complete
    // history entry without racing the async setState batching.
    let collectedRows: ClusterRowState[] = [];
    let collectedTotalFailures = 0;
    let collectedTotalClusters = 0;

    try {
      const res = await fetch("/api/diagnose-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ciLog: bulkLog, framework: bulkFramework }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Bulk analysis failed to start.");
        setBulkStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as BulkStreamEvent;

          if (event.type === "start") {
            collectedTotalFailures = event.totalFailures;
            collectedTotalClusters = event.totalClusters;
            setBulkTotalFailures(event.totalFailures);
            setBulkTotalClusters(event.totalClusters);
            if (event.totalFailures === 0) {
              toast.error("No failures matched this framework's log format. Check the log or try the other framework.");
            }
          } else if (event.type === "cluster") {
            const row: ClusterRowState = { cluster: event.cluster, status: "ok", diagnosis: event.diagnosis };
            collectedRows = [...collectedRows, row];
            setBulkRows((prev) => [...prev, row]);
          } else if (event.type === "cluster-error") {
            const row: ClusterRowState = { cluster: event.cluster, status: "error", error: event.error };
            collectedRows = [...collectedRows, row];
            setBulkRows((prev) => [...prev, row]);
          } else if (event.type === "skipped-cluster") {
            const row: ClusterRowState = { cluster: event.cluster, status: "skipped" };
            collectedRows = [...collectedRows, row];
            setBulkRows((prev) => [...prev, row]);
          } else if (event.type === "done") {
            if (collectedTotalFailures > 0) {
              addBulkHistoryEntry(bulkFramework, collectedTotalFailures, collectedTotalClusters, collectedRows);
            }
            toast.success(
              `Done — ${event.clustersOk} root cause${event.clustersOk === 1 ? "" : "s"} diagnosed${
                event.clustersFailed ? `, ${event.clustersFailed} failed` : ""
              }${event.clustersSkipped ? `, ${event.clustersSkipped} skipped` : ""}.`
            );
          } else if (event.type === "error") {
            toast.error(event.message);
          }
        }
      }
    } catch {
      toast.error("Lost connection to the server mid-analysis. Try again.");
    } finally {
      setBulkStreaming(false);
    }
  }

  // --- Flaky-test mode ---
  const [flakyFramework, setFlakyFramework] = useState<Framework>("playwright-ts");
  const [testName, setTestName] = useState("");
  const [runHistoryText, setRunHistoryText] = useState("");
  const [flakyTestCode, setFlakyTestCode] = useState("");
  const [flakyFailureLog, setFlakyFailureLog] = useState("");
  const [flakyStats, setFlakyStats] = useState<RunHistoryStats | null>(null);
  const [flakyResult, setFlakyResult] = useState<DiagnosisResult | null>(null);
  const [flakyLoading, setFlakyLoading] = useState(false);

  const canAnalyzeFlaky = runHistoryText.trim().length > 0 && !flakyLoading;

  function handleLoadFlakyDemo() {
    setFlakyFramework(DEMO_FLAKY_RUN.framework);
    setTestName(DEMO_FLAKY_RUN.testName);
    setRunHistoryText(DEMO_FLAKY_RUN.runHistoryText);
    setFlakyTestCode(DEMO_FLAKY_RUN.testCode);
    setFlakyFailureLog(DEMO_FLAKY_RUN.failureLog);
    setFlakyStats(null);
    setFlakyResult(null);
    toast.success("Demo run history loaded — hit Analyze Flakiness to run the real diagnosis.");
  }

  function handleFlakyAnalyzeAgain() {
    setFlakyStats(null);
    setFlakyResult(null);
    setTestName("");
    setRunHistoryText("");
    setFlakyTestCode("");
    setFlakyFailureLog("");
  }

  async function handleAnalyzeFlaky() {
    if (!canAnalyzeFlaky) {
      toast.error("Paste the run history first.");
      return;
    }

    setFlakyLoading(true);
    setFlakyStats(null);
    setFlakyResult(null);

    try {
      const res = await fetch("/api/diagnose-flaky", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runHistoryText,
          testName: testName.trim() || undefined,
          testCode: flakyTestCode.trim() || undefined,
          failureLog: flakyFailureLog.trim() || undefined,
          framework: flakyFramework,
        }),
      });
      const data = await res.json();

      if (data.stats) setFlakyStats(data.stats as RunHistoryStats);

      if (!res.ok) {
        toast.error(data.error || "Flaky analysis failed.");
        return;
      }

      setFlakyResult(data.diagnosis as DiagnosisResult);
    } catch {
      toast.error("Couldn't reach the diagnose API. Check your connection and try again.");
    } finally {
      setFlakyLoading(false);
    }
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
          {mode === "single" && (
            <>
              <Button variant="outline" size="sm" onClick={handleLoadDemo}>
                <Sparkles className="h-4 w-4" />
                Load Demo
              </Button>
              <HistoryPanel onSelect={handleSelectHistory} />
            </>
          )}
          {mode === "bulk" && (
            <>
              <Button variant="outline" size="sm" onClick={handleLoadBulkDemo}>
                <Sparkles className="h-4 w-4" />
                Load Demo Log
              </Button>
              <BulkHistoryPanel onSelect={handleSelectBulkHistory} />
            </>
          )}
          {mode === "flaky" && (
            <Button variant="outline" size="sm" onClick={handleLoadFlakyDemo}>
              <Sparkles className="h-4 w-4" />
              Load Demo History
            </Button>
          )}
        </div>
      </header>

      <Tabs value={mode} onValueChange={(v) => setMode(v as "single" | "bulk" | "flaky")}>
        <TabsList>
          <TabsTrigger value="single">Single Test</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Log (Jenkins)</TabsTrigger>
          <TabsTrigger value="flaky">Flaky Test</TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="flex flex-col gap-8 pt-6">
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

              <Accordion>
                <AccordionItem value="evidence">
                  <AccordionTrigger>
                    Additional Evidence <span className="ml-1.5 font-normal text-muted-foreground">(optional, improves accuracy)</span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-1">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">DOM / HTML Snippet</label>
                      <Textarea
                        value={domSnippet}
                        onChange={(e) => setDomSnippet(e.target.value)}
                        placeholder="Paste the relevant DOM/HTML around the failing element, if you have it…"
                        className="min-h-20 font-mono text-xs"
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Browser Console Log</label>
                        <Textarea
                          value={consoleLog}
                          onChange={(e) => setConsoleLog(e.target.value)}
                          placeholder="console.error / pageerror output, if you captured it…"
                          className="min-h-20 font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold">Network Log / Failed Requests</label>
                        <Textarea
                          value={networkLog}
                          onChange={(e) => setNetworkLog(e.target.value)}
                          placeholder="Failed request URLs, status codes, response bodies…"
                          className="min-h-20 font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Screenshot at Failure</label>
                      <p className="text-xs text-muted-foreground">
                        Sent to Gemini as an image — a cookie banner, modal, or error page it wouldn&apos;t
                        otherwise know about can change the diagnosis.
                      </p>
                      <ScreenshotUpload value={screenshotDataUrl} onChange={setScreenshotDataUrl} />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
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
        </TabsContent>

        <TabsContent value="bulk" className="flex flex-col gap-8 pt-6">
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium">Test Framework</label>
                <FrameworkSelector value={bulkFramework} onChange={setBulkFramework} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Jenkins / CI Console Log</label>
                <p className="text-xs text-muted-foreground">
                  Paste the full console output for a run with many failures. It&apos;s parsed and clustered by
                  matching error signature before anything is sent to Gemini — so you get a handful of real
                  root causes, not one AI call per failing test.
                </p>
                <CodeEditor
                  value={bulkLog}
                  onChange={setBulkLog}
                  language="plaintext"
                  height="400px"
                  ariaLabel="Jenkins CI console log"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button size="lg" onClick={handleAnalyzeLog} disabled={!canAnalyzeLog}>
              <ListTree className="h-4 w-4" />
              {bulkStreaming ? "Analyzing…" : "Analyze Log"}
            </Button>
          </div>

          <section className="space-y-4">
            {bulkStreaming && bulkTotalFailures === 0 && (
              <Card>
                <CardContent className="space-y-4">
                  <Skeleton className="h-8 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </CardContent>
              </Card>
            )}

            {bulkStarted && bulkTotalFailures > 0 && (
              <BulkResults
                totalFailures={bulkTotalFailures}
                totalClusters={bulkTotalClusters}
                rows={bulkRows}
                streaming={bulkStreaming}
              />
            )}

            {bulkStarted && !bulkStreaming && bulkTotalFailures === 0 && (
              <EmptyState
                title="No failures found in that log"
                description={`Nothing matched ${FRAMEWORK_LABELS[bulkFramework]}'s failure format. Double-check the framework selector or paste the raw console output, not a summary.`}
              />
            )}

            {!bulkStarted && (
              <EmptyState
                title="No analysis yet"
                description="Paste a Jenkins console log above, then hit Analyze Log — or load the demo log."
              />
            )}
          </section>
        </TabsContent>

        <TabsContent value="flaky" className="flex flex-col gap-8 pt-6">
          <Card>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium">Test Framework</label>
                <FrameworkSelector value={flakyFramework} onChange={setFlakyFramework} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">
                  Test Name <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Input
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="e.g. displays search results after typing"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Run History</label>
                <p className="text-xs text-muted-foreground">
                  Paste one outcome per run, in order — e.g. &quot;Run #101 → PASS&quot;. The failure rate and
                  pattern are computed locally; Gemini only explains what they mean.
                </p>
                <CodeEditor
                  value={runHistoryText}
                  onChange={setRunHistoryText}
                  language="plaintext"
                  height="200px"
                  ariaLabel="Run history"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    Test Code <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <CodeEditor
                    value={flakyTestCode}
                    onChange={setFlakyTestCode}
                    language={MONACO_LANGUAGE[flakyFramework]}
                    ariaLabel="Test code"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    Log From a Recent Failure <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <CodeEditor
                    value={flakyFailureLog}
                    onChange={setFlakyFailureLog}
                    language="plaintext"
                    ariaLabel="Recent failure log"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button size="lg" onClick={handleAnalyzeFlaky} disabled={!canAnalyzeFlaky}>
              <Activity className="h-4 w-4" />
              {flakyLoading ? "Analyzing…" : "Analyze Flakiness"}
            </Button>
          </div>

          <section className="space-y-4">
            {flakyLoading && (
              <Card>
                <CardContent className="space-y-4">
                  <Skeleton className="h-8 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </CardContent>
              </Card>
            )}

            {!flakyLoading && flakyStats && <FlakyStatsPanel stats={flakyStats} />}

            {!flakyLoading && flakyResult && (
              <>
                <DiagnosisPanel result={flakyResult} />
                <div className="flex justify-center">
                  <Button variant="ghost" onClick={handleFlakyAnalyzeAgain}>
                    <RotateCcw className="h-4 w-4" />
                    Analyze Again
                  </Button>
                </div>
              </>
            )}

            {!flakyLoading && !flakyStats && !flakyResult && (
              <EmptyState
                title="No analysis yet"
                description="Paste real CI run history above, then hit Analyze Flakiness — or load the demo history."
              />
            )}
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
