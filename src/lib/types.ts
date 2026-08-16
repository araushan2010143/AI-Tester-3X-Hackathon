export type Framework = "playwright-ts" | "selenium-java";

export const FRAMEWORK_LABELS: Record<Framework, string> = {
  "playwright-ts": "Playwright (TypeScript)",
  "selenium-java": "Selenium (Java)",
};

export type FailureType =
  | "locator_breakage"
  | "timing_race_condition"
  | "assertion_failure"
  | "network_api_failure"
  | "environment_issue"
  | "flaky_test"
  | "application_bug";

export const FAILURE_TYPE_LABELS: Record<FailureType, string> = {
  locator_breakage: "Locator Breakage",
  timing_race_condition: "Timing / Race Condition",
  assertion_failure: "Assertion Failure",
  network_api_failure: "Network / API Failure",
  environment_issue: "Environment Issue",
  flaky_test: "Flaky Test",
  application_bug: "Potential Application Bug",
};

export interface DiagnosisFix {
  before: string;
  after: string;
  explanation: string;
}

export interface DiagnosisResult {
  failureType: FailureType;
  confidence: number; // 0-100
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
