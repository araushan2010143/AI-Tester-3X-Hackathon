import OpenAI, { APIError } from "openai";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";
import type { DiagnosisResult } from "./types";
import { FAILURE_TYPE_LABELS } from "./types";
import { assertValidDiagnosisShape } from "./validate-diagnosis";

const MODEL_NAME = process.env.OPENAI_MODEL || "gpt-4o-mini";
const FAILURE_TYPE_VALUES = Object.keys(FAILURE_TYPE_LABELS);

/** Plain JSON Schema (not Google's SchemaType format) for OpenAI's Structured Outputs —
 *  strict mode requires every property listed in `required` and `additionalProperties: false`
 *  on every object level. */
const diagnosisJsonSchema = {
  type: "object",
  properties: {
    failureType: { type: "string", enum: FAILURE_TYPE_VALUES },
    confidence: { type: "number" },
    risk: { type: "string", enum: ["low", "medium", "high"] },
    rootCause: { type: "string" },
    evidence: { type: "array", items: { type: "string" } },
    fix: {
      type: "object",
      properties: {
        before: { type: "string" },
        after: { type: "string" },
        explanation: { type: "string" },
      },
      required: ["before", "after", "explanation"],
      additionalProperties: false,
    },
  },
  required: ["failureType", "confidence", "risk", "rootCause", "evidence", "fix"],
  additionalProperties: false,
};

export class OpenAINotConfiguredError extends Error {
  constructor() {
    super("OPENAI_API_KEY is not set on the server.");
    this.name = "OpenAINotConfiguredError";
  }
}

export class OpenAIOverloadedError extends Error {
  constructor() {
    super("OpenAI is currently overloaded. Please try again in a few seconds.");
    this.name = "OpenAIOverloadedError";
  }
}

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [500, 1500, 4000];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OpenAINotConfiguredError();
  }
  return new OpenAI({ apiKey });
}

/** Calls OpenAI with retry/backoff on transient overload, parses the JSON response. */
export async function callOpenAI(
  prompt: string,
  imageDataUrl?: string
): Promise<Omit<DiagnosisResult, "framework">> {
  const client = getClient();

  const content: ChatCompletionContentPart[] = [{ type: "text", text: prompt }];
  if (imageDataUrl) {
    content.push({ type: "image_url", image_url: { url: imageDataUrl } });
  }

  let text: string | null | undefined;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        model: MODEL_NAME,
        temperature: 0.2,
        messages: [{ role: "user", content }],
        response_format: {
          type: "json_schema",
          json_schema: { name: "diagnosis", schema: diagnosisJsonSchema, strict: true },
        },
      });
      text = completion.choices[0]?.message?.content;
      break;
    } catch (err) {
      const isRetryable = err instanceof APIError && typeof err.status === "number" && RETRYABLE_STATUSES.has(err.status);

      if (!isRetryable || attempt === RETRY_DELAYS_MS.length) {
        if (isRetryable) throw new OpenAIOverloadedError();
        throw err;
      }
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  if (!text) {
    throw new Error("OpenAI returned an empty response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("OpenAI returned a response that could not be parsed as JSON.");
  }

  assertValidDiagnosisShape(parsed);
  parsed.confidence = Math.max(0, Math.min(100, Math.round(parsed.confidence)));
  return parsed;
}
