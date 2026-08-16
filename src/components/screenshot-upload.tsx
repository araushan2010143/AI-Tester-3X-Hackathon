"use client";

import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const MAX_FILE_BYTES = 4 * 1024 * 1024; // ~4MB, matches the server-side base64 cap with headroom

interface ScreenshotUploadProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

export function ScreenshotUpload({ value, onChange }: ScreenshotUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please attach an image file (PNG, JPEG, or WebP).");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Screenshot is too large — please attach something under 4MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.onerror = () => toast.error("Couldn't read that file. Try again.");
    reader.readAsDataURL(file);
  }

  if (value) {
    return (
      <div className="relative inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element -- local data: URL preview, not a served asset */}
        <img
          src={value}
          alt="Failure screenshot preview"
          className="max-h-32 rounded-lg border border-border object-contain"
        />
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          className="absolute -right-2 -top-2 rounded-full shadow"
          onClick={() => onChange(null)}
          aria-label="Remove screenshot"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        <ImagePlus className="h-4 w-4" />
        Attach Screenshot
      </Button>
    </>
  );
}
