import { Check } from "lucide-react";
import type { RunHistoryStats } from "@/lib/types";

/** Real, derivable-only signals — every line here is a direct fact of the already-computed
 *  RunHistoryStats (run-history.ts), never an invented detection heuristic. */
function deriveSignals(stats: RunHistoryStats): string[] {
  const signals: string[] = [];

  if (stats.source === "retry-log") {
    signals.push("Detected directly from CI retry attempts, not manually entered");
  }

  switch (stats.pattern) {
    case "alternating":
      signals.push("Alternating pass/fail — not tied to a specific run");
      break;
    case "clustered_recent":
      signals.push("Failures concentrated in the most recent runs");
      break;
    case "clustered_early":
      signals.push("Failures concentrated in earlier runs — may already be improving");
      break;
    case "always_failing":
      signals.push("Failing on every run — likely a real regression, not flakiness");
      break;
  }

  if (stats.failedRuns > 0 && stats.longestFailStreak <= 1) {
    signals.push("No sustained failure streak — isolated, intermittent failures");
  } else if (stats.longestFailStreak > 1) {
    signals.push(`Can fail up to ${stats.longestFailStreak} runs in a row`);
  }

  return signals;
}

export function FlakinessSignals({ stats }: { stats: RunHistoryStats }) {
  const signals = deriveSignals(stats);
  if (signals.length === 0) return null;

  return (
    <div>
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Flakiness Signals
      </h3>
      <ul className="space-y-1.5">
        {signals.map((signal) => (
          <li key={signal} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
            {signal}
          </li>
        ))}
      </ul>
    </div>
  );
}
