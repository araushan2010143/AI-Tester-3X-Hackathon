import type {
  DashboardActivityItem,
  DashboardStats,
  DiagnosisResult,
  FailureType,
  FlakyHistoryEntry,
  HistoryEntry,
  RiskLevel,
} from "./types";
import { FAILURE_TYPE_LABELS, FRAMEWORK_LABELS } from "./types";
import type { BulkHistoryEntry } from "./bulk-types";

const RISK_WEIGHT: Record<RiskLevel, number> = { low: 100, medium: 55, high: 10 };
const VALID_RISK_LEVELS = new Set<RiskLevel>(["low", "medium", "high"]);

function emptyRiskCounts(): Record<RiskLevel, number> {
  return { low: 0, medium: 0, high: 0 };
}

function tally(
  result: DiagnosisResult,
  weight: number,
  failureTypeCounts: Partial<Record<FailureType, number>>,
  riskCounts: Record<RiskLevel, number>,
  confidenceAcc: { sum: number; weight: number },
  healthAcc: { sum: number; weight: number }
) {
  failureTypeCounts[result.failureType] = (failureTypeCounts[result.failureType] ?? 0) + weight;
  confidenceAcc.sum += result.confidence * weight;
  confidenceAcc.weight += weight;

  // Entries saved before `risk` existed on DiagnosisResult have no value here — leave them out
  // of the risk-based stats entirely rather than let a missing value poison the whole average.
  if (VALID_RISK_LEVELS.has(result.risk)) {
    riskCounts[result.risk] += weight;
    healthAcc.sum += RISK_WEIGHT[result.risk] * weight;
    healthAcc.weight += weight;
  }
}

/**
 * Aggregates the three localStorage history stores into dashboard stats — everything here is
 * arithmetic over data already saved on-device, not a new AI call, same "compute it, don't
 * guess" posture as failure-clustering.ts and run-history.ts.
 */
export function computeDashboardStats(
  single: HistoryEntry[],
  bulk: BulkHistoryEntry[],
  flaky: FlakyHistoryEntry[]
): DashboardStats {
  const failureTypeCounts: Partial<Record<FailureType, number>> = {};
  const riskCounts = emptyRiskCounts();
  const confidenceAcc = { sum: 0, weight: 0 };
  const healthAcc = { sum: 0, weight: 0 };

  let totalBulkFailuresTriaged = 0;
  let totalBulkClustersDiagnosed = 0;

  for (const entry of single) {
    tally(entry.result, 1, failureTypeCounts, riskCounts, confidenceAcc, healthAcc);
  }

  for (const run of bulk) {
    totalBulkFailuresTriaged += run.totalFailures;
    for (const row of run.rows) {
      if (row.status !== "ok") continue;
      totalBulkClustersDiagnosed++;
      tally(row.diagnosis, row.cluster.memberCount, failureTypeCounts, riskCounts, confidenceAcc, healthAcc);
    }
  }

  let flakinessSum = 0;
  for (const entry of flaky) {
    tally(entry.result, 1, failureTypeCounts, riskCounts, confidenceAcc, healthAcc);
    flakinessSum += entry.stats.failureRate;
  }

  const recentActivity: DashboardActivityItem[] = [
    ...single.map(
      (e): DashboardActivityItem => ({
        id: e.id,
        timestamp: e.timestamp,
        kind: "single",
        summary: `${FAILURE_TYPE_LABELS[e.result.failureType]} · ${FRAMEWORK_LABELS[e.request.framework]}`,
        failureType: e.result.failureType,
        framework: e.request.framework,
        confidence: e.result.confidence,
        risk: e.result.risk,
      })
    ),
    ...bulk.map((e): DashboardActivityItem => {
      // Represent the whole run by its largest (primary) cluster — the same "primary root
      // cause" a run is already summarized by in bulk-results.tsx — since a run can span
      // several failure types and there's no single honest answer otherwise.
      const primary = [...e.rows].sort((a, b) => b.cluster.memberCount - a.cluster.memberCount).find((r) => r.status === "ok");
      return {
        id: e.id,
        timestamp: e.timestamp,
        kind: "bulk",
        summary: `${e.totalFailures} failures → ${e.totalClusters} root causes · ${FRAMEWORK_LABELS[e.framework]}`,
        failureType: primary?.diagnosis.failureType,
        framework: e.framework,
      };
    }),
    ...flaky.map(
      (e): DashboardActivityItem => ({
        id: e.id,
        timestamp: e.timestamp,
        kind: "flaky",
        summary: `${e.testName ?? "Flaky analysis"} · ${e.stats.failureRate}% failure rate`,
        failureType: e.result.failureType,
        framework: e.framework,
        confidence: e.result.confidence,
        risk: e.result.risk,
      })
    ),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  return {
    totalSingleDiagnoses: single.length,
    totalBulkFailuresTriaged,
    totalBulkClustersDiagnosed,
    totalFlakyAnalyses: flaky.length,
    failureTypeCounts,
    riskCounts,
    avgConfidence: confidenceAcc.weight > 0 ? Math.round(confidenceAcc.sum / confidenceAcc.weight) : null,
    testHealthScore: healthAcc.weight > 0 ? Math.round(healthAcc.sum / healthAcc.weight) : null,
    flakinessScore: flaky.length > 0 ? Math.round(flakinessSum / flaky.length) : null,
    recentActivity,
  };
}
