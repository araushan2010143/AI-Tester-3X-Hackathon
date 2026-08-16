import type { Framework } from "./types";
import type { BulkHistoryEntry, ClusterRowState } from "./bulk-types";

const STORAGE_KEY = "tracefix.bulk-history";
const BUILD_COUNTER_KEY = "tracefix.bulk-build-counter";
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

/**
 * A monotonically-increasing counter, stored separately from the capped entries array so it
 * keeps climbing even after old entries are evicted (or history is cleared) — the same way a
 * real CI system's build number never goes backward just because old builds were pruned.
 */
export function getNextBuildNumber(): number {
  if (!isBrowser()) return 1;
  try {
    const raw = window.localStorage.getItem(BUILD_COUNTER_KEY);
    const next = (raw ? parseInt(raw, 10) || 0 : 0) + 1;
    window.localStorage.setItem(BUILD_COUNTER_KEY, String(next));
    return next;
  } catch {
    return 1;
  }
}

export function addBulkHistoryEntry(
  framework: Framework,
  buildNumber: number,
  totalFailures: number,
  totalClusters: number,
  rows: ClusterRowState[]
): BulkHistoryEntry {
  const entry: BulkHistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    buildNumber,
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
    // Deliberately not clearing BUILD_COUNTER_KEY — build numbers shouldn't go backward just
    // because the visible history list was cleared, same as a real CI system.
  } catch {
    // ignore
  }
}
