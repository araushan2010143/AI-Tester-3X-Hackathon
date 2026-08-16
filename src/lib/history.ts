import type { DiagnoseRequest, DiagnosisResult, HistoryEntry } from "./types";

const STORAGE_KEY = "tracefix.history";
const MAX_ENTRIES = 20;

function isBrowser() {
  return typeof window !== "undefined";
}

export function getHistory(): HistoryEntry[] {
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

export function addHistoryEntry(
  request: DiagnoseRequest,
  result: DiagnosisResult
): HistoryEntry {
  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    request,
    result,
  };

  if (isBrowser()) {
    const next = [entry, ...getHistory()].slice(0, MAX_ENTRIES);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage full or unavailable — history is best-effort, ignore.
    }
  }

  return entry;
}

export function clearHistory(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
