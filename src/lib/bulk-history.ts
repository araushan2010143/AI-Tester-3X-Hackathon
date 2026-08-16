import type { Framework } from "./types";
import type { BulkHistoryEntry, ClusterRowState } from "./bulk-types";

const STORAGE_KEY = "tracefix.bulk-history";
// Bulk entries carry N cluster diagnoses each — keep the cap smaller than
// single-test history so localStorage doesn't balloon.
const MAX_ENTRIES = 5;

function isBrowser() {
  return typeof window !== "undefined";
}

export function getBulkHistory(): BulkHistoryEntry[] {
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

export function addBulkHistoryEntry(
  framework: Framework,
  totalFailures: number,
  totalClusters: number,
  rows: ClusterRowState[]
): BulkHistoryEntry {
  const entry: BulkHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    framework,
    totalFailures,
    totalClusters,
    rows,
  };

  if (isBrowser()) {
    const next = [entry, ...getBulkHistory()].slice(0, MAX_ENTRIES);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage full or unavailable — history is best-effort, ignore.
    }
  }

  return entry;
}

export function clearBulkHistory(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
