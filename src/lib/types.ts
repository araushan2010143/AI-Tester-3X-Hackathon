export type Framework = "playwright-ts" | "playwright-js" | "selenium-java";

export const FRAMEWORK_LABELS: Record<Framework, string> = {
  "playwright-ts": "Playwright (TypeScript)",
  "playwright-js": "Playwright (JavaScript)",
  "selenium-java": "Selenium (Java)",
};

export type FailureType =
  | "locator_breakage"
  | "timing_race_condition"
  | "assertion_failure"
  | "network_api_failure"
  | "environment_issue"
  | "configuration_issue"
  | "authentication_issue"
  | "test_data_issue"
  | "dependency_issue"
  | "browser_issue"
  | "flaky_test"
  | "application_bug";

export const FAILURE_TYPE_LABELS: Record<FailureType, string> = {
  locator_breakage: "Locator Breakage",
  timing_race_condition: "Timing / Race Condition",
  assertion_failure: "Assertion Failure",
  network_api_failure: "Network / API Failure",
  environment_issue: "Environment Issue",
  configuration_issue: "Configuration Issue",
  authentication_issue: "Authentication Issue",
  test_data_issue: "Test Data Issue",
  dependency_issue: "Dependency / Build Issue",
  browser_issue: "Browser Issue",
  flaky_test: "Flaky Test",
  application_bug: "Potential Application Bug",
};

export type RiskLevel = "low" | "medium" | "high";

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: "Low Risk",
  medium: "Medium Risk",
  high: "High Risk",
};

export interface DiagnosisFix {
  before: string;
  after: string;
  explanation: string;
}

export interface DiagnosisResult {
  failureType: FailureType;
  confidence: number; // 0-100
  risk: RiskLevel;
  rootCause: string;
  evidence: string[];
  fix: DiagnosisFix;
  framework: Framework;
}

export interface DiagnoseRequest {
  testCode: string;
  ciLog: string;
  domSnippet?: string;
  framework: Framework;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  request: DiagnoseRequest;
  result: DiagnosisResult;
}

// --- Bulk mode (whole Jenkins log -> clustered diagnoses) ---

export interface ParsedFailure {
  id: string;
  testName: string;
  location?: string;
  errorSnippet: string;
}

export interface FailureCluster {
  fingerprint: string;
  memberCount: number;
  testNames: string[];
  representative: ParsedFailure;
}

export type BulkStreamEvent =
  | { type: "start"; totalFailures: number; totalClusters: number }
  | { type: "cluster"; cluster: FailureCluster; diagnosis: DiagnosisResult }
  | { type: "cluster-error"; cluster: FailureCluster; error: string }
  | { type: "skipped-cluster"; cluster: FailureCluster }
  | { type: "done"; clustersOk: number; clustersFailed: number; clustersSkipped: number }
  | { type: "error"; message: string };

// --- Flaky-test mode (real run history -> computed stats + grounded diagnosis) ---

export type RunStatus = "pass" | "fail";

export interface RunOutcome {
  run: string;
  status: RunStatus;
}

export type RunPattern = "alternating" | "clustered_recent" | "clustered_early" | "scattered" | "always_failing";

export const RUN_PATTERN_LABELS: Record<RunPattern, string> = {
  alternating: "Alternating pass/fail",
  clustered_recent: "Clustered in recent runs",
  clustered_early: "Clustered in earlier runs",
  scattered: "Scattered, no clear pattern",
  always_failing: "Always failing",
};

export interface RunHistoryStats {
  totalRuns: number;
  failedRuns: number;
  failureRate: number; // 0-100
  longestFailStreak: number;
  pattern: RunPattern;
  outcomes: RunOutcome[];
}

export interface FlakyDiagnoseRequest {
  runHistoryText: string;
  testName?: string;
  testCode?: string;
  failureLog?: string;
  framework: Framework;
}
