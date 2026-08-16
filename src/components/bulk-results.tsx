import { Loader2 } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ClusterRow } from "@/components/cluster-row";
import { FAILURE_TYPE_META } from "@/components/failure-meta";
import { FAILURE_TYPE_LABELS, type FailureType } from "@/lib/types";
import type { ClusterRowState } from "@/lib/bulk-types";

interface BulkResultsProps {
  totalFailures: number;
  totalClusters: number;
  rows: ClusterRowState[];
  streaming: boolean;
}

function FailureTypeBreakdown({ rows }: { rows: ClusterRowState[] }) {
  const counts = new Map<FailureType, number>();
  for (const row of rows) {
    if (row.status !== "ok") continue;
    counts.set(row.diagnosis.failureType, (counts.get(row.diagnosis.failureType) ?? 0) + row.cluster.memberCount);
  }
  if (counts.size === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {[...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([type, count]) => {
          const meta = FAILURE_TYPE_META[type];
          const Icon = meta.icon;
          return (
            <span
              key={type}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${meta.className}`}
            >
              <Icon className="h-3 w-3" />
              {FAILURE_TYPE_LABELS[type]} · {count}
            </span>
          );
        })}
    </div>
  );
}

export function BulkResults({ totalFailures, totalClusters, rows, streaming }: BulkResultsProps) {
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Triage summary</p>
            <h2 className="text-lg font-semibold">
              {totalFailures} {totalFailures === 1 ? "failure" : "failures"} → {totalClusters}{" "}
              {totalClusters === 1 ? "root cause" : "root causes"}
            </h2>
          </div>
          {streaming && (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Diagnosing {rows.length}/{totalClusters}…
            </span>
          )}
        </div>
        <FailureTypeBreakdown rows={rows} />
      </CardHeader>
      <CardContent>
        <Accordion className="gap-0">
          {rows.map((row, i) => (
            <ClusterRow key={row.cluster.fingerprint} state={row} value={`cluster-${i}`} />
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
