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
  /** This device's own monotonically-increasing count of bulk analyses run — survives the
   *  MAX_ENTRIES eviction cap, same way a real CI system's build number keeps climbing even
   *  after old builds are pruned. Not a real Jenkins/GitHub build number, just labeled honestly. */
  buildNumber: number;
  framework: Framework;
  totalFailures: number;
  totalClusters: number;
  rows: ClusterRowState[];
}
