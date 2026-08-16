import type { DiagnosisResult, FailureCluster } from "./types";

/** Client-side view state for one cluster row, built up as stream events arrive. */
export type ClusterRowState =
  | { cluster: FailureCluster; status: "ok"; diagnosis: DiagnosisResult }
  | { cluster: FailureCluster; status: "error"; error: string }
  | { cluster: FailureCluster; status: "skipped" };
