"use client";

// A copy control that says "Copied" in words. Named for what it does: it puts
// an address or a path on the clipboard.
//
// Two decisions worth keeping. First, the confirmation is text and not only an
// icon swap: an icon that changes shape says nothing to a screen reader and
// almost nothing to a person who was not watching that corner of the screen.
// The live region announces the same word.
//
// Second, it fails silently. navigator.clipboard is undefined on an insecure
// origin and writeText can reject when the document is not focused. Neither is
// worth an error state on a landing page, so a failed copy simply leaves the
// label alone and the value stays visible next to the control for a manual
// select.
//
// The label is a word, not an address, so it is set in the text face. The data
// face is reserved for the value itself, which is rendered by the caller.

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AddressCopy({
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
      // is on screen beside this control, so there is nothing to recover from.
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={copy}
      aria-label={copied ? `Copied ${value}` : `${label} ${value}`}
      className={cn(className)}
    >
      <span aria-hidden>{copied ? "Copied" : label}</span>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </Button>
  );
}
