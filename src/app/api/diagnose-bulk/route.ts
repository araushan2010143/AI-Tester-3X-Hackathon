import { NextResponse } from "next/server";
import { diagnoseCluster, GeminiOverloadedError } from "@/lib/gemini";
import { parseFailures, detectCiProvider, MAX_LOG_CHARS } from "@/lib/log-parser";
import { clusterFailures } from "@/lib/failure-clustering";
import { detectSharedIdentifiers } from "@/lib/shared-data-detector";
import { mapWithConcurrency } from "@/lib/concurrency";
import type { BulkStreamEvent, DiagnosisResult, FailureCluster, Framework } from "@/lib/types";

const VALID_FRAMEWORKS: Framework[] = ["playwright-ts", "playwright-js", "selenium-java"];
const MAX_CLUSTERS_TO_DIAGNOSE = 40;
const CONCURRENCY = 3;

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function clusterErrorMessage(err: unknown): string {
  if (err instanceof GeminiOverloadedError) return err.message;
  if (err instanceof Error) return err.message;
  return "Diagnosis failed for this cluster.";
}

export async function POST(req: Request) {
  let body: { ciLog?: unknown; framework?: unknown };
  try {
    body = await req.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const { ciLog, framework } = body;

  if (!ciLog || typeof ciLog !== "string" || !ciLog.trim()) {
    return badRequest("ciLog is required.");
  }
  if (ciLog.length > MAX_LOG_CHARS) {
    return badRequest(`ciLog is too large (max ${MAX_LOG_CHARS.toLocaleString()} characters). Trim it to the failing sections.`);
  }
  if (!framework || !VALID_FRAMEWORKS.includes(framework as Framework)) {
    return badRequest(`framework must be one of: ${VALID_FRAMEWORKS.join(", ")}`);
  }
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server." },
      { status: 500 }
    );
  }

  const fw = framework as Framework;
  const ciProvider = detectCiProvider(ciLog);
  const failures = parseFailures(ciLog, fw);
  const clusters = clusterFailures(failures);
  const sharedIdentifiers = detectSharedIdentifiers(failures);
  const toDiagnose = clusters.slice(0, MAX_CLUSTERS_TO_DIAGNOSE);
  const overflow = clusters.slice(MAX_CLUSTERS_TO_DIAGNOSE);

  const encoder = new TextEncoder();
  // Shared with cancel() below so an abandoned client (closed tab, aborted fetch) stops the run
  // instead of crashing on enqueue-after-close or burning further Gemini calls no one will see.
  const state = { cancelled: false };

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: BulkStreamEvent) {
        if (state.cancelled) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          state.cancelled = true;
        }
      }

      send({
        type: "start",
        totalFailures: failures.length,
        totalClusters: clusters.length,
        ciProvider: ciProvider === "unknown" ? undefined : ciProvider,
        sharedIdentifiers: sharedIdentifiers.length > 0 ? sharedIdentifiers : undefined,
      });

      let clustersOk = 0;
      let clustersFailed = 0;

      try {
        for await (const settled of mapWithConcurrency(
          toDiagnose,
          CONCURRENCY,
          (cluster: FailureCluster) => diagnoseCluster(cluster, fw)
        )) {
          if (state.cancelled) break;

          if ("error" in settled) {
            clustersFailed++;
            send({ type: "cluster-error", cluster: settled.item, error: clusterErrorMessage(settled.error) });
          } else {
            clustersOk++;
            const diagnosis: DiagnosisResult = { ...settled.result, framework: fw };
            send({ type: "cluster", cluster: settled.item, diagnosis });
          }
        }

        if (!state.cancelled) {
          for (const skipped of overflow) {
            send({ type: "skipped-cluster", cluster: skipped });
          }
          send({ type: "done", clustersOk, clustersFailed, clustersSkipped: overflow.length });
        }
      } catch (err) {
        console.error("Bulk diagnose stream failed:", err);
        send({ type: "error", message: "Bulk analysis failed unexpectedly." });
      } finally {
        if (!state.cancelled) {
          try {
            controller.close();
          } catch {
            // already closed by the platform — nothing to do
          }
        }
      }
    },
    cancel() {
      state.cancelled = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
