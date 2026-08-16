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
  consoleLog?: string;
  networkLog?: string;
  environmentInfo?: string;
  prReference?: string;
  framework: Framework;
}

/** Metadata about the GitHub PR a diagnosis was correlated against, for the "Correlated with PR #N" caption. */
export interface PrInfo {
  owner: string;
  repo: string;
  number: number;
  title: string;
  filesChanged: number;
  truncated: boolean;
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

/** Which CI system's log format was detected, purely for an honest "here's what we saw" label. */
export type CiProvider = "github-actions" | "jenkins" | "unknown";

/** Which AI provider actually produced a given diagnosis — Gemini is primary; OpenAI/Groq only
 *  fire when it's unavailable (see lib/llm-router.ts). Not to be confused with CiProvider above. */
export type LLMProvider = "gemini" | "openai" | "groq";

/** A concrete identifier (id/email/UUID) that shows up in 2+ *different* tests' failures —
 *  computed evidence for a possible shared-test-data / parallel-execution collision. */
export interface SharedIdentifierGroup {
  identifier: string;
  kind: "id" | "email" | "uuid";
  testNames: string[];
}

export type BulkStreamEvent =
  | {
      type: "start";
      totalFailures: number;
      totalClusters: number;
      ciProvider?: CiProvider;
      sharedIdentifiers?: SharedIdentifierGroup[];
    }
  | { type: "cluster"; cluster: FailureCluster; diagnosis: DiagnosisResult; llmProvider: LLMProvider }
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
  /** manual: typed as "Run #101 → PASS" lines. retry-log: auto-detected from a raw CI log's Attempt/Retry blocks. */
  source: "manual" | "retry-log";
}

export interface FlakyDiagnoseRequest {
  runHistoryText: string;
  testName?: string;
  testCode?: string;
  failureLog?: string;
  framework: Framework;
}

/** A completed flaky-test analysis, saved to its own history store (see lib/flaky-history.ts). */
export interface FlakyHistoryEntry {
  id: string;
  timestamp: number;
  framework: Framework;
  testName?: string;
  stats: RunHistoryStats;
  result: DiagnosisResult;
}

// --- Dashboard (aggregated from the three history stores, computed locally) ---

export interface DashboardActivityItem {
  id: string;
  timestamp: number;
  kind: "single" | "bulk" | "flaky";
  summary: string;
  /** Absent only for a bulk run where every cluster errored/was skipped — no honest single value exists. */
  failureType?: FailureType;
  framework: Framework;
  confidence?: number;
  risk?: RiskLevel;
}

export interface DashboardStats {
  totalSingleDiagnoses: number;
  totalBulkFailuresTriaged: number;
  totalBulkClustersDiagnosed: number;
  totalFlakyAnalyses: number;
  failureTypeCounts: Partial<Record<FailureType, number>>;
  riskCounts: Record<RiskLevel, number>;
  avgConfidence: number | null;
  /** 0-100, weighted average of risk (low=100, medium=55, high=10) across every diagnosis. */
  testHealthScore: number | null;
  /** Mean failure rate across flaky-test analyses. Null, not 0, when there's no flaky history yet. */
  flakinessScore: number | null;
  recentActivity: DashboardActivityItem[];
}

// --- Similar-past-diagnoses correlation (single-test mode) ---

export interface SimilarDiagnosis {
  entry: HistoryEntry;
  sharedKeywords: string[];
}
