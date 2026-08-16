"use client";

import { useState } from "react";
import { Search, ListTree, Activity, Trash2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/empty-state";
import { FailureCategoryTable } from "@/components/failure-category-table";
import { riskClassName } from "@/components/failure-meta";
import {
  FAILURE_TYPE_LABELS,
  FRAMEWORK_LABELS,
  RISK_LEVEL_LABELS,
  type DashboardStats,
  type FailureType,
  type RiskLevel,
} from "@/lib/types";

const ACTIVITY_ICON = { single: Search, bulk: ListTree, flaky: Activity } as const;
const ACTIVITY_LABEL = { single: "Single Test", bulk: "Bulk Log", flaky: "Flaky Test" } as const;

function healthStatus(score: number): { label: string; className: string } {
  if (score >= 70) return { label: "Healthy", className: "text-emerald-500 bg-emerald-500/10" };
  if (score >= 40) return { label: "Needs attention", className: "text-amber-500 bg-amber-500/10" };
  return { label: "Critical", className: "text-red-500 bg-red-500/10" };
}

function flakinessStatus(score: number): { label: string; className: string } {
  if (score < 15) return { label: "Stable", className: "text-emerald-500 bg-emerald-500/10" };
  if (score < 40) return { label: "Some flakiness", className: "text-amber-500 bg-amber-500/10" };
  return { label: "Highly flaky", className: "text-red-500 bg-red-500/10" };
}

function StatCard({
  label,
  value,
  caption,
  status,
}: {
  label: string;
  value: string;
  caption?: string;
  status?: { label: string; className: string };
}) {
  return (
    <Card>
      <CardContent className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold tabular-nums">{value}</p>
          {status && (
            <Badge variant="secondary" className={`text-[11px] font-medium ${status.className}`}>
              {status.label}
            </Badge>
          )}
        </div>
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

export function DashboardView({
  stats,
  onClearAll,
  onSelectActivity,
}: {
  stats: DashboardStats;
  onClearAll: () => void;
  onSelectActivity: (item: DashboardStats["recentActivity"][number]) => void;
}) {
  const [activeFilter, setActiveFilter] = useState<FailureType | null>(null);
  const totalDiagnoses = stats.totalSingleDiagnoses + stats.totalBulkClustersDiagnosed + stats.totalFlakyAnalyses;

  if (stats.recentActivity.length === 0) {
    return (
      <EmptyState
        title="No history yet"
        description="Run a diagnosis in Single Test, Bulk Log, or Flaky Test — this dashboard aggregates everything you've analyzed on this device."
      />
    );
  }

  const visibleActivity = activeFilter
    ? stats.recentActivity.filter((item) => item.failureType === activeFilter)
    : stats.recentActivity;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Diagnoses" value={String(totalDiagnoses)} />
        <StatCard
          label="Test Health Score"
          value={stats.testHealthScore !== null ? String(stats.testHealthScore) : "—"}
          caption="low risk=100, medium=55, high=10, averaged"
          status={stats.testHealthScore !== null ? healthStatus(stats.testHealthScore) : undefined}
        />
        <StatCard
          label="Flakiness Score"
          value={stats.flakinessScore !== null ? `${stats.flakinessScore}%` : "—"}
          caption={stats.flakinessScore === null ? "Run a Flaky Test analysis" : "avg. failure rate"}
          status={stats.flakinessScore !== null ? flakinessStatus(stats.flakinessScore) : undefined}
        />
        <StatCard label="Avg Confidence" value={stats.avgConfidence !== null ? `${stats.avgConfidence}%` : "—"} />
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">Failure Categories</h3>
              {activeFilter && (
                <Button variant="ghost" size="sm" onClick={() => setActiveFilter(null)}>
                  <X className="h-3.5 w-3.5" />
                  Clear filter
                </Button>
              )}
            </div>
            <FailureCategoryTable counts={stats.failureTypeCounts} activeType={activeFilter} onSelect={setActiveFilter} />
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
            <h3 className="text-sm font-semibold text-muted-foreground">
              Recent Activity
              {activeFilter && (
                <span className="ml-1.5 font-normal text-muted-foreground/70">
                  · filtered to {FAILURE_TYPE_LABELS[activeFilter]}
                </span>
              )}
            </h3>
            <Button variant="ghost" size="sm" onClick={onClearAll}>
              <Trash2 className="h-3.5 w-3.5" />
              Clear All History
            </Button>
          </div>
          {visibleActivity.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No entries match this filter.</p>
          ) : (
            <ul className="space-y-2">
              {visibleActivity.map((item) => {
                const Icon = ACTIVITY_ICON[item.kind];
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelectActivity(item)}
                      className="flex w-full items-start gap-3 rounded-lg border border-border p-3 text-left text-sm transition-colors hover:bg-accent hover:cursor-pointer"
                    >
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
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {ACTIVITY_LABEL[item.kind]}
                          <Badge variant="outline" className="text-[10px]">
                            {FRAMEWORK_LABELS[item.framework]}
                          </Badge>
                          · {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
