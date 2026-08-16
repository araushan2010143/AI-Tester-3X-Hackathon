import type { ReactNode } from "react";
import { AlertTriangle, MinusCircle } from "lucide-react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { DiagnosisPanel } from "@/components/diagnosis-panel";
import { FAILURE_TYPE_META, confidenceClassName } from "@/components/failure-meta";
import { FAILURE_TYPE_LABELS, type DiagnosisResult, type FailureCluster } from "@/lib/types";
import type { ClusterRowState } from "@/lib/bulk-types";

function TestNamesPreview({ cluster }: { cluster: FailureCluster }) {
  const shown = cluster.testNames.slice(0, 3);
  const more = cluster.testNames.length - shown.length;
  return (
    <p className="truncate text-xs text-muted-foreground">
      {shown.join(", ")}
      {more > 0 ? ` +${more} more` : ""}
    </p>
  );
}

function RowHeader({
  cluster,
  icon,
  iconClassName,
  title,
  eyebrow,
  trailing,
}: {
  cluster: FailureCluster;
  icon: ReactNode;
  iconClassName: string;
  title: string;
  eyebrow?: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex w-full items-center gap-3 text-left">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${iconClassName}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
        )}
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{title}</p>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {cluster.memberCount} {cluster.memberCount === 1 ? "test" : "tests"}
          </Badge>
        </div>
        <TestNamesPreview cluster={cluster} />
      </div>
      {trailing}
    </div>
  );
}

export function ClusterRow({
  state,
  value,
  isPrimary,
}: {
  state: ClusterRowState;
  value: string;
  isPrimary?: boolean;
}) {
  if (state.status === "ok") {
    const diagnosis: DiagnosisResult = state.diagnosis;
    const meta = FAILURE_TYPE_META[diagnosis.failureType];
    const Icon = meta.icon;

    return (
      <AccordionItem value={value}>
        <AccordionTrigger>
          <RowHeader
            cluster={state.cluster}
            icon={<Icon className="h-4 w-4" />}
            iconClassName={meta.className}
            title={FAILURE_TYPE_LABELS[diagnosis.failureType]}
            eyebrow={isPrimary ? "Primary root cause" : undefined}
            trailing={
              <Badge className={`mr-2 shrink-0 text-xs ${confidenceClassName(diagnosis.confidence)}`} variant="secondary">
                {diagnosis.confidence}%
              </Badge>
            }
          />
        </AccordionTrigger>
        <AccordionContent>
          <DiagnosisPanel result={diagnosis} />
        </AccordionContent>
      </AccordionItem>
    );
  }

  if (state.status === "error") {
    return (
      <AccordionItem value={value}>
        <AccordionTrigger>
          <RowHeader
            cluster={state.cluster}
            icon={<AlertTriangle className="h-4 w-4" />}
            iconClassName="text-red-500 bg-red-500/10"
            title="Diagnosis failed for this group"
          />
        </AccordionTrigger>
        <AccordionContent>
          <p className="text-sm text-red-500">{state.error}</p>
        </AccordionContent>
      </AccordionItem>
    );
  }

  return (
    <AccordionItem value={value}>
      <AccordionTrigger disabled>
        <RowHeader
          cluster={state.cluster}
          icon={<MinusCircle className="h-4 w-4" />}
          iconClassName="text-muted-foreground bg-muted"
          title="Skipped (over analysis limit)"
        />
      </AccordionTrigger>
      <AccordionContent>
        <p className="text-sm text-muted-foreground">
          This group was below the cut-off for this run. Re-run with a trimmed log to include it.
        </p>
      </AccordionContent>
    </AccordionItem>
  );
}
