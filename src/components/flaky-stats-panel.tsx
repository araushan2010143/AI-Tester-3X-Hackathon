import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RunTimeline } from "@/components/run-timeline";
import { FlakinessSignals } from "@/components/flakiness-signals";
import { RUN_PATTERN_LABELS, type RunHistoryStats } from "@/lib/types";

function rateClassName(rate: number): string {
  if (rate >= 50) return "text-red-500";
  if (rate >= 15) return "text-amber-500";
  return "text-emerald-500";
}

function StatCell({
  label,
  value,
  valueClassName,
  small,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  small?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`font-bold tabular-nums ${small ? "text-sm leading-snug" : "text-xl"} ${valueClassName ?? ""}`}>
        {value}
      </p>
    </div>
  );
}

export function FlakyStatsPanel({ stats }: { stats: RunHistoryStats }) {
  const passRate = 100 - stats.failureRate;

  return (
    <Card>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {stats.source === "retry-log"
              ? `Detected ${stats.totalRuns} retry attempts directly from your CI log — not AI-guessed`
              : "Computed from run history — not AI-guessed"}
          </p>
          <h2 className="text-lg font-semibold">
            {stats.failedRuns} of {stats.totalRuns} {stats.source === "retry-log" ? "attempts" : "runs"} failed
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCell label="Failure Rate" value={`${stats.failureRate}%`} valueClassName={rateClassName(stats.failureRate)} />
          <StatCell label="Pass Rate" value={`${passRate}%`} valueClassName="text-emerald-500" />
          <StatCell label="Longest Streak" value={String(stats.longestFailStreak)} />
          <StatCell label="Pattern" value={RUN_PATTERN_LABELS[stats.pattern]} small />
        </div>

        <RunTimeline outcomes={stats.outcomes} />

        <Separator />

        <FlakinessSignals stats={stats} />
      </CardContent>
    </Card>
  );
}
