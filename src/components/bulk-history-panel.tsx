"use client";

import { useState } from "react";
import { History as HistoryIcon, Trash2, ListTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { clearBulkHistory, getBulkHistory } from "@/lib/bulk-history";
import { FRAMEWORK_LABELS } from "@/lib/types";
import type { BulkHistoryEntry } from "@/lib/bulk-types";

interface BulkHistoryPanelProps {
  onSelect: (entry: BulkHistoryEntry) => void;
}

export function BulkHistoryPanel({ onSelect }: BulkHistoryPanelProps) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<BulkHistoryEntry[]>([]);

  function handleOpenChange(next: boolean) {
    if (next) setEntries(getBulkHistory());
    setOpen(next);
  }

  function handleClear() {
    clearBulkHistory();
    setEntries([]);
  }

  function handleSelect(entry: BulkHistoryEntry) {
    onSelect(entry);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <HistoryIcon className="h-4 w-4" />
            History
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Run History</DialogTitle>
        </DialogHeader>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No past bulk runs yet. Analyze a log and it&apos;ll show up here.
          </p>
        ) : (
          <>
            <ScrollArea className="h-80 pr-3">
              <div className="space-y-2">
                {entries.map((entry) => {
                  const ok = entry.rows.filter((r) => r.status === "ok").length;
                  return (
                    <button
                      key={entry.id}
                      onClick={() => handleSelect(entry)}
                      className="flex w-full items-start gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <ListTree className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">Build #{entry.buildNumber}</p>
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            {ok}/{entry.totalClusters} diagnosed
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {entry.totalFailures} failures → {entry.totalClusters} root causes ·{" "}
                          {FRAMEWORK_LABELS[entry.framework]} · {new Date(entry.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
            <div className="flex justify-end pt-1">
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <Trash2 className="h-3.5 w-3.5" />
                Clear History
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
