import type { RunOutcome } from "./types";
import { FAIL_RE, PASS_RE } from "./run-history";

/** "Attempt 1", "attempt 1/3", "Retry #2", "(retry #1)" — Playwright's own retry-labeled titles included. */
const ATTEMPT_MARKER_RE = /\b(?:attempt|retry)\s*#?\s*(\d+)(?:\s*(?:of|\/)\s*\d+)?\b/gi;
const LOOKS_LIKE_FAILURE_RE = /error|exception|fail|timeout/i;

function blockStatus(content: string): "pass" | "fail" {
  const hasFail = FAIL_RE.test(content);
  const hasPass = PASS_RE.test(content);
  // Both, neither, or only a failure signal all read as "fail" — these blocks came from a
  // failure-labeled attempt by construction, so ambiguity should lean conservative.
  if (hasPass && !hasFail) return "pass";
  return "fail";
}

/**
 * Best-effort extraction of retry-attempt outcomes from a raw CI log — the same honesty
 * posture as the Selenium parser in log-parser.ts: handles common "Attempt N" / "Retry #N"
 * conventions (including Playwright's own retry-labeled test titles), not every framework's
 * exact retry reporting format.
 */
export function parseRetryAttempts(text: string): RunOutcome[] {
  const matches = [...text.matchAll(ATTEMPT_MARKER_RE)];
  if (matches.length === 0) return [];

  const blocks: { label: string; start: number; end: number }[] = [];

  // The first try is often unlabeled — only retries get called out explicitly. If there's
  // failure-looking content before the first marker, count it as an implicit Attempt 1.
  const preambleEnd = matches[0].index!;
  if (preambleEnd > 0 && LOOKS_LIKE_FAILURE_RE.test(text.slice(0, preambleEnd))) {
    blocks.push({ label: "Attempt 1", start: 0, end: preambleEnd });
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index!;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    blocks.push({ label: `Attempt ${matches[i][1]}`, start, end });
  }

  return blocks.map((b) => ({
    run: b.label,
    status: blockStatus(text.slice(b.start, b.end)),
  }));
}
