"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FRAMEWORK_LABELS, type Framework } from "@/lib/types";

interface FrameworkSelectorProps {
  value: Framework;
  onChange: (value: Framework) => void;
}

export function FrameworkSelector({ value, onChange }: FrameworkSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Framework)}>
      <SelectTrigger className="w-[220px]" aria-label="Test framework">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(FRAMEWORK_LABELS) as Framework[]).map((fw) => (
          <SelectItem key={fw} value={fw}>
            {FRAMEWORK_LABELS[fw]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
