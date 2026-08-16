import { FAILURE_TYPE_LABELS, type DiagnosisResult } from "./types";

const VALID_FAILURE_TYPES = new Set(Object.keys(FAILURE_TYPE_LABELS));
const VALID_RISK_LEVELS = new Set(["low", "medium", "high"]);

/**
 * Runtime safety net for the diagnosis shape. Gemini and OpenAI both structurally enforce this
 * via a JSON schema, so it should never fire for them — but Groq's JSON mode only guarantees
 * *valid JSON*, not this specific shape, so this is the real backstop on that path. Throwing
 * here (rather than silently coercing) is deliberate: it lets the router treat a malformed
 * response exactly like any other provider failure and fail over to the next one.
 */
export function assertValidDiagnosisShape(
  parsed: unknown
): asserts parsed is Omit<DiagnosisResult, "framework"> {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Response was not a JSON object.");
  }
  const p = parsed as Record<string, unknown>;

  if (typeof p.failureType !== "string" || !VALID_FAILURE_TYPES.has(p.failureType)) {
    throw new Error(`Response had an invalid or missing failureType: ${String(p.failureType)}`);
  }
  if (typeof p.confidence !== "number" || Number.isNaN(p.confidence)) {
    throw new Error("Response had an invalid or missing confidence.");
  }
  if (typeof p.risk !== "string" || !VALID_RISK_LEVELS.has(p.risk)) {
    throw new Error(`Response had an invalid or missing risk: ${String(p.risk)}`);
  }
  if (typeof p.rootCause !== "string" || !p.rootCause.trim()) {
    throw new Error("Response had a missing rootCause.");
  }
  if (!Array.isArray(p.evidence) || !p.evidence.every((e) => typeof e === "string")) {
    throw new Error("Response had an invalid or missing evidence array.");
  }
  const fix = p.fix as Record<string, unknown> | undefined;
  if (
    !fix ||
    typeof fix !== "object" ||
    typeof fix.before !== "string" ||
    typeof fix.after !== "string" ||
    typeof fix.explanation !== "string"
  ) {
    throw new Error("Response had an invalid or missing fix (before/after/explanation).");
  }
}
