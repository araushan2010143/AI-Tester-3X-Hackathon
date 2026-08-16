import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  SchemaType,
  type Schema,
} from "@google/generative-ai";
import type { DiagnoseRequest, DiagnosisResult, FailureCluster, Framework } from "./types";
import { FAILURE_TYPE_LABELS, FRAMEWORK_LABELS } from "./types";

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-flash-latest";

const FAILURE_TYPE_VALUES = Object.keys(FAILURE_TYPE_LABELS);

/** JSON schema Gemini must respond in, enforced via responseSchema (JSON mode). */
const diagnosisSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    failureType: {
      type: SchemaType.STRING,
      format: "enum",
      enum: FAILURE_TYPE_VALUES,
      description: "Single best-fit category for the failure.",
    },
    confidence: {
      type: SchemaType.NUMBER,
      description: "Confidence in this diagnosis, 0-100.",
    },
    risk: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["low", "medium", "high"],
      description:
        "How risky it would be to apply the fix and move on without further investigation. low = safe to apply directly (e.g. a clean locator swap). medium = fix is reasonable but a human should verify. high = do not blindly apply — this may be masking a real application bug or needs deeper investigation.",
    },
    rootCause: {
      type: SchemaType.STRING,
      description: "One to three sentence explanation of why the test actually failed.",
    },
    evidence: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description:
        "Concrete, specific clues pulled from the provided code/log/DOM (selectors, error text, line refs) that support the diagnosis. No generic statements.",
    },
    fix: {
      type: SchemaType.OBJECT,
      properties: {
        before: { type: SchemaType.STRING, description: "The brittle/broken snippet, verbatim or near-verbatim from the input." },
        after: { type: SchemaType.STRING, description: "A production-ready replacement snippet that fixes the root cause." },
        explanation: { type: SchemaType.STRING, description: "Why this fix works, one to two sentences." },
      },
      required: ["before", "after", "explanation"],
    },
  },
  required: ["failureType", "confidence", "risk", "rootCause", "evidence", "fix"],
};

const CATEGORY_GUIDANCE = `- locator_breakage: a selector no longer resolves, or resolves to the wrong/multiple elements, purely because of a DOM/attribute change.
- timing_race_condition: the element/data exists eventually but the test acted before it was ready — timeouts, animations, async rendering, race conditions.
- assertion_failure: the test correctly found everything and got a real value back, but expected != actual (a genuine behavioral mismatch, not a locator or timing problem).
- network_api_failure: an HTTP call the test depends on failed or errored (timeout, 5xx, connection refused, DNS) — the failure is in a network/API call, not the UI.
- environment_issue: the target service/environment itself was unavailable or misbehaving (e.g. "QA service unavailable", runner/infrastructure failure) — distinct from a single API call failing.
- configuration_issue: wrong environment variable, base URL, CI workflow/job config, or similar setup mismatch — the test itself is fine, its configuration is wrong.
- authentication_issue: 401/403, expired/invalid session or token, login/SSO/MFA failure, missing cookie — an auth problem, not a locator or app bug.
- test_data_issue: required test data doesn't exist, already exists, is expired, or is otherwise wrong for this run (e.g. "order not found", "user already exists").
- dependency_issue: build/dependency/compilation failure (npm/Maven/Gradle resolution, "cannot find symbol", ClassNotFoundException, version conflicts) — tests never actually executed.
- browser_issue: browser/driver crashed, session or context invalid, or a browser/driver version mismatch (e.g. SessionNotCreatedException, "Executable doesn't exist").
- flaky_test: the failure looks like a non-deterministic, hard-to-reproduce issue rather than a consistent one — only pick this when the evidence itself suggests non-determinism, not as a default guess.
- application_bug: everything about the test and environment looks correct, and the evidence points to the application itself behaving wrong.`;

function buildDiagnosisPrompt(req: DiagnoseRequest): string {
  return `You are a senior QA automation engineer acting as a debugging assistant. A test written in ${FRAMEWORK_LABELS[req.framework]} failed in CI. Diagnose the *real* root cause and produce a robust fix.

Rules:
- Ground every piece of evidence in specific details actually present in the inputs below (selector strings, error messages, line numbers, DOM attributes). Never state a generic guess like "the locator is probably broken" without pointing to the exact selector/attribute/error text that proves it.
- Pick exactly one failureType — use the sharpest fitting category, not the closest generic one:
${CATEGORY_GUIDANCE}
- confidence is 0-100 and should reflect how strong the evidence actually is, not a flat default.
- risk reflects how safe it is to apply the fix and move on: low for a clean, mechanical fix (e.g. a locator swap); high whenever the evidence could instead mean a real application bug or something needing a human to dig further — do not default to low.
- The fix must be idiomatic, resilient, production-ready code in the same framework/language as the test (prefer accessible/semantic locators over brittle CSS/XPath for UI frameworks, proper explicit waits over sleeps, etc.).
- "before" should be the specific broken snippet from the test code, not the whole file.

--- FAILED TEST CODE (${FRAMEWORK_LABELS[req.framework]}) ---
${req.testCode}

--- CI/CD ERROR LOG / STACK TRACE ---
${req.ciLog}
${req.domSnippet ? `\n--- RELEVANT DOM/HTML SNIPPET ---\n${req.domSnippet}\n` : ""}
Respond with only the JSON object matching the required schema.`;
}

/**
 * Bulk mode has no full test source — only a log-derived snippet shared by
 * every member of the cluster. The prompt is honest about that: ground
 * evidence in the snippet/test names actually available, and give the fix as
 * an idiomatic pattern rather than claiming a literal line from a file we
 * never saw.
 */
function buildBulkDiagnosisPrompt(cluster: FailureCluster, framework: Framework): string {
  const sampleNames = cluster.testNames.slice(0, 8);
  const moreCount = cluster.testNames.length - sampleNames.length;

  return `You are a senior QA automation engineer triaging a batch of CI failures from a Jenkins run. ${cluster.memberCount} tests written in ${FRAMEWORK_LABELS[framework]} failed with what looks like the same underlying pattern, grouped by matching error signatures. You only have the log output for one representative failure, not the full test source — diagnose from that.

Rules:
- Ground every piece of evidence in specific details actually present in the log snippet below (selector strings, error messages, class names, identifiers). Never state a generic guess.
- Pick exactly one failureType — use the sharpest fitting category, not the closest generic one:
${CATEGORY_GUIDANCE}
- confidence is 0-100 and should reflect how strong the evidence actually is — since this is inferred from a log snippet without the full test source, be honest if that caps how certain you can be.
- risk reflects how safe it is to apply the fix to all ${cluster.memberCount} tests in this cluster and move on: low for a clean, mechanical fix; high whenever the evidence could instead mean a real application bug or something needing a human to dig further.
- Since you don't have the original file, "before" should be your best reconstruction of the specific broken line implied by the log (e.g. the selector/call visible in the stack trace), and "after" should be an idiomatic, resilient replacement pattern in ${FRAMEWORK_LABELS[framework]} — a pattern the engineer can adapt, not a guaranteed drop-in.
- This diagnosis will be applied to all ${cluster.memberCount} tests in this cluster, so phrase the root cause and fix generally enough to cover the pattern, not just one specific test name.

--- REPRESENTATIVE TEST ---
${cluster.representative.testName}${cluster.representative.location ? ` (${cluster.representative.location})` : ""}

--- LOG SNIPPET ---
${cluster.representative.errorSnippet}

--- OTHER AFFECTED TESTS IN THIS CLUSTER (${cluster.memberCount} total${moreCount > 0 ? `, showing ${sampleNames.length}` : ""}) ---
${sampleNames.join("\n")}${moreCount > 0 ? `\n…and ${moreCount} more` : ""}

Respond with only the JSON object matching the required schema.`;
}

export class GeminiNotConfiguredError extends Error {
  constructor() {
    super("GEMINI_API_KEY is not set on the server.");
    this.name = "GeminiNotConfiguredError";
  }
}

/** Gemini itself is overloaded/rate-limited (503/429) — transient, not a bug in this app. */
export class GeminiOverloadedError extends Error {
  constructor() {
    super("Gemini is currently overloaded. Please try again in a few seconds.");
    this.name = "GeminiOverloadedError";
  }
}

const RETRYABLE_STATUSES = new Set([429, 503]);
const RETRY_DELAYS_MS = [500, 1500, 4000]; // three retries after the initial attempt

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiNotConfiguredError();
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: diagnosisSchema,
      temperature: 0.2,
    },
  });
}

/** Calls Gemini with retry/backoff on transient overload, parses the JSON response, clamps confidence. */
async function callGeminiJson(prompt: string): Promise<Omit<DiagnosisResult, "framework">> {
  const model = getModel();

  let text: string | undefined;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      text = result.response.text();
      break;
    } catch (err) {
      const isRetryable =
        err instanceof GoogleGenerativeAIFetchError &&
        typeof err.status === "number" &&
        RETRYABLE_STATUSES.has(err.status);

      if (!isRetryable || attempt === RETRY_DELAYS_MS.length) {
        if (isRetryable) throw new GeminiOverloadedError();
        throw err;
      }
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  let parsed: Omit<DiagnosisResult, "framework">;
  try {
    parsed = JSON.parse(text!);
  } catch {
    throw new Error("Gemini returned a response that could not be parsed as JSON.");
  }

  // Clamp confidence defensively in case the model drifts outside 0-100.
  parsed.confidence = Math.max(0, Math.min(100, Math.round(parsed.confidence)));

  return parsed;
}

export async function diagnoseFailure(
  req: DiagnoseRequest
): Promise<Omit<DiagnosisResult, "framework">> {
  return callGeminiJson(buildDiagnosisPrompt(req));
}

export async function diagnoseCluster(
  cluster: FailureCluster,
  framework: Framework
): Promise<Omit<DiagnosisResult, "framework">> {
  return callGeminiJson(buildBulkDiagnosisPrompt(cluster, framework));
}
