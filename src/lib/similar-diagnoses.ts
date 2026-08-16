import type { DiagnosisResult, HistoryEntry, SimilarDiagnosis } from "./types";

/** 6+ char word tokens (keeps dots/dashes/underscores so selectors like "btn-debug" survive intact). */
const KEYWORD_RE = /[a-z][a-z0-9._-]{5,}/g;

function extractKeywords(result: DiagnosisResult): Set<string> {
  const text = `${result.rootCause} ${result.evidence.join(" ")}`.toLowerCase();
  return new Set(text.match(KEYWORD_RE) ?? []);
}

/**
 * Computed correlation against your own local history — not a trained model, just literal
 * keyword overlap within the same failure category. Same-category diagnoses that also share
 * concrete text (a selector, an error phrase) surface as "you've seen this before".
 */
export function findSimilarDiagnoses(
  current: DiagnosisResult,
  history: HistoryEntry[],
  limit = 3
): SimilarDiagnosis[] {
  const currentKeywords = extractKeywords(current);
  if (currentKeywords.size === 0) return [];

  const scored = history
    .filter((entry) => entry.result.failureType === current.failureType)
    .map((entry) => {
      const keywords = extractKeywords(entry.result);
      const sharedKeywords = [...currentKeywords].filter((k) => keywords.has(k));
      return { entry, sharedKeywords };
    })
    .filter((s) => s.sharedKeywords.length > 0)
    .sort((a, b) => b.sharedKeywords.length - a.sharedKeywords.length)
    .slice(0, limit);

  return scored;
}
