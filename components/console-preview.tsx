// A static miniature of /console for the landing hero. Server safe on purpose:
// no "use client", no state, no Date.now(), no Math.random(), no fetch. Every
// number below is a literal read out of fixtures/vaults.json (Vault 02, the
// eight window BTC plan), so the picture and the console tell the same story:
//
//   balance 193.53, deposits 200, one 25 stake open  -> realised PnL +18.53
//   ledger rows 2 and 3 of that vault                -> one lost, one won
//   two wins out of three settled rolls              -> win rate 67%
//
// Nothing here computes anything. The real screen is one click away and this is
// only the picture of it, which is what the hero needs above the fold.

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// The same geometry CountdownRing uses in components/standing-plan-console.tsx:
// a 104 unit box, radius 38, six wide stroke. Frozen at 11 of 20 seconds so the
// arc reads as running rather than as full or empty.
const RADIUS = 38;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const PROGRESS = 11 / 20;

const figures: {
  label: string;
  value: string;
  suffix: string;
  tone?: "primary";
}[] = [
  { label: "Vault balance", value: "193.53", suffix: "USDso" },
  { label: "Realised PnL", value: "+18.53", suffix: "USDso", tone: "primary" },
  { label: "Win rate", value: "67%", suffix: "3 rolls" },
];

const rows: {
  title: string;
  amount: string;
  outcome: "WON" | "LOST";
  meta: string;
}[] = [
  {
    title: "Roll 3 · BTC Up at 55c",
    amount: "+45.45",
    outcome: "WON",
    meta: "balance 218.53 · block 18,405,486",
  },
  {
    title: "Roll 2 · BTC Up at 47c",
    amount: "-25.00",
    outcome: "LOST",
    meta: "balance 198.08 · block 18,404,119",
  },
];

export function ConsolePreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Browser chrome, decorative. The dots carry no meaning a screen reader
          needs, so they are hidden from it and the strip below says the name. */}
      <div className="flex items-center gap-3 border-b border-border bg-secondary/40 px-4 py-3">
        <div className="flex shrink-0 gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </div>
        <p className="truncate font-mono text-xs text-muted-foreground">
          perennis / console
        </p>
      </div>

      <div className="p-4">
        <Card className="border-border/80 shadow-none">
          <CardContent className="space-y-5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium">Vault 02</p>
              <Badge className="gap-2">
                <span className="size-1.5 rounded-full bg-primary-foreground" />
                Running
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="relative size-[104px] shrink-0">
                <svg viewBox="0 0 104 104" className="size-full -rotate-90">
                  <circle
                    cx="52"
                    cy="52"
                    r={RADIUS}
                    fill="none"
                    strokeWidth="6"
                    className="stroke-border"
                  />
                  <circle
                    cx="52"
                    cy="52"
                    r={RADIUS}
                    fill="none"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className="stroke-primary"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={CIRCUMFERENCE * (1 - PROGRESS)}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="tabular text-2xl font-semibold">11s</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    to settle
                  </span>
                </div>
              </div>

              {/* min-w-0 so the figures shrink inside the flex row instead of
                  pushing a 360px page sideways. */}
              <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                {figures.map((f) => (
                  <div key={f.label}>
                    <dt className="text-xs text-muted-foreground">{f.label}</dt>
                    <dd
                      className={cn(
                        "tabular text-lg font-semibold",
                        f.tone === "primary" ? "text-primary" : "text-foreground"
                      )}
                    >
                      {f.value}
                    </dd>
                    <dd className="text-xs text-muted-foreground">{f.suffix}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <Separator />

            <ol className="space-y-3">
              {rows.map((row) => (
                <li key={row.title} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-1.5 size-3 shrink-0 rounded-full border-2 bg-card",
                      row.outcome === "WON" ? "border-primary" : "border-warning"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="text-xs font-medium">{row.title}</p>
                      <p
                        className={cn(
                          "tabular text-xs font-medium",
                          row.outcome === "WON"
                            ? "text-primary"
                            : "text-warning"
                        )}
                      >
                        {row.amount}
                      </p>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="tabular">{row.meta}</span>
                      <Badge
                        variant="outline"
                        className="border-primary/40 px-2 py-0 font-normal text-primary"
                      >
                        validator call
                      </Badge>
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            <p className="text-[11px] leading-tight text-muted-foreground">
              Demo clock: 20 seconds stands in for a real 15 minute window. Both
              rolls above landed with no signature.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
