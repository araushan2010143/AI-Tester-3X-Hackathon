import type { RunOutcome } from "@/lib/types";

export function RunTimeline({ outcomes }: { outcomes: RunOutcome[] }) {
  return (
    <div className="flex flex-wrap gap-1" role="img" aria-label="Run-by-run pass/fail timeline">
      {outcomes.map((o, i) => (
        <span
          key={`${o.run}-${i}`}
          title={`${o.run}: ${o.status.toUpperCase()}`}
          className={`h-3 w-3 shrink-0 rounded-sm ${o.status === "pass" ? "bg-emerald-500" : "bg-red-500"}`}
        />
      ))}
    </div>
  );
}
