import { Loader2 } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ClusterRow } from "@/components/cluster-row";
import { SharedDataWarning } from "@/components/shared-data-warning";
import { FAILURE_TYPE_META, confidenceClassName } from "@/components/failure-meta";
import { FAILURE_TYPE_LABELS, type CiProvider, type SharedIdentifierGroup } from "@/lib/types";
import type { ClusterRowState } from "@/lib/bulk-types";

interface BulkResultsProps {
  buildNumber: number;
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

function scrollToRow(value: string) {
  document.getElementById(`cluster-row-${value}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function BulkResults({
  buildNumber,
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
  const primaryIndex = sortedRows.findIndex((r) => r.status === "ok");
  const primary = primaryIndex >= 0 ? sortedRows[primaryIndex] : undefined;
  const primaryShare = primary && totalFailures > 0 ? Math.round((primary.cluster.memberCount / totalFailures) * 100) : 0;
  const primaryMeta = primary && primary.status === "ok" ? FAILURE_TYPE_META[primary.diagnosis.failureType] : undefined;
  const PrimaryIcon = primaryMeta?.icon;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Build #{buildNumber}</p>
              <h2 className="text-lg font-semibold">
                {totalFailures} {totalFailures === 1 ? "failure" : "failures"} → {totalClusters}{" "}
                {totalClusters === 1 ? "root cause" : "root causes"}
              </h2>
            </div>
            {ciProvider && ciProvider !== "unknown" && (
              <Badge variant="outline" className="text-xs">
                {CI_PROVIDER_LABELS[ciProvider]}
              </Badge>
            )}
          </div>
          {streaming && (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Diagnosing {rows.length}/{totalClusters}…
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sharedIdentifiers && sharedIdentifiers.length > 0 && <SharedDataWarning groups={sharedIdentifiers} />}

        {primary && primary.status === "ok" && PrimaryIcon && (
          <div className={`rounded-lg border-2 p-4 ${primaryMeta!.className.includes("red") ? "border-red-500/30" : "border-primary/20"}`}>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-primary">Primary Root Cause</p>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${primaryMeta!.className}`}>
                  <PrimaryIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-base font-semibold">{FAILURE_TYPE_LABELS[primary.diagnosis.failureType]}</p>
                  <p className="text-sm text-muted-foreground">
                    {primary.cluster.memberCount} / {totalFailures} failures · {primaryShare}% of failed tests
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`text-sm font-medium ${confidenceClassName(primary.diagnosis.confidence)}`} variant="secondary">
                  {primary.diagnosis.confidence}% Confidence
                </Badge>
                <Button size="sm" variant="secondary" onClick={() => scrollToRow(`cluster-${primaryIndex}`)}>
                  View details
                </Button>
              </div>
            </div>
          </div>
        )}

        {sortedRows.length > 1 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Root Cause Clusters</h3>
            <div className="overflow-hidden rounded-md border border-border">
              {sortedRows.map((row, i) => {
                const meta = row.status === "ok" ? FAILURE_TYPE_META[row.diagnosis.failureType] : undefined;
                const label =
                  row.status === "ok"
                    ? FAILURE_TYPE_LABELS[row.diagnosis.failureType]
                    : row.status === "error"
                      ? "Diagnosis failed"
                      : "Skipped";
                return (
                  <button
                    key={row.cluster.fingerprint}
                    type="button"
                    onClick={() => scrollToRow(`cluster-${i}`)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50 ${
                      i > 0 ? "border-t border-border" : ""
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta ? meta.dotClassName : "bg-muted-foreground"}`} />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{row.cluster.memberCount}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <Accordion className="gap-0">
          {sortedRows.map((row, i) => (
            <ClusterRow key={row.cluster.fingerprint} state={row} value={`cluster-${i}`} isPrimary={i === primaryIndex} />
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
