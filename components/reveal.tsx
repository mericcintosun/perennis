"use client";

// Scroll reveal, one element at a time.
//
// The children are rendered in the server HTML either way: this wrapper adds a
// class, it never gates what is in the markup. So a crawler, a reader mode and a
// browser with JavaScript off all see the full text of every section it wraps.
//
// It observes once, adds .reveal-in on the first intersection and calls
// disconnect(). There is no scroll listener and no per frame work, which is what
// keeps the landing page's Lighthouse performance number where it is.
//
// The reduced motion guard is in app/globals.css, not here: under
// prefers-reduced-motion: reduce both .reveal and .reveal-in are fully visible
// and still, so this component becomes a no-op that costs one class name.

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Reveal({
  children,
  className,
  delay = "0ms",
}: {
  children: ReactNode;
  className?: string;
  /** Stagger, written straight into --delay. Example: "160ms". */
  delay?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // No observer (a very old browser, or a test environment). Show it now
    // rather than leaving a section that never fades in.
    if (typeof IntersectionObserver === "undefined") {
      node.classList.add("reveal-in");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          node.classList.add("reveal-in");
          observer.disconnect();
        }
      },
      { threshold: 0.06, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("reveal", className)}
      style={{ "--delay": delay } as CSSProperties}
    >
      {children}
    </div>
  );
}
