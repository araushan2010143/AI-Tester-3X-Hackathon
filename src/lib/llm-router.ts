import type { DiagnosisResult, LLMProvider } from "./types";
import { callGemini, GeminiNotConfiguredError } from "./gemini-provider";
import { callOpenAI } from "./openai-provider";
import { callGroq } from "./groq-provider";

export interface LLMCallResult {
  result: Omit<DiagnosisResult, "framework">;
  provider: LLMProvider;
}

export class AllProvidersUnavailableError extends Error {
  constructor(cause: unknown) {
    super(
      "None of the configured AI providers (Gemini/OpenAI/Groq) could produce a diagnosis right now. Try again shortly."
    );
    this.name = "AllProvidersUnavailableError";
    this.cause = cause;
  }
}

/**
 * Tries each *configured* provider in order — Gemini first (primary), then OpenAI, then Groq
 * — and returns the first one that succeeds. A provider with no API key set is skipped, not
 * treated as a failure, so a deployment with only GEMINI_API_KEY set behaves identically to
 * before this router existed. Any error from a configured provider (overload, malformed
 * response, whatever) moves on to the next rather than failing the whole request — that's the
 * entire point: Gemini going down mid-demo shouldn't mean the app goes down.
 */
export async function callLLMWithFallback(prompt: string, imageDataUrl?: string): Promise<LLMCallResult> {
  const attempts: { provider: LLMProvider; configured: boolean; call: () => Promise<Omit<DiagnosisResult, "framework">> }[] = [
    { provider: "gemini", configured: !!process.env.GEMINI_API_KEY, call: () => callGemini(prompt, imageDataUrl) },
    { provider: "openai", configured: !!process.env.OPENAI_API_KEY, call: () => callOpenAI(prompt, imageDataUrl) },
    // Groq's hosted models here are text-only — the image is dropped on this path, never sent.
    { provider: "groq", configured: !!process.env.GROQ_API_KEY, call: () => callGroq(prompt) },
  ];

  let lastError: unknown;
  let anyConfigured = false;

  for (const attempt of attempts) {
    if (!attempt.configured) continue;
    anyConfigured = true;
    try {
      const result = await attempt.call();
      return { result, provider: attempt.provider };
    } catch (err) {
      console.warn(`${attempt.provider} failed, trying next provider:`, err instanceof Error ? err.message : err);
      lastError = err;
    }
  }

  if (!anyConfigured) {
    // Nothing configured at all — throw the same error routes already special-case to tell the
    // user exactly which env var to set, same message as before this router existed.
    throw new GeminiNotConfiguredError();
  }
  throw new AllProvidersUnavailableError(lastError);
}
