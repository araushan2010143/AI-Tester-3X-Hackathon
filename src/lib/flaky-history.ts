import type { DiagnosisResult, FlakyHistoryEntry, Framework, RunHistoryStats } from "./types";

const STORAGE_KEY = "tracefix.flaky-history";
const MAX_ENTRIES = 15;

function isBrowser() {
  return typeof window !== "undefined";
}

export function getFlakyHistory(): FlakyHistoryEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addFlakyHistoryEntry(
  framework: Framework,
  testName: string | undefined,
  stats: RunHistoryStats,
  result: DiagnosisResult
): FlakyHistoryEntry {
  const entry: FlakyHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    framework,
    testName,
    stats,
    result,
  };

  if (isBrowser()) {
    const next = [entry, ...getFlakyHistory()].slice(0, MAX_ENTRIES);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage full or unavailable — history is best-effort, ignore.
    }
  }

  return entry;
}

export function clearFlakyHistory(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
