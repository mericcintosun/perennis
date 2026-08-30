// Vault 02's balance path, drawn small enough to sit inside a line of body text.
//
// Every number in here is read out of fixtures/vaults.json through
// lib/data/seed.ts. Nothing is written by hand: the first point is that vault's
// depositTotal and the rest are the balanceAfter of each settled row in its
// ledger, in ledger order. If the fixture changes, this figure changes with it.
//
// Server component. No state, no handlers, no "use client": the path is complete
// in the server rendered HTML and the draw-in is a CSS animation
// (`pns-draw` in app/globals.css) that animates stroke-dashoffset and nothing
// else. With animations off, or under prefers-reduced-motion: reduce, the base
// style is already the finished line.
//
// Colour never carries the outcome on its own. The dots take --positive and
// --negative, and BalanceLegend prints the words WON and LOST beside the figures
// in the same sentence, which is the rule in IDENTITY.md.

import { vaults } from "@/lib/data/seed";
import { cn } from "@/lib/utils";

const VAULT_ID = "vault-02";

const vault = vaults.find((entry) => entry.id === VAULT_ID) ?? null;
const settled = vault?.ledger ?? [];

/** The deposit, then one point per settled window. */
const series = vault ? [vault.depositTotal, ...settled.map((row) => row.balanceAfter)] : [];

const VIEW_W = 120;
const VIEW_H = 28;
const PAD_X = 3;
const PAD_Y = 3;

const low = series.length > 0 ? Math.min(...series) : 0;
const high = series.length > 0 ? Math.max(...series) : 0;
const span = high - low || 1;

function pointAt(index: number, value: number) {
  const steps = series.length - 1 || 1;
  return {
    x: PAD_X + (index * (VIEW_W - PAD_X * 2)) / steps,
    y: PAD_Y + ((high - value) / span) * (VIEW_H - PAD_Y * 2),
  };
}

function outcomeClass(outcome: string) {
  return outcome === "LOST" ? "text-negative" : "text-positive";
}

export function BalanceSparkline({ className }: { className?: string }) {
  if (series.length < 2) return null;

  const path = series
    .map((value, index) => {
      const { x, y } = pointAt(index, value);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const label = [
    `Vault ${VAULT_ID.slice(-2)} balance, ${series[0].toFixed(2)} deposited, then`,
    settled
      .map((row) => `${row.outcome} ${row.balanceAfter.toFixed(2)}`)
      .join(", "),
  ].join(" ");

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label={label}
      className={cn(
        "inline-block h-7 w-[120px] align-[-0.55em] text-muted-foreground",
        className
      )}
    >
      <path
        d={path}
        pathLength={100}
        className="pns-draw"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {series.map((value, index) => {
        const { x, y } = pointAt(index, value);
        // Point 0 is the deposit, which has no outcome. Every point after it is
        // a settled window and takes that window's outcome colour.
        const row = index === 0 ? null : settled[index - 1];
        return (
          <circle
            key={`${index}-${value}`}
            cx={x}
            cy={y}
            r={index === 0 ? 1.6 : 2.2}
            fill="currentColor"
            className={row ? outcomeClass(row.outcome) : "text-muted-foreground"}
          />
        );
      })}
    </svg>
  );
}

/**
 * The same rows as words. This is what keeps the hue from being the only carrier
 * of the outcome: the sparkline shows the shape, this shows WON or LOST next to
 * the figure it belongs to, in the running sentence.
 */
export function BalanceLegend() {
  if (settled.length === 0) return null;

  return (
    <>
      {settled.map((row, index) => (
        <span key={row.index} className="whitespace-nowrap">
          <span className={outcomeClass(row.outcome)}>{row.outcome}</span>{" "}
          <span className="tabular">{row.balanceAfter.toFixed(2)}</span>
          {index < settled.length - 1 ? ", " : ""}
        </span>
      ))}
    </>
  );
}
