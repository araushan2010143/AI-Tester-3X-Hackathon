import { Search, ListTree, Activity, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/empty-state";
import { FailureTypeBreakdown } from "@/components/failure-type-breakdown";
import { riskClassName } from "@/components/failure-meta";
import { RISK_LEVEL_LABELS, type DashboardStats, type RiskLevel } from "@/lib/types";

const ACTIVITY_ICON = { single: Search, bulk: ListTree, flaky: Activity } as const;
const ACTIVITY_LABEL = { single: "Single Test", bulk: "Bulk Log", flaky: "Flaky Test" } as const;

function StatCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        {caption && <p className="text-xs text-muted-foreground">{caption}</p>}
      </CardContent>
    </Card>
  );
}

function RiskBreakdown({ counts }: { counts: Record<RiskLevel, number> }) {
  const total = counts.low + counts.medium + counts.high;
  if (total === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {(["low", "medium", "high"] as RiskLevel[]).map((level) => (
        <Badge key={level} variant="secondary" className={`text-xs font-medium ${riskClassName(level)}`}>
          {RISK_LEVEL_LABELS[level]}: {counts[level]}
        </Badge>
      ))}
    </div>
  );
}

export function DashboardView({ stats, onClearAll }: { stats: DashboardStats; onClearAll: () => void }) {
  const totalDiagnoses = stats.totalSingleDiagnoses + stats.totalBulkClustersDiagnosed + stats.totalFlakyAnalyses;

  if (stats.recentActivity.length === 0) {
    return (
      <EmptyState
        title="No history yet"
        description="Run a diagnosis in Single Test, Bulk Log, or Flaky Test — this dashboard aggregates everything you've analyzed on this device."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Diagnoses" value={String(totalDiagnoses)} />
        <StatCard
          label="Test Health Score"
          value={stats.testHealthScore !== null ? String(stats.testHealthScore) : "—"}
          caption="low risk=100, medium=55, high=10, averaged"
        />
        <StatCard
          label="Flakiness Score"
          value={stats.flakinessScore !== null ? `${stats.flakinessScore}%` : "—"}
          caption={stats.flakinessScore === null ? "Run a Flaky Test analysis" : "avg. failure rate"}
        />
        <StatCard label="Avg Confidence" value={stats.avgConfidence !== null ? `${stats.avgConfidence}%` : "—"} />
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Failure Types Seen</h3>
            <FailureTypeBreakdown counts={stats.failureTypeCounts} />
          </div>

          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Risk Breakdown</h3>
            <RiskBreakdown counts={stats.riskCounts} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">Recent Activity</h3>
            <Button variant="ghost" size="sm" onClick={onClearAll}>
              <Trash2 className="h-3.5 w-3.5" />
              Clear All History
            </Button>
          </div>
          <ul className="space-y-2">
            {stats.recentActivity.map((item) => {
              const Icon = ACTIVITY_ICON[item.kind];
              return (
                <li key={item.id} className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{item.summary}</p>
                      {item.risk && (
                        <Badge variant="secondary" className={`shrink-0 text-xs ${riskClassName(item.risk)}`}>
                          {item.confidence}%
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ACTIVITY_LABEL[item.kind]} · {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
