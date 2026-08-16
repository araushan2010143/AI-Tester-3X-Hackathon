import { Stethoscope } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Stethoscope className="h-6 w-6 text-muted-foreground" />
      </span>
      <div>
        <p className="font-medium">No diagnosis yet</p>
        <p className="text-sm text-muted-foreground">
          Paste a failed test and its CI log above, then hit Diagnose &amp; Fix — or load the demo example.
        </p>
      </div>
    </div>
  );
}
