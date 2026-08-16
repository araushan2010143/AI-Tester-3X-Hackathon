import { NextResponse } from "next/server";
import { diagnoseFailure, GeminiNotConfiguredError } from "@/lib/gemini";
import type { DiagnoseRequest, DiagnosisResult, Framework } from "@/lib/types";

const VALID_FRAMEWORKS: Framework[] = ["playwright-ts", "selenium-java"];

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(req: Request) {
  let body: Partial<DiagnoseRequest>;
  try {
    body = await req.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const { testCode, ciLog, domSnippet, framework } = body;

  if (!testCode || typeof testCode !== "string" || !testCode.trim()) {
    return badRequest("testCode is required.");
  }
  if (!ciLog || typeof ciLog !== "string" || !ciLog.trim()) {
    return badRequest("ciLog is required.");
  }
  if (!framework || !VALID_FRAMEWORKS.includes(framework as Framework)) {
    return badRequest(`framework must be one of: ${VALID_FRAMEWORKS.join(", ")}`);
  }

  try {
    const diagnosis = await diagnoseFailure({
      testCode,
      ciLog,
      domSnippet: typeof domSnippet === "string" ? domSnippet : undefined,
      framework: framework as Framework,
    });

    const result: DiagnosisResult = { ...diagnosis, framework: framework as Framework };
    return NextResponse.json(result satisfies DiagnosisResult);
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server." },
        { status: 500 }
      );
    }
    console.error("Diagnose route failed:", err);
    return NextResponse.json(
      { error: "Diagnosis failed. The model may be unavailable or returned an unexpected response." },
      { status: 500 }
    );
  }
}
