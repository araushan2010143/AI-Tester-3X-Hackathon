import type { RunOutcome } from "@/lib/types";

export function RunTimeline({ outcomes }: { outcomes: RunOutcome[] }) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5" role="img" aria-label="Run-by-run pass/fail timeline">
        {outcomes.map((o, i) => (
          <span
            key={`${o.run}-${i}`}
            title={`${o.run}: ${o.status.toUpperCase()}`}
            className={`h-3.5 w-3.5 shrink-0 rounded-full ${o.status === "pass" ? "bg-emerald-500" : "bg-red-500"}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Pass
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500" /> Fail
        </span>
        <span>· {outcomes.length} recent runs</span>
      </div>
    </div>
  );
}
