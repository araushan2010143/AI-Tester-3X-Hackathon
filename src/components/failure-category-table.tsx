import { FAILURE_TYPE_META } from "@/components/failure-meta";
import { FAILURE_TYPE_LABELS, type FailureType } from "@/lib/types";

interface FailureCategoryTableProps {
  counts: Partial<Record<FailureType, number>>;
  activeType: FailureType | null;
  onSelect: (type: FailureType | null) => void;
}

/** Dashboard-only clickable variant of failure-type-breakdown.tsx's pills — a real row-based
 *  table (label · count · % of total) that filters Recent Activity below when clicked. */
export function FailureCategoryTable({ counts, activeType, onSelect }: FailureCategoryTableProps) {
  const entries = (Object.entries(counts) as [FailureType, number][]).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="overflow-hidden rounded-md border border-border">
      {entries.map(([type, count], i) => {
        const meta = FAILURE_TYPE_META[type];
        const Icon = meta.icon;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        const active = activeType === type;

        return (
          <button
            key={type}
            type="button"
            onClick={() => onSelect(active ? null : type)}
            className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
              i > 0 ? "border-t border-border" : ""
            } ${active ? "bg-accent" : "hover:bg-accent/70"}`}
          >
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${meta.className}`}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{FAILURE_TYPE_LABELS[type]}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{pct}%</span>
            <span className="w-8 shrink-0 text-right font-semibold tabular-nums">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
