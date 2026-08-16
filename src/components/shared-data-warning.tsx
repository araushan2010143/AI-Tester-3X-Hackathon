import { AlertTriangle } from "lucide-react";
import type { SharedIdentifierGroup } from "@/lib/types";

const KIND_LABEL: Record<SharedIdentifierGroup["kind"], string> = {
  id: "ID",
  email: "email",
  uuid: "UUID",
};

export function SharedDataWarning({ groups }: { groups: SharedIdentifierGroup[] }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <div className="space-y-2">
          <p className="text-sm font-medium">Possible shared test-data collision</p>
          <p className="text-xs text-muted-foreground">
            These tests reference the exact same identifier in their failure evidence. If they ran in
            parallel, one may have modified or deleted data the other depended on — worth checking
            before assuming each is an independent bug. Computed from the log text, not AI-guessed.
          </p>
          <ul className="space-y-1.5">
            {groups.map((g) => (
              <li key={`${g.kind}-${g.identifier}`} className="text-xs">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono">{g.identifier}</code>
                <span className="text-muted-foreground">
                  {" "}
                  ({KIND_LABEL[g.kind]}) shared by {g.testNames.length} tests:{" "}
                </span>
                <span className="text-muted-foreground">{g.testNames.join(", ")}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
