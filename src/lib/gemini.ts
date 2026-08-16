import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  SchemaType,
  type Schema,
} from "@google/generative-ai";
import type { DiagnoseRequest, DiagnosisResult } from "./types";
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
  required: ["failureType", "confidence", "rootCause", "evidence", "fix"],
};

function buildDiagnosisPrompt(req: DiagnoseRequest): string {
  return `You are a senior QA automation engineer acting as a debugging assistant. A test written in ${FRAMEWORK_LABELS[req.framework]} failed in CI. Diagnose the *real* root cause and produce a robust fix.

Rules:
- Ground every piece of evidence in specific details actually present in the inputs below (selector strings, error messages, line numbers, DOM attributes). Never state a generic guess like "the locator is probably broken" without pointing to the exact selector/attribute/error text that proves it.
- Pick exactly one failureType that best fits: ${FAILURE_TYPE_VALUES.join(", ")}.
- confidence is 0-100 and should reflect how strong the evidence actually is, not a flat default.
- The fix must be idiomatic, resilient, production-ready code in the same framework/language as the test (prefer accessible/semantic locators over brittle CSS/XPath for UI frameworks, proper explicit waits over sleeps, etc.).
- "before" should be the specific broken snippet from the test code, not the whole file.

--- FAILED TEST CODE (${FRAMEWORK_LABELS[req.framework]}) ---
${req.testCode}

--- CI/CD ERROR LOG / STACK TRACE ---
${req.ciLog}
${req.domSnippet ? `\n--- RELEVANT DOM/HTML SNIPPET ---\n${req.domSnippet}\n` : ""}
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
const RETRY_DELAYS_MS = [500, 1500]; // two retries after the initial attempt

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function diagnoseFailure(
  req: DiagnoseRequest
): Promise<Omit<DiagnosisResult, "framework">> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiNotConfiguredError();
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: diagnosisSchema,
      temperature: 0.2,
    },
  });

  const prompt = buildDiagnosisPrompt(req);

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
