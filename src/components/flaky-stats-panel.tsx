import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RunTimeline } from "@/components/run-timeline";
import { RUN_PATTERN_LABELS, type RunHistoryStats } from "@/lib/types";

function rateClassName(rate: number): string {
  if (rate >= 50) return "text-red-500 bg-red-500/10";
  if (rate >= 15) return "text-amber-500 bg-amber-500/10";
  return "text-emerald-500 bg-emerald-500/10";
}

export function FlakyStatsPanel({ stats }: { stats: RunHistoryStats }) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Computed from run history — not AI-guessed
          </p>
          <h2 className="text-lg font-semibold">
            {stats.failedRuns} of {stats.totalRuns} runs failed
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`text-sm font-medium ${rateClassName(stats.failureRate)}`} variant="secondary">
            {stats.failureRate}% failure rate
          </Badge>
          <Badge variant="secondary" className="text-sm font-medium">
            Longest fail streak: {stats.longestFailStreak}
          </Badge>
          <Badge variant="outline" className="text-sm font-medium">
            {RUN_PATTERN_LABELS[stats.pattern]}
          </Badge>
        </div>
        <RunTimeline outcomes={stats.outcomes} />
      </CardContent>
    </Card>
  );
}
