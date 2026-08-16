import type { ParsedFailure, SharedIdentifierGroup } from "./types";

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
/** Explicitly keyed IDs only ("userId=12345", "orderId: 987") — a bare number is too noisy
 *  (port numbers, status codes, line numbers). 3+ digits to skip small fixture IDs like "id: 1". */
const KEYED_ID_RE = /\b(?:id|userId|orderId|accountId|user_id|order_id|account_id)\s*[:=]\s*['"]?(\d{3,})/gi;

interface FoundIdentifier {
  value: string;
  kind: "id" | "email" | "uuid";
}

function extractIdentifiers(text: string): FoundIdentifier[] {
  const found: FoundIdentifier[] = [];
  for (const m of text.matchAll(EMAIL_RE)) found.push({ value: m[0].toLowerCase(), kind: "email" });
  for (const m of text.matchAll(UUID_RE)) found.push({ value: m[0].toLowerCase(), kind: "uuid" });
  for (const m of text.matchAll(KEYED_ID_RE)) found.push({ value: m[1], kind: "id" });
  return found;
}

/**
 * Computed (not AI-guessed) signal for a possible parallel-execution / shared-test-data
 * collision: a concrete identifier (id/email/UUID) that shows up in the failure evidence of
 * 2+ *different* tests. One test repeating its own ID isn't a collision — only cross-test
 * sharing is flagged.
 */
export function detectSharedIdentifiers(failures: ParsedFailure[]): SharedIdentifierGroup[] {
  const byIdentifier = new Map<string, { kind: FoundIdentifier["kind"]; testNames: Set<string> }>();

  for (const failure of failures) {
    for (const { value, kind } of extractIdentifiers(failure.errorSnippet)) {
      const key = `${kind}:${value}`;
      const entry = byIdentifier.get(key) ?? { kind, testNames: new Set<string>() };
      entry.testNames.add(failure.testName);
      byIdentifier.set(key, entry);
    }
  }

  const groups: SharedIdentifierGroup[] = [];
  for (const [key, entry] of byIdentifier) {
    if (entry.testNames.size < 2) continue;
    const identifier = key.slice(entry.kind.length + 1);
    groups.push({ identifier, kind: entry.kind, testNames: [...entry.testNames] });
  }

  return groups.sort((a, b) => b.testNames.length - a.testNames.length);
}
