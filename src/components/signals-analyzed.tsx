import { Check, Minus } from "lucide-react";

export interface DiagnosisSignals {
  testCode: boolean;
  ciLog: boolean;
  domSnippet: boolean;
  consoleLog: boolean;
  networkLog: boolean;
  environmentInfo: boolean;
  screenshot: boolean;
  prDiff: boolean;
}

const SIGNAL_LABELS: Record<keyof DiagnosisSignals, string> = {
  testCode: "Test Code",
  ciLog: "CI Log",
  domSnippet: "DOM Snippet",
  consoleLog: "Console Log",
  networkLog: "Network Log",
  environmentInfo: "Environment Info",
  screenshot: "Screenshot",
  prDiff: "PR Diff",
};

/** What the AI actually had in front of it for this diagnosis — a direct reflection of the
 *  real submitted request, not a separate/fabricated "evidence strength" metric. */
export function SignalsAnalyzed({ signals }: { signals: DiagnosisSignals }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {(Object.keys(SIGNAL_LABELS) as (keyof DiagnosisSignals)[]).map((key) => {
        const present = signals[key];
        return (
          <span
            key={key}
            className={`flex items-center gap-1.5 text-xs ${present ? "text-foreground" : "text-muted-foreground/50"}`}
          >
            {present ? (
              <Check className="h-3 w-3 text-emerald-500" strokeWidth={3} />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {SIGNAL_LABELS[key]}
          </span>
        );
      })}
    </div>
  );
}
