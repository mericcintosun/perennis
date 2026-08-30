// The Perennis brand set, hand authored as inline SVG.
//
// Phase 9 asked for five brand rasters from a Meshy generation tool. There is no
// such tool on this machine and public/ is on the never touch list in CLAUDE.md,
// so the set ships as React components instead. That substitution is recorded in
// HANDOFF.md section 13.
//
// One visual family, held by four rules every mark below obeys:
//
//   1. a 48 by 48 viewBox, so any two of them line up at any rendered size
//   2. stroke width 2, round caps and round joins
//   3. corner radius 1 on every rectangle, matching RADIUS in IDENTITY.md
//   4. no fill and no color of its own: strokes are currentColor, so the mark
//      takes the color of whatever it sits in (text-primary, text-negative,
//      text-muted-foreground). There is no hex literal in this file, which is
//      the design rule in CLAUDE.md and in IDENTITY.md.
//
// Decorative by default (aria-hidden). Pass `title` where the mark carries
// meaning a paragraph used to carry, and it becomes role="img" with that title
// as its accessible name.

import { cn } from "@/lib/utils";

type MarkProps = {
  className?: string;
  /** Set only when the mark replaces words. Turns the svg into role="img". */
  title?: string;
};

/** Shared svg attributes. Every mark spreads this, which is what makes them a set. */
function markProps(className: string | undefined, title: string | undefined) {
  return {
    viewBox: "0 0 48 48",
    fill: "none",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: cn("size-12", className),
    role: title ? ("img" as const) : undefined,
    "aria-hidden": title ? undefined : true,
  };
}

/**
 * The hero object. A ring with a break in it and an arrow re-entering through
 * the gap: one window closes, the next one opens, and the loop closes itself.
 */
export function RollLoopMark({ className, title }: MarkProps) {
  return (
    <svg {...markProps(className, title)}>
      {title ? <title>{title}</title> : null}
      {/* The ring, drawn as an arc with a gap at the top right. */}
      <path d="M32 8.9A18 18 0 1 1 24 6" stroke="currentColor" />
      {/* The re-entry arrow diving back through the gap. */}
      <path d="M25.5 1.5 32 6.9l-6.2 5.4" stroke="currentColor" />
      {/* The rule sitting in the middle of the loop. */}
      <rect x="18" y="18" width="12" height="12" rx="1" stroke="currentColor" />
      <path d="M22 24h4" stroke="currentColor" />
    </svg>
  );
}

/** The plan. A sheet with three written terms and the stake figure under them. */
export function PlanMark({ className, title }: MarkProps) {
  return (
    <svg {...markProps(className, title)}>
      {title ? <title>{title}</title> : null}
      <rect x="9" y="6" width="30" height="36" rx="1" stroke="currentColor" />
      <path d="M15 15h18M15 22h18M15 29h11" stroke="currentColor" />
      <path d="M15 36h6" stroke="currentColor" />
    </svg>
  );
}

/** Settlement. A block, with the handler arrow landing inside the same block. */
export function SettlementMark({ className, title }: MarkProps) {
  return (
    <svg {...markProps(className, title)}>
      {title ? <title>{title}</title> : null}
      <rect x="6" y="12" width="36" height="24" rx="1" stroke="currentColor" />
      <path d="M6 21h36" stroke="currentColor" />
      <path d="M20 26h8" stroke="currentColor" />
      <path d="M24 26v5" stroke="currentColor" />
      <path d="M20.5 27.8 24 31.5l3.5-3.7" stroke="currentColor" />
    </svg>
  );
}

/** A stop rule. An octagon with the bar across it, the shape of a halt. */
export function StopRuleMark({ className, title }: MarkProps) {
  return (
    <svg {...markProps(className, title)}>
      {title ? <title>{title}</title> : null}
      <path
        d="M18 6h12l12 12v12L30 42H18L6 30V18L18 6Z"
        stroke="currentColor"
      />
      <path d="M17 24h14" stroke="currentColor" />
    </svg>
  );
}

/** The window queue. Three cards stacked with the next one lifted forward. */
export function QueueMark({ className, title }: MarkProps) {
  return (
    <svg {...markProps(className, title)}>
      {title ? <title>{title}</title> : null}
      <rect x="6" y="30" width="36" height="9" rx="1" stroke="currentColor" />
      <rect x="9" y="19" width="30" height="9" rx="1" stroke="currentColor" />
      <rect x="12" y="8" width="24" height="9" rx="1" stroke="currentColor" />
    </svg>
  );
}
