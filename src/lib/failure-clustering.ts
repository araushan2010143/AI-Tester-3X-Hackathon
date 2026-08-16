import type { FailureCluster, ParsedFailure } from "./types";

/** First exception/error-type-looking token in the snippet, e.g. `TimeoutError`, `NoSuchElementException`. */
const ERROR_TYPE = /\b([A-Za-z][A-Za-z0-9.]*?(?:Error|Exception|Timeout))\b/;

function extractErrorType(snippet: string): string {
  const match = snippet.match(ERROR_TYPE);
  return match ? match[1] : "UnknownError";
}

/** Stack-frame lines ("at file:line:col" / Java "at Class.method(File.java:N)") are per-call-site
 *  noise, not part of the failure signature — every test lives at a different location even when
 *  the actual root cause is identical, so these must be stripped before fingerprinting. */
function stripLocationNoise(snippet: string): string {
  return snippet
    .split("\n")
    .filter((line) => !/^\s*at\s+\S/.test(line))
    .join("\n");
}

/**
 * Normalizes a failure snippet into a fingerprint-safe string: strips volatile
 * noise (digits, timeouts, hex/UUIDs, timestamps, stack-frame locations) but
 * keeps selector/identifier text intact, since two different broken selectors
 * are two different root causes even when the error type matches.
 */
function normalizeMessage(snippet: string): string {
  return stripLocationNoise(snippet)
    .slice(0, 500)
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "<uuid>") // UUIDs
    .replace(/\b0x[0-9a-f]+\b/gi, "<hex>")
    .replace(/\b\d+ms\b/gi, "<ms>")
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "<ip>")
    .replace(/\b\d+\b/g, "#") // remaining bare numbers (line numbers, ports, timeouts, counts)
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function fingerprint(failure: ParsedFailure): string {
  return `${extractErrorType(failure.errorSnippet)}::${normalizeMessage(failure.errorSnippet)}`;
}

export function clusterFailures(failures: ParsedFailure[]): FailureCluster[] {
  const groups = new Map<string, ParsedFailure[]>();

  for (const failure of failures) {
    const key = fingerprint(failure);
    const group = groups.get(key);
    if (group) group.push(failure);
    else groups.set(key, [failure]);
  }

  const clusters: FailureCluster[] = [];
  for (const [key, members] of groups) {
    clusters.push({
      fingerprint: key,
      memberCount: members.length,
      testNames: members.map((m) => m.testName),
      representative: members[0],
    });
  }

  // Largest clusters (most affected tests) first — that's where the triage value is.
  return clusters.sort((a, b) => b.memberCount - a.memberCount);
}
