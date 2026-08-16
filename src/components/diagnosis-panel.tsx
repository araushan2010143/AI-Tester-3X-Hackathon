import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EvidenceList } from "@/components/evidence-list";
import { BeforeAfterDiff } from "@/components/before-after-diff";
import { FAILURE_TYPE_META, confidenceClassName } from "@/components/failure-meta";
import { FAILURE_TYPE_LABELS, type DiagnosisResult } from "@/lib/types";

interface DiagnosisPanelProps {
  result: DiagnosisResult;
}

export function DiagnosisPanel({ result }: DiagnosisPanelProps) {
  const meta = FAILURE_TYPE_META[result.failureType];
  const Icon = meta.icon;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${meta.className}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Diagnosis</p>
            <h2 className="text-lg font-semibold">{FAILURE_TYPE_LABELS[result.failureType]}</h2>
          </div>
        </div>
        <Badge className={`text-sm font-medium ${confidenceClassName(result.confidence)}`} variant="secondary">
          {result.confidence}% Confidence
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="mb-1 text-sm font-semibold text-muted-foreground">Root Cause</h3>
          <p className="text-sm leading-relaxed">{result.rootCause}</p>
        </div>

        <Separator />

        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Evidence</h3>
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
