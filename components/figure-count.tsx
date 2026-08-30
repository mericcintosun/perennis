"use client";

// One number inside a sentence, counting up to the value it already has.
//
// The order matters and it is the opposite of the usual recipe. The initial
// state IS the final value, so the server renders the finished number and the
// first client render matches it byte for byte (no hydration mismatch, and a
// full page screenshot taken before any script runs shows the real figure).
// Only after mount, and only when the reader has not asked for reduced motion,
// does the effect rewind to zero and run the count.
//
// .tabular is what stops the sentence reflowing while the digits change: the
// digits are the same width at every step, so the words after the number do not
// move. That class is in app/globals.css.

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function FigureCount({
  value,
  decimals = 0,
  durationMs = 900,
  className,
}: {
  /** The real figure. Read from a fixture by the caller, never written here. */
  value: number;
  decimals?: number;
  durationMs?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(value);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setShown(value);
      return;
    }

    const started = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / durationMs);
      // Ease out cubic, so the last digits settle rather than snap.
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(value * eased);
      if (progress < 1) {
        frame.current = requestAnimationFrame(step);
      }
    };

    frame.current = requestAnimationFrame(step);

    return () => {
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
    };
  }, [value, durationMs]);

  return (
    <span className={cn("tabular", className)}>{shown.toFixed(decimals)}</span>
  );
}
