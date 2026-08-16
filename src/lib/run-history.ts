import type { RunHistoryStats, RunOutcome, RunPattern, RunStatus } from "./types";

export const PASS_RE = /\b(passed|pass|success(?:ful)?|ok)\b|✓|✔/i;
export const FAIL_RE = /\b(failed|fail|error|broken)\b|✗|✖|❌/i;
/** Leading run identifier: "Run #101", "Build 42", "#101", or a bare "101" at line start. */
const LABEL_RE = /^\s*(?:run|build)?\s*#?(\d+)/i;

function detectStatus(line: string): RunStatus | null {
  if (FAIL_RE.test(line)) return "fail";
  if (PASS_RE.test(line)) return "pass";
  return null;
}

/**
 * Forgiving line-based parser for pasted CI run history — one outcome per line,
 * in whatever format the user's CI dashboard happens to export as plain text
 * (e.g. "Run #101 → PASS", "101: FAILED", "Build 42 - success").
 */
export function parseRunHistory(text: string): RunOutcome[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const outcomes: RunOutcome[] = [];
  let seq = 0;

  for (const line of lines) {
    const status = detectStatus(line);
    if (!status) continue;
    seq++;
    const labelMatch = line.match(LABEL_RE);
    outcomes.push({ run: labelMatch ? `#${labelMatch[1]}` : `#${seq}`, status });
  }

  return outcomes;
}

function detectPattern(outcomes: RunOutcome[], failedRuns: number, totalRuns: number): RunPattern {
  if (failedRuns === totalRuns) return "always_failing";
  if (failedRuns === 0) return "scattered";

  const windowSize = Math.max(1, Math.round(totalRuns * 0.3));
  const recentFails = outcomes.slice(-windowSize).filter((o) => o.status === "fail").length;
  const earlyFails = outcomes.slice(0, windowSize).filter((o) => o.status === "fail").length;

  let switches = 0;
  for (let i = 1; i < outcomes.length; i++) {
    if (outcomes[i].status !== outcomes[i - 1].status) switches++;
  }
  const switchRate = switches / (totalRuns - 1 || 1);

  if (switchRate >= 0.6) return "alternating";
  if (recentFails / windowSize >= 0.7 && recentFails > earlyFails) return "clustered_recent";
  if (earlyFails / windowSize >= 0.7 && earlyFails > recentFails) return "clustered_early";
  return "scattered";
}

/** Pure, deterministic — the failure rate and pattern are computed here, not guessed by the AI. */
export function computeRunStats(
  outcomes: RunOutcome[],
  source: RunHistoryStats["source"] = "manual"
): RunHistoryStats {
  const totalRuns = outcomes.length;
  const failedRuns = outcomes.filter((o) => o.status === "fail").length;
  const failureRate = totalRuns > 0 ? Math.round((failedRuns / totalRuns) * 100) : 0;

  let longestFailStreak = 0;
  let current = 0;
  for (const o of outcomes) {
    if (o.status === "fail") {
      current++;
      longestFailStreak = Math.max(longestFailStreak, current);
    } else {
      current = 0;
    }
  }

  return {
    totalRuns,
    failedRuns,
    failureRate,
    longestFailStreak,
    pattern: detectPattern(outcomes, failedRuns, totalRuns),
    outcomes,
    source,
  };
}
