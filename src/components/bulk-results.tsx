import { Loader2 } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ClusterRow } from "@/components/cluster-row";
import { SharedDataWarning } from "@/components/shared-data-warning";
import { FailureTypeBreakdown } from "@/components/failure-type-breakdown";
import type { CiProvider, FailureType, SharedIdentifierGroup } from "@/lib/types";
import type { ClusterRowState } from "@/lib/bulk-types";

interface BulkResultsProps {
  totalFailures: number;
  totalClusters: number;
  rows: ClusterRowState[];
  streaming: boolean;
  ciProvider?: CiProvider;
  sharedIdentifiers?: SharedIdentifierGroup[];
}

const CI_PROVIDER_LABELS: Record<Exclude<CiProvider, "unknown">, string> = {
  "github-actions": "GitHub Actions",
  jenkins: "Jenkins",
};

function countsFromRows(rows: ClusterRowState[]): Partial<Record<FailureType, number>> {
  const counts: Partial<Record<FailureType, number>> = {};
  for (const row of rows) {
    if (row.status !== "ok") continue;
    counts[row.diagnosis.failureType] = (counts[row.diagnosis.failureType] ?? 0) + row.cluster.memberCount;
  }
  return counts;
}

export function BulkResults({
  totalFailures,
  totalClusters,
  rows,
  streaming,
  ciProvider,
  sharedIdentifiers,
}: BulkResultsProps) {
  // Rows arrive in stream-completion order, not size order — sort a display copy so the
  // biggest (most impactful) root cause always surfaces first, and can be called out as primary.
  const sortedRows = [...rows].sort((a, b) => b.cluster.memberCount - a.cluster.memberCount);
  const primary = sortedRows.find((r) => r.status === "ok");
  const primaryShare = primary && totalFailures > 0 ? Math.round((primary.cluster.memberCount / totalFailures) * 100) : 0;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Triage summary{ciProvider && ciProvider !== "unknown" ? ` · Detected: ${CI_PROVIDER_LABELS[ciProvider]} log` : ""}
            </p>
            <h2 className="text-lg font-semibold">
              {totalFailures} {totalFailures === 1 ? "failure" : "failures"} → {totalClusters}{" "}
              {totalClusters === 1 ? "root cause" : "root causes"}
            </h2>
            {primary && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                Primary cause accounts for {primary.cluster.memberCount} of {totalFailures} failures ({primaryShare}%)
              </p>
            )}
          </div>
          {streaming && (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Diagnosing {rows.length}/{totalClusters}…
            </span>
          )}
        </div>
        <FailureTypeBreakdown counts={countsFromRows(rows)} />
      </CardHeader>
      <CardContent className="space-y-4">
        {sharedIdentifiers && sharedIdentifiers.length > 0 && <SharedDataWarning groups={sharedIdentifiers} />}
        <Accordion className="gap-0">
          {sortedRows.map((row, i) => (
            <ClusterRow
              key={row.cluster.fingerprint}
              state={row}
              value={`cluster-${i}`}
              isPrimary={row === primary}
            />
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
