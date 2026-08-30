"use client";

// A copy control that says "Copied" in words.
//
// Two decisions worth keeping. First, the confirmation is text and not only an
// icon swap: an icon that changes shape says nothing to a screen reader and
// almost nothing to a person who was not watching that corner of the screen.
// The live region announces the same word.
//
// Second, it fails silently. navigator.clipboard is undefined on an insecure
// origin and writeText can reject when the document is not focused. Neither is
// worth an error state on a landing page, so a failed copy simply leaves the
// label alone and the value stays visible next to the chip for a manual select.

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyChip({
  value,
  label = "Copy",
  className,
}: {
  /** The exact string written to the clipboard. */
  value: string;
  /** Resting label. The copied state always reads "Copied". */
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard) return;
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Insecure origin, denied permission, or an unfocused document. The value
      // is on screen beside this chip, so there is nothing to recover from.
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copy}
      aria-label={copied ? `Copied ${value}` : `${label} ${value}`}
      className={cn("font-mono", className)}
    >
      <span aria-hidden>{copied ? "Copied" : label}</span>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </Button>
  );
}
