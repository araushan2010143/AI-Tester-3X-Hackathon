import { NextResponse } from "next/server";
import { diagnoseFailure, GeminiNotConfiguredError, GeminiOverloadedError } from "@/lib/gemini";
import type { DiagnoseRequest, DiagnosisResult, Framework } from "@/lib/types";

const VALID_FRAMEWORKS: Framework[] = ["playwright-ts", "playwright-js", "selenium-java"];
const SCREENSHOT_DATA_URL_RE = /^data:image\/(?:png|jpe?g|webp);base64,/;
// ~4MB of base64 (base64 is ~4/3 the size of the binary, so this is roughly a 3MB image).
const MAX_SCREENSHOT_BASE64_CHARS = 4_000_000;

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(req: Request) {
  let body: Partial<DiagnoseRequest> & { screenshotDataUrl?: unknown };
  try {
    body = await req.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const { testCode, ciLog, domSnippet, consoleLog, networkLog, screenshotDataUrl, framework } = body;

  if (!testCode || typeof testCode !== "string" || !testCode.trim()) {
    return badRequest("testCode is required.");
  }
  if (!ciLog || typeof ciLog !== "string" || !ciLog.trim()) {
    return badRequest("ciLog is required.");
  }
  if (!framework || !VALID_FRAMEWORKS.includes(framework as Framework)) {
    return badRequest(`framework must be one of: ${VALID_FRAMEWORKS.join(", ")}`);
  }
  if (screenshotDataUrl !== undefined) {
    if (typeof screenshotDataUrl !== "string" || !SCREENSHOT_DATA_URL_RE.test(screenshotDataUrl)) {
      return badRequest("screenshotDataUrl must be a base64 PNG/JPEG/WebP data URL.");
    }
    if (screenshotDataUrl.length > MAX_SCREENSHOT_BASE64_CHARS) {
      return badRequest("Screenshot is too large — please attach something under ~3MB.");
    }
  }

  try {
    const diagnosis = await diagnoseFailure(
      {
        testCode,
        ciLog,
        domSnippet: typeof domSnippet === "string" ? domSnippet : undefined,
        consoleLog: typeof consoleLog === "string" ? consoleLog : undefined,
        networkLog: typeof networkLog === "string" ? networkLog : undefined,
        framework: framework as Framework,
      },
      typeof screenshotDataUrl === "string" ? screenshotDataUrl : undefined
    );

    const result: DiagnosisResult = { ...diagnosis, framework: framework as Framework };
    return NextResponse.json(result satisfies DiagnosisResult);
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server." },
        { status: 500 }
      );
    }
    if (err instanceof GeminiOverloadedError) {
      console.warn("Diagnose route: Gemini overloaded after retries.");
      return NextResponse.json(
        { error: "Gemini is busy right now (high demand on Google's side). Wait a few seconds and hit Diagnose & Fix again." },
        { status: 503 }
      );
    }
    console.error("Diagnose route failed:", err);
    return NextResponse.json(
      { error: "Diagnosis failed. The model may be unavailable or returned an unexpected response." },
      { status: 500 }
    );
  }
}
