import { Check } from "lucide-react";

interface EvidenceListProps {
  evidence: string[];
}

export function EvidenceList({ evidence }: EvidenceListProps) {
  if (evidence.length === 0) {
    return <p className="text-sm text-muted-foreground">No specific evidence returned.</p>;
  }

  return (
    <ul className="space-y-2">
      {evidence.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
            {item}
          </code>
        </li>
      ))}
    </ul>
  );
}
