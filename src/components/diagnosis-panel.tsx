import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EvidenceList } from "@/components/evidence-list";
import { BeforeAfterDiff } from "@/components/before-after-diff";
import { SignalsAnalyzed, type DiagnosisSignals } from "@/components/signals-analyzed";
import { FAILURE_TYPE_META, FRAMEWORK_BADGE_PARTS, confidenceClassName, riskClassName } from "@/components/failure-meta";
import { FAILURE_TYPE_LABELS, RISK_LEVEL_LABELS, type DiagnosisResult } from "@/lib/types";

interface DiagnosisPanelProps {
  result: DiagnosisResult;
  /** Which optional evidence fields were actually present on the request that produced this
   *  result. Only Single Test wires this — Bulk/Flaky panels simply omit it. */
  signals?: DiagnosisSignals;
}

function confidenceBarColor(confidence: number): string {
  if (confidence >= 80) return "bg-emerald-500";
  if (confidence >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export function DiagnosisPanel({ result, signals }: DiagnosisPanelProps) {
  const meta = FAILURE_TYPE_META[result.failureType];
  const Icon = meta.icon;
  const [fwName, fwVariant] = FRAMEWORK_BADGE_PARTS[result.framework];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${meta.className}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Diagnosis</p>
              <Badge variant="outline" className="text-[10px] uppercase">
                {fwName}
              </Badge>
              <Badge variant="outline" className="text-[10px] uppercase">
                {fwVariant}
              </Badge>
            </div>
            <h2 className="text-lg font-semibold">{FAILURE_TYPE_LABELS[result.failureType]}</h2>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge className={`text-sm font-medium ${confidenceClassName(result.confidence)}`} variant="secondary">
            {result.confidence}% Confidence
          </Badge>
          <Badge className={`text-xs font-medium ${riskClassName(result.risk)}`} variant="secondary">
            {RISK_LEVEL_LABELS[result.risk]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${confidenceBarColor(result.confidence)}`}
              style={{ width: `${result.confidence}%` }}
            />
          </div>
          {signals && (
            <div className="mt-3">
              <h3 className="mb-1.5 text-xs font-semibold text-muted-foreground">Signals Analyzed</h3>
              <SignalsAnalyzed signals={signals} />
            </div>
          )}
        </div>

        <Separator />

        <div>
          <h3 className="mb-1 text-sm font-semibold text-muted-foreground">Root Cause</h3>
          <p className="text-sm leading-relaxed">{result.rootCause}</p>
        </div>

        <Separator />

        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Why We Think This</h3>
          <EvidenceList evidence={result.evidence} />
        </div>

        <Separator />

        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Recommended Fix</h3>
          <BeforeAfterDiff fix={result.fix} framework={result.framework} />
        </div>
      </CardContent>
    </Card>
  );
}
