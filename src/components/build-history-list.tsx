import { CheckCircle2, XCircle } from "lucide-react";
import type { RunOutcome } from "@/lib/types";

const MAX_SHOWN = 12;

/** Jenkins-style build history: each run in its own labeled row, most recent first. Purely a
 *  different rendering of RunHistoryStats.outcomes (already-real data) — the same array the
 *  dot timeline draws from, no new computation. */
export function BuildHistoryList({ outcomes }: { outcomes: RunOutcome[] }) {
  const reversed = [...outcomes].reverse();
  const shown = reversed.slice(0, MAX_SHOWN);
  const hiddenCount = reversed.length - shown.length;

  return (
    <div>
      <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Build History</h3>
      <div className="overflow-hidden rounded-md border border-border">
        {shown.map((o, i) => (
          <div
            key={`${o.run}-${i}`}
            className={`flex items-center gap-2.5 px-3 py-1.5 text-sm ${i > 0 ? "border-t border-border" : ""}`}
          >
            {o.status === "pass" ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            ) : (
              <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
            )}
            <span className="font-mono text-xs text-muted-foreground">{o.run}</span>
            <span className={`ml-auto text-xs font-semibold ${o.status === "pass" ? "text-emerald-500" : "text-red-500"}`}>
              {o.status === "pass" ? "PASS" : "FAIL"}
            </span>
          </div>
        ))}
      </div>
      {hiddenCount > 0 && (
        <p className="mt-1.5 text-xs text-muted-foreground">+{hiddenCount} earlier run{hiddenCount === 1 ? "" : "s"}</p>
      )}
    </div>
  );
}
