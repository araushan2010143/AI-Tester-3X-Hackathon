import { CircleDot } from "lucide-react";

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
          <CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
            {item}
          </code>
        </li>
      ))}
    </ul>
  );
}
