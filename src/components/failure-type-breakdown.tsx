import { FAILURE_TYPE_META } from "@/components/failure-meta";
import { FAILURE_TYPE_LABELS, type FailureType } from "@/lib/types";

export function FailureTypeBreakdown({ counts }: { counts: Partial<Record<FailureType, number>> }) {
  const entries = Object.entries(counts) as [FailureType, number][];
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {entries
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
