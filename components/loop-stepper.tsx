"use client";

// The roll loop, as three tabs a judge can click before opening /console.
//
// This replaces the three stacked prose blocks that used to sit under "How it
// works" on the landing page. Same three beats, DEMO.md steps 1, 4 and 6, but
// one sentence each instead of two, a brand mark carrying the shape of the step,
// and one line of the real call the step makes.
//
// The trace lines are shaped like the calls in contracts/src/PerennisVault.sol
// and truncated for width. They are illustrations of the signature, not captured
// output: the real hashes are in EVIDENCE.md and the real ledger is on /console.
//
// Tabs, not an accordion, because the panel is fixed height content and a judge
// should be able to flick between all three without the page reflowing under
// them. Keyboard: Tab reaches the selected tab, arrow keys move between them,
// which is what the tablist pattern asks for.

import { useState, type KeyboardEvent } from "react";
import {
  PlanMark,
  SettlementMark,
  StopRuleMark,
} from "@/components/brand/marks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Step = {
  id: string;
  tab: string;
  title: string;
  /** One sentence. If it needs two, it belongs in the folded block lower down. */
  body: string;
  trace: string;
  Mark: typeof PlanMark;
  tone: "primary" | "warning";
};

const steps: Step[] = [
  {
    id: "plan",
    tab: "01 Write",
    title: "One signature writes the plan",
    body: "Direction, stake per window, window count and three stop rules go in as one transaction, which also queues the next market ids and opens the vault's reactivity subscription.",
    trace: "startPlan(plan, [0x9f…, 0x2c…, 0x71…]) -> WindowsArmed(3)",
    Mark: PlanMark,
    tone: "primary",
  },
  {
    id: "settle",
    tab: "02 Roll",
    title: "The settlement block does the work",
    body: "When the window resolves, validators call the vault's handler in that same block, so the redeem and the re-entry land with no keeper, no server and no gap.",
    trace: "_onEvent(MarketResolved) -> RollSettled(WON, +45.45, 18405486)",
    Mark: SettlementMark,
    tone: "primary",
  },
  {
    id: "stop",
    tab: "03 Halt",
    title: "The stop rules halt it, not you",
    body: "Consecutive losses, floor balance and take profit are conditions inside that same settlement path, so when one trips the contract stops itself and the balance waits in the vault.",
    trace: "_evaluateStops(streak: 2) -> PlanHalted(ConsecutiveLosses)",
    Mark: StopRuleMark,
    tone: "warning",
  },
];

export function LoopStepper() {
  const [active, setActive] = useState(0);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const last = steps.length - 1;
    let next = active;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = active === last ? 0 : active + 1;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = active === 0 ? last : active - 1;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = last;
    } else {
      return;
    }
    event.preventDefault();
    setActive(next);
    // The ids are set on the buttons below, so focus moves without a ref array.
    document.getElementById(`loop-tab-${steps[next].id}`)?.focus();
  }

  const step = steps[active];
  const { Mark } = step;

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="How one roll works"
        onKeyDown={onKeyDown}
        className="flex flex-wrap gap-2"
      >
        {steps.map((s, index) => {
          const selected = index === active;
          return (
            <Button
              key={s.id}
              type="button"
              role="tab"
              id={`loop-tab-${s.id}`}
              aria-selected={selected}
              aria-controls={`loop-panel-${s.id}`}
              tabIndex={selected ? 0 : -1}
              variant={selected ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActive(index)}
              className={cn(
                "font-mono focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
                selected
                  ? "border border-primary/50 text-primary"
                  : "border border-border text-muted-foreground"
              )}
            >
              {s.tab}
            </Button>
          );
        })}
      </div>

      <Card>
        <CardContent
          role="tabpanel"
          id={`loop-panel-${step.id}`}
          aria-labelledby={`loop-tab-${step.id}`}
          tabIndex={0}
          className="flex flex-col gap-5 p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-start sm:gap-6"
        >
          {/* Image first. The mark carries the shape of the step, the sentence
              names it, and the trace line is the call that does it. */}
          <Mark
            title={step.title}
            className={cn(
              "size-12 shrink-0",
              step.tone === "warning" ? "text-warning" : "text-primary"
            )}
          />
          <div className="min-w-0 space-y-3">
            <h3 className="text-base font-medium">{step.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {step.body}
            </p>
            <p className="overflow-x-auto whitespace-nowrap rounded-md border border-border bg-secondary/50 px-3 py-2 font-mono text-xs text-muted-foreground">
              {step.trace}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
