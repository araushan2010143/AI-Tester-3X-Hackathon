import type { DiagnosisResult, FailureCluster, Framework } from "./types";

/** Client-side view state for one cluster row, built up as stream events arrive. */
export type ClusterRowState =
  | { cluster: FailureCluster; status: "ok"; diagnosis: DiagnosisResult }
  | { cluster: FailureCluster; status: "error"; error: string }
  | { cluster: FailureCluster; status: "skipped" };

/** A completed bulk run, saved to its own history store (see lib/bulk-history.ts). */
export interface BulkHistoryEntry {
  id: string;
  timestamp: number;
  framework: Framework;
  totalFailures: number;
  totalClusters: number;
  rows: ClusterRowState[];
}
