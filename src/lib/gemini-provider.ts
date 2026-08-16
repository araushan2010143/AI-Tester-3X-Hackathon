import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  SchemaType,
  type Schema,
} from "@google/generative-ai";
import type { DiagnosisResult } from "./types";
import { FAILURE_TYPE_LABELS } from "./types";
import { assertValidDiagnosisShape } from "./validate-diagnosis";

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

const IMAGE_DATA_URL_RE = /^data:(image\/(?:png|jpe?g|webp));base64,([\s\S]+)$/;

/** Calls Gemini with retry/backoff on transient overload, parses the JSON response, clamps confidence. */
export async function callGemini(
  prompt: string,
  imageDataUrl?: string
): Promise<Omit<DiagnosisResult, "framework">> {
  const model = getModel();

  const match = imageDataUrl?.match(IMAGE_DATA_URL_RE);
  const request = match
    ? [prompt, { inlineData: { mimeType: match[1], data: match[2] } }]
    : prompt;

  let text: string | undefined;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const result = await model.generateContent(request);
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

  assertValidDiagnosisShape(parsed);
  // Clamp confidence defensively in case the model drifts outside 0-100.
  parsed.confidence = Math.max(0, Math.min(100, Math.round(parsed.confidence)));

  return parsed;
}
