import { NextResponse } from "next/server";
import { diagnoseFlakiness, GeminiNotConfiguredError, GeminiOverloadedError } from "@/lib/gemini";
import { computeRunStats, parseRunHistory } from "@/lib/run-history";
import { parseRetryAttempts } from "@/lib/retry-parser";
import type { DiagnosisResult, Framework } from "@/lib/types";

const VALID_FRAMEWORKS: Framework[] = ["playwright-ts", "playwright-js", "selenium-java"];

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(req: Request) {
  let body: {
    runHistoryText?: unknown;
    testName?: unknown;
    testCode?: unknown;
    failureLog?: unknown;
    framework?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const { runHistoryText, testName, testCode, failureLog, framework } = body;

  if (!runHistoryText || typeof runHistoryText !== "string" || !runHistoryText.trim()) {
    return badRequest("runHistoryText is required.");
  }
  if (!framework || !VALID_FRAMEWORKS.includes(framework as Framework)) {
    return badRequest(`framework must be one of: ${VALID_FRAMEWORKS.join(", ")}`);
  }

  // Try the manual "Run #101 → PASS" format first; if that comes up short, the pasted text
  // might be a raw CI log with inline retry attempts instead — same specific-parser-then-
  // generic-fallback convention as parseFailures() in log-parser.ts.
  let outcomes = parseRunHistory(runHistoryText);
  let source: "manual" | "retry-log" = "manual";
  if (outcomes.length < 2) {
    const retryOutcomes = parseRetryAttempts(runHistoryText);
    if (retryOutcomes.length >= 2) {
      outcomes = retryOutcomes;
      source = "retry-log";
    }
  }
  if (outcomes.length < 2) {
    return badRequest(
      'Couldn\'t find at least 2 run/attempt outcomes in that text. Paste one run per line (e.g. "Run #101 → PASS") or a raw CI log with retry attempts (e.g. "Attempt 1: TimeoutError...", "Attempt 2: passed").'
    );
  }

  const stats = computeRunStats(outcomes, source);
  const fw = framework as Framework;

  try {
    const diagnosis = await diagnoseFlakiness(stats, {
      runHistoryText,
      testName: typeof testName === "string" ? testName : undefined,
      testCode: typeof testCode === "string" ? testCode : undefined,
      failureLog: typeof failureLog === "string" ? failureLog : undefined,
      framework: fw,
    });

    const result: DiagnosisResult = { ...diagnosis, framework: fw };
    return NextResponse.json({ stats, diagnosis: result });
  } catch (err) {
    // Stats are computed locally and don't depend on Gemini — return them even
    // when the AI explanation fails, so the client can still show real numbers.
    if (err instanceof GeminiNotConfiguredError) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server.", stats },
        { status: 500 }
      );
    }
    if (err instanceof GeminiOverloadedError) {
      return NextResponse.json(
        { error: "Gemini is busy right now (high demand on Google's side). Wait a few seconds and try again.", stats },
        { status: 503 }
      );
    }
    console.error("Flaky diagnose route failed:", err);
    return NextResponse.json(
      { error: "Diagnosis failed. The model may be unavailable or returned an unexpected response.", stats },
      { status: 500 }
    );
  }
}
