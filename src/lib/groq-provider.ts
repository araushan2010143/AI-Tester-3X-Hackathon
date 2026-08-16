import OpenAI, { APIError } from "openai";
import type { DiagnosisResult } from "./types";
import { assertValidDiagnosisShape } from "./validate-diagnosis";

const MODEL_NAME = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

export class GroqNotConfiguredError extends Error {
  constructor() {
    super("GROQ_API_KEY is not set on the server.");
    this.name = "GroqNotConfiguredError";
  }
}

export class GroqOverloadedError extends Error {
  constructor() {
    super("Groq is currently overloaded. Please try again in a few seconds.");
    this.name = "GroqOverloadedError";
  }
}

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [500, 1500, 4000];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new GroqNotConfiguredError();
  }
  // Groq's API is OpenAI-compatible — same SDK, different base URL.
  return new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
}

// Groq's JSON mode (response_format: json_object) only guarantees valid JSON syntax, not this
// specific shape — unlike Gemini/OpenAI there's no schema enforcement to lean on, so the exact
// shape has to be spelled out in the prompt itself, and assertValidDiagnosisShape() below is the
// real backstop.
const SHAPE_REMINDER = `

Respond with *only* a single JSON object with exactly these keys, no markdown fencing, no commentary:
{
  "failureType": one of "locator_breakage" | "timing_race_condition" | "assertion_failure" | "network_api_failure" | "environment_issue" | "configuration_issue" | "authentication_issue" | "test_data_issue" | "dependency_issue" | "browser_issue" | "flaky_test" | "application_bug",
  "confidence": number 0-100,
  "risk": "low" | "medium" | "high",
  "rootCause": string,
  "evidence": string[],
  "fix": { "before": string, "after": string, "explanation": string }
}`;

/** Text-only fallback (no vision support on the Groq-hosted models used here) — a screenshot
 *  is simply never sent on this path rather than silently ignored partway through. */
export async function callGroq(prompt: string): Promise<Omit<DiagnosisResult, "framework">> {
  const client = getClient();

  let text: string | null | undefined;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model: MODEL_NAME,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt + SHAPE_REMINDER }],
        response_format: { type: "json_object" },
      });
      text = completion.choices[0]?.message?.content;
      break;
    } catch (err) {
      const isRetryable = err instanceof APIError && typeof err.status === "number" && RETRYABLE_STATUSES.has(err.status);

      if (!isRetryable || attempt === RETRY_DELAYS_MS.length) {
        if (isRetryable) throw new GroqOverloadedError();
        throw err;
      }
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  if (!text) {
    throw new Error("Groq returned an empty response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Groq returned a response that could not be parsed as JSON.");
  }

  assertValidDiagnosisShape(parsed);
  parsed.confidence = Math.max(0, Math.min(100, Math.round(parsed.confidence)));
  return parsed;
}
