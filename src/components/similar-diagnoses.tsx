import { History } from "lucide-react";
import { FAILURE_TYPE_META } from "@/components/failure-meta";
import { FAILURE_TYPE_LABELS, type SimilarDiagnosis } from "@/lib/types";

export function SimilarDiagnoses({ items }: { items: SimilarDiagnosis[] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-4">
      <div className="flex items-start gap-3">
        <History className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium">You&apos;ve seen this before</p>
          <p className="text-xs text-muted-foreground">
            {items.length} past {items.length === 1 ? "diagnosis" : "diagnoses"} in your history share this failure
            type and overlapping evidence. Computed from your local history, not AI-guessed.
          </p>
          <ul className="space-y-1.5">
            {items.map(({ entry, sharedKeywords }) => {
              const meta = FAILURE_TYPE_META[entry.result.failureType];
              const Icon = meta.icon;
              return (
                <li key={entry.id} className="flex items-start gap-2 text-xs">
                  <Icon className={`mt-0.5 h-3 w-3 shrink-0 ${meta.className.split(" ")[0]}`} />
                  <div>
                    <span className="font-medium">{FAILURE_TYPE_LABELS[entry.result.failureType]}</span>
                    <span className="text-muted-foreground"> · {new Date(entry.timestamp).toLocaleDateString()}</span>
                    <div className="text-muted-foreground">
                      shared: {sharedKeywords.slice(0, 4).map((k) => (
                        <code key={k} className="mr-1 rounded bg-muted px-1 py-0.5 font-mono">
                          {k}
                        </code>
                      ))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
