"use client";

// The roll figure: the one oversized drawing on the landing page, and the thing
// a judge can actually touch.
//
// It is a diagram, not a wash. Three stages stacked on hairline rules, each one
// a mark from the brand family in components/brand/marks.tsx, a label in the
// display face, and a one sentence caption. There is no mask, no gradient, no
// card and no image file behind it: every pixel is an svg stroke taking its
// colour from the text around it, which is why the whole figure obeys
// IDENTITY.md without naming a colour.
//
// Interaction. Each stage is a real <button type="button">, so it answers a
// cursor and a keyboard the same way: hover or focus opens that stage's caption
// and closes the others. aria-expanded says whether the caption is open,
// aria-controls names it by id, and the focus ring is visible (ring-ring). The
// first stage is open in the initial state, which means its caption is in the
// server rendered HTML: a crawler, a reader with JavaScript off and a full page
// screenshot all get content rather than three empty rows.
//
// No IntersectionObserver, no entrance animation, nothing that starts at
// opacity 0. Below lg this figure sits under the dateline, which is below the
// fold on a phone, and IDENTITY.md says nothing down there may start hidden.

import { useId, useState } from "react";
import {
  PlanMark,
  RollLoopMark,
  SettlementMark,
} from "@/components/brand/marks";
import { cn } from "@/lib/utils";

/** DEMO.md steps 1, 4 and 2 in that order: write, settle, re-enter. */
const stages = [
  {
    Mark: PlanMark,
    label: "You write the plan",
    caption:
      "One transaction carries the direction, the stake per window, the window count and the three stop rules into a vault you own, and opens its reactivity subscription.",
  },
  {
    Mark: SettlementMark,
    label: "The block settles",
    caption:
      "A window resolves and validators call the vault's handler inside that same block, so the redeem is part of the settlement rather than a transaction that follows it.",
  },
  {
    Mark: RollLoopMark,
    label: "The vault re-enters",
    caption:
      "The next market id comes off the queue and the loop closes itself, unless one of the stop rules tripped on the way through, in which case the balance waits for you.",
  },
];

export function RollFigure({ className }: { className?: string }) {
  // Stage one starts open, so the server HTML carries a caption.
  const [active, setActive] = useState(0);
  const baseId = useId();

  return (
    <figure className={cn("m-0", className)}>
      <ol className="border-t border-border">
        {stages.map((stage, index) => {
          const captionId = `${baseId}-stage-${index}`;
          const open = active === index;

          return (
            <li key={stage.label} className="border-b border-border">
              <button
                type="button"
                aria-expanded={open}
                aria-controls={captionId}
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onClick={() => setActive(index)}
                className="flex w-full items-start gap-4 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <stage.Mark
                  className={cn(
                    "size-10 shrink-0 transition-colors",
                    open ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-base leading-snug">
                    {stage.label}
                  </span>
                  {/* The caption stays in the DOM at every state, so
                      aria-controls always resolves to a real element. Closed is
                      display:none through the utility class rather than the
                      hidden attribute, because a utility and the attribute
                      selector have the same specificity and the winner would
                      depend on stylesheet order. display:none also takes the
                      closed caption out of the accessibility tree, which is what
                      a collapsed disclosure should do. */}
                  <span
                    id={captionId}
                    className={cn(
                      "mt-2 text-[13px] leading-relaxed text-muted-foreground",
                      open ? "block" : "hidden"
                    )}
                  >
                    {stage.caption}
                  </span>
                </span>
                {/* The stage number. The <ol> already carries the ordering, so
                    this is hidden from assistive technology. */}
                <span
                  aria-hidden
                  className="tabular font-serif text-sm leading-6 text-primary"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <figcaption className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Three stages, and only the first one is a transaction you send. Hover a
        stage or tab through them to read what each one does.
      </figcaption>
    </figure>
  );
}
