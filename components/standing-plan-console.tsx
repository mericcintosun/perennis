"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { planDefaults } from "@/lib/data/seed";
import type {
  DataSourceLabel,
  Direction,
  EventWindow,
  Vault,
} from "@/lib/types";
import {
  entryPriceCents,
  formatUsd,
  preflight,
  realizedPnl,
  round2,
  settleAndRoll,
  shortHash,
  stopReasonLabel,
  winRate,
} from "@/lib/vault";

/**
 * A real Event Contracts window is 15 minutes. For the recorded demo the clock is
 * compressed so the roll is visible on camera. The countdown is labelled as a
 * demo clock on screen: nothing else about the flow is faked, the settlement path
 * is the same one the contract runs.
 */
const DEMO_WINDOW_SECONDS = 20;

interface Props {
  windows: EventWindow[];
  initialVaults: Vault[];
  source: DataSourceLabel;
  sourceNote?: string;
  decimals: number;
  explorerBase: string;
}

export function StandingPlanConsole({
  windows,
  initialVaults,
  source,
  sourceNote,
  decimals,
  explorerBase,
}: Props) {
  const [vaultList, setVaultList] = useState<Vault[]>(initialVaults);
  const [activeId, setActiveId] = useState(initialVaults[0].id);
  const [secondsLeft, setSecondsLeft] = useState(DEMO_WINDOW_SECONDS);
  const [form, setForm] = useState({ ...planDefaults });

  const active = vaultList.find((v) => v.id === activeId) ?? vaultList[0];
  const openWindow =
    windows.find((w) => w.marketId === active.openMarketId) ?? null;

  // The contract refuses to enter anything that is not in lifecycle state 1, so
  // a window the vault is holding a position in was Trading when it was entered,
  // whatever the seed row says about it before it opened.
  const heldWindow =
    openWindow && active.status === "ACTIVE"
      ? { ...openWindow, state: "Trading" as const }
      : openWindow;

  // Tick the demo clock only while a position is actually open.
  useEffect(() => {
    if (active.status !== "ACTIVE" || !active.openMarketId) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [active.status, active.openMarketId, active.id]);

  // Countdown reaching zero is the settlement block. Nobody clicks anything: the
  // same sequence the reactivity handler runs on chain runs here.
  useEffect(() => {
    if (secondsLeft > 0) return;
    setVaultList((list) =>
      list.map((v) => {
        if (v.id !== activeId) return v;
        const result = settleAndRoll(v, windows, new Date());
        return result ? result.vault : v;
      })
    );
    setSecondsLeft(DEMO_WINDOW_SECONDS);
  }, [secondsLeft, activeId, windows]);

  const errors = useMemo(() => {
    const list: string[] = [];
    if (form.deposit <= 0) list.push("Deposit must be greater than zero.");
    if (form.stakePerWindow <= 0) list.push("Stake per window must be greater than zero.");
    if (form.stakePerWindow > form.deposit)
      list.push("Stake per window cannot exceed the deposit.");
    if (form.windows < 1 || form.windows > 24)
      list.push("Pick between 1 and 24 windows.");
    if (form.maxConsecutiveLosses < 1)
      list.push("The consecutive loss limit has to be at least 1.");
    if (form.floorBalance >= form.deposit)
      list.push("The floor has to sit below the deposit or the plan halts immediately.");
    if (form.takeProfit <= form.deposit)
      list.push("Take profit has to sit above the deposit.");
    return list;
  }, [form]);

  function selectVault(id: string) {
    setActiveId(id);
    setSecondsLeft(DEMO_WINDOW_SECONDS);
  }

  function updateVault(id: string, next: (v: Vault) => Vault) {
    setVaultList((list) => list.map((v) => (v.id === id ? next(v) : v)));
  }

  /** One signature: writes the plan, queues three windows, opens the subscription. */
  function writePlan() {
    if (errors.length > 0) return;
    const queue = windows
      .filter(
        (w) =>
          w.asset === form.asset && (w.state === "Trading" || w.state === "Listed")
      )
      .map((w) => w.marketId);
    if (queue.length === 0) return;

    updateVault(activeId, (v) => ({
      ...v,
      balance: round2(form.deposit - form.stakePerWindow),
      depositTotal: form.deposit,
      status: "ACTIVE",
      stopReason: null,
      windowsFilled: 0,
      consecutiveLosses: 0,
      openMarketId: queue[0],
      queue: queue.slice(1, 4),
      ledger: [],
      plan: {
        asset: form.asset,
        direction: form.direction,
        stakePerWindow: form.stakePerWindow,
        windows: form.windows,
        rules: {
          maxConsecutiveLosses: form.maxConsecutiveLosses,
          floorBalance: form.floorBalance,
          takeProfit: form.takeProfit,
        },
      },
      subscription: {
        subscriptionId: 41903,
        gasBudgetStt: 12.4,
        worstCaseHandlerGas: 0,
        priorityFeeGwei: 8,
      },
    }));
    setSecondsLeft(DEMO_WINDOW_SECONDS);
  }

  /** Permissionless: refills the queue without touching the plan or the money. */
  function armNext() {
    updateVault(activeId, (v) => {
      if (!v.plan) return v;
      const known = new Set([...v.queue, ...v.ledger.map((e) => e.marketId)]);
      const more = windows
        .filter((w) => w.asset === v.plan!.asset && !known.has(w.marketId))
        .map((w) => w.marketId)
        .slice(0, 3);
      return { ...v, queue: [...v.queue, ...more] };
    });
  }

  function halt() {
    updateVault(activeId, (v) => ({
      ...v,
      status: "STOPPED",
      stopReason: "owner-halt",
    }));
  }

  function withdrawAll() {
    updateVault(activeId, (v) => ({
      ...v,
      balance: 0,
      depositTotal: 0,
      status: "IDLE",
      stopReason: null,
      plan: null,
      windowsFilled: 0,
      consecutiveLosses: 0,
      queue: [],
      openMarketId: null,
      ledger: [],
      subscription: { ...v.subscription, subscriptionId: null },
    }));
  }

  // One signature writes the plan. Nothing after it needs the owner's wallet.
  const signatures = active.plan ? 1 : 0;
  const checks = preflight(heldWindow, active, decimals);
  const pnl = realizedPnl(active);
  const rate = winRate(active);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {vaultList.map((v) => (
            <Button
              key={v.id}
              size="sm"
              variant={v.id === activeId ? "default" : "outline"}
              onClick={() => selectVault(v.id)}
            >
              {v.label}
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  v.status === "ACTIVE"
                    ? "bg-primary"
                    : v.status === "STOPPED"
                      ? "bg-warning"
                      : "bg-muted-foreground"
                )}
              />
            </Button>
          ))}
        </div>
        <Badge variant="outline" className="font-normal">
          {source === "chain"
            ? "Live read from Shannon"
            : "Seed data, no vault address set"}
        </Badge>
      </div>

      {sourceNote ? (
        <p className="mb-6 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {sourceNote}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              {active.status === "IDLE" ? "Write the plan" : "The standing plan"}
            </CardTitle>
            <CardDescription>
              {active.status === "IDLE"
                ? "Deposit, pick a direction, set three stop rules. One signature, then you can close the tab."
                : "Written on chain. Changing it needs a new signature, running it does not."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {active.status === "IDLE" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Deposit (USDso)"
                    value={form.deposit}
                    onChange={(deposit) => setForm({ ...form, deposit })}
                  />
                  <NumberField
                    label="Stake per window"
                    value={form.stakePerWindow}
                    onChange={(stakePerWindow) =>
                      setForm({ ...form, stakePerWindow })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel>Direction</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {(["UP", "DOWN"] as Direction[]).map((d) => (
                      <Button
                        key={d}
                        variant={form.direction === d ? "default" : "outline"}
                        onClick={() => setForm({ ...form, direction: d })}
                      >
                        {d === "UP" ? "Up" : "Down"}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <FieldLabel>Asset</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {(["BTC", "ETH"] as const).map((a) => (
                      <Button
                        key={a}
                        variant={form.asset === a ? "default" : "outline"}
                        onClick={() => setForm({ ...form, asset: a })}
                      >
                        {a}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border border-border bg-secondary/40 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Stop rules, enforced by the contract
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <NumberField
                      label="Windows"
                      value={form.windows}
                      onChange={(windowsCount) =>
                        setForm({ ...form, windows: windowsCount })
                      }
                    />
                    <NumberField
                      label="Losses in a row"
                      value={form.maxConsecutiveLosses}
                      onChange={(maxConsecutiveLosses) =>
                        setForm({ ...form, maxConsecutiveLosses })
                      }
                    />
                    <NumberField
                      label="Floor"
                      value={form.floorBalance}
                      onChange={(floorBalance) =>
                        setForm({ ...form, floorBalance })
                      }
                    />
                  </div>
                  <NumberField
                    label="Take profit (USDso)"
                    value={form.takeProfit}
                    onChange={(takeProfit) => setForm({ ...form, takeProfit })}
                  />
                </div>

                {errors.length > 0 ? (
                  <ul className="space-y-1 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
                    {errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                ) : null}

                <Button
                  className="w-full"
                  size="lg"
                  disabled={errors.length > 0}
                  onClick={writePlan}
                >
                  Write plan, queue 3 windows, subscribe
                </Button>
                <p className="text-xs text-muted-foreground">
                  One transaction does all three. After it lands, the vault runs
                  without you.
                </p>
              </>
            ) : (
              <>
                <dl className="space-y-3 text-sm">
                  <SummaryRow
                    label="Direction"
                    value={`${active.plan?.direction === "UP" ? "Up" : "Down"} on ${active.plan?.asset}`}
                  />
                  <SummaryRow
                    label="Stake per window"
                    value={`${formatUsd(active.plan?.stakePerWindow ?? 0)} USDso`}
                  />
                  <SummaryRow
                    label="Windows"
                    value={`${active.windowsFilled} of ${active.plan?.windows} filled`}
                  />
                  <SummaryRow
                    label="Stop on losses in a row"
                    value={`${active.consecutiveLosses} of ${active.plan?.rules.maxConsecutiveLosses}`}
                    alert={
                      active.consecutiveLosses > 0 &&
                      active.consecutiveLosses >=
                        (active.plan?.rules.maxConsecutiveLosses ?? 99) - 1
                    }
                  />
                  <SummaryRow
                    label="Floor balance"
                    value={`${formatUsd(active.plan?.rules.floorBalance ?? 0)} USDso`}
                  />
                  <SummaryRow
                    label="Take profit"
                    value={`${formatUsd(active.plan?.rules.takeProfit ?? 0)} USDso`}
                  />
                  <SummaryRow
                    label="Queue"
                    value={`${active.queue.length} window${active.queue.length === 1 ? "" : "s"} armed`}
                    alert={active.queue.length === 0 && active.status === "ACTIVE"}
                  />
                </dl>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={armNext}>
                    Arm 3 more windows
                  </Button>
                  {active.status === "ACTIVE" ? (
                    <Button size="sm" variant="destructive" onClick={halt}>
                      Halt the plan
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={withdrawAll}>
                      Withdraw {formatUsd(active.balance)} USDso
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Arming windows is permissionless: anyone can refill the queue,
                  nobody else can move the money or change the rules.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
              <div className="space-y-1.5">
                <CardTitle className="text-base">{active.label}</CardTitle>
                <CardDescription className="font-mono text-xs">
                  {shortHash(active.address, 10)}
                </CardDescription>
              </div>
              <StatusBadge vault={active} />
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center gap-8">
                <CountdownRing
                  secondsLeft={Math.max(0, secondsLeft)}
                  total={DEMO_WINDOW_SECONDS}
                  running={active.status === "ACTIVE" && !!active.openMarketId}
                />
                <div className="grid flex-1 grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
                  <Stat
                    label="Vault balance"
                    value={`${formatUsd(active.balance)}`}
                    suffix="USDso"
                  />
                  <Stat
                    label="Realised PnL"
                    value={`${pnl >= 0 ? "+" : ""}${formatUsd(pnl)}`}
                    suffix="USDso"
                    tone={pnl >= 0 ? "primary" : "warning"}
                  />
                  <Stat
                    label="Win rate"
                    value={rate === null ? "—" : `${rate}%`}
                    suffix={rate === null ? "no rolls yet" : `${active.ledger.length} rolls`}
                  />
                </div>
              </div>

              {openWindow ? (
                <div className="rounded-lg border border-border bg-secondary/40 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-medium">{openWindow.question}</p>
                    <Badge variant="outline" className="font-normal">
                      {openWindow.durationMinutes} min window
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                    <Stat
                      label="Entry price"
                      value={`${entryPriceCents(openWindow, active.plan?.direction ?? "UP")}c`}
                      suffix="per contract"
                      compact
                    />
                    <Stat
                      label="Implied probability"
                      value={`${entryPriceCents(openWindow, active.plan?.direction ?? "UP")}%`}
                      suffix="from the book"
                      compact
                    />
                    <Stat
                      label="Book depth"
                      value={`${(openWindow.bookDepthUsd / 1000).toFixed(1)}k`}
                      suffix="USDso resting"
                      compact
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-border px-6 py-10 text-center">
                  <Image
                    src="/illustrations/roll-loop.svg"
                    alt=""
                    width={200}
                    height={132}
                    className="opacity-80"
                  />
                  <div className="max-w-sm space-y-1">
                    <p className="text-sm font-medium">
                      {active.status === "IDLE"
                        ? "No position open"
                        : stopReasonLabel(active.stopReason)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {active.status === "IDLE"
                        ? "Write a plan on the left and the vault takes the first window straight away."
                        : "The balance stays in the vault. Withdraw it, or write a new plan when you want to start again."}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Pre-write checks
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {checks.map((check) => (
                    <div
                      key={check.id}
                      className="flex items-start gap-2.5 rounded-md border border-border bg-secondary/30 px-3 py-2"
                    >
                      <span
                        className={cn(
                          "mt-1.5 size-1.5 shrink-0 rounded-full",
                          check.ok ? "bg-primary" : "bg-warning"
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium">{check.label}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {check.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Signatures used:{" "}
                <span className="tabular font-medium text-foreground">
                  {signatures}
                </span>{" "}
                for the plan,{" "}
                <span className="tabular font-medium text-foreground">0</span>{" "}
                for the {active.ledger.length} roll
                {active.ledger.length === 1 ? "" : "s"} below. Every one of them
                was produced by a validator in the settlement block.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Roll ledger</CardTitle>
              <CardDescription>
                Written by the contract on every settlement. Read it back from the
                chain, not from a server log.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {active.ledger.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  No rolls yet. The first entry lands the moment the open window
                  settles.
                </p>
              ) : (
                // Ledger rows carry a hash, a block number and a balance, so the
                // row scrolls inside its own box rather than pushing the page
                // sideways on a 375px screen.
                <ol className="-mx-2 space-y-0 overflow-x-auto px-2">
                  {[...active.ledger].reverse().map((entry, i, arr) => (
                    <li
                      key={`${entry.marketId}-${entry.index}`}
                      className="relative flex gap-4 pb-5 last:pb-0"
                    >
                      {i < arr.length - 1 ? (
                        <span className="absolute left-[7px] top-4 h-full w-px bg-border" />
                      ) : null}
                      <span
                        className={cn(
                          "relative mt-1.5 size-3.5 shrink-0 rounded-full border-2 bg-card",
                          entry.outcome === "WON"
                            ? "border-primary"
                            : entry.outcome === "LOST"
                              ? "border-warning"
                              : "border-muted-foreground"
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <p className="text-sm font-medium">
                            Roll {entry.index} · {entry.asset}{" "}
                            {entry.direction === "UP" ? "Up" : "Down"} at{" "}
                            {entry.entryCents}c
                          </p>
                          <p
                            className={cn(
                              "tabular text-sm font-medium",
                              entry.outcome === "WON"
                                ? "text-primary"
                                : entry.outcome === "LOST"
                                  ? "text-warning"
                                  : "text-muted-foreground"
                            )}
                          >
                            {entry.outcome === "LOST" ? "-" : "+"}
                            {formatUsd(
                              entry.outcome === "LOST" ? entry.stake : entry.payout
                            )}
                          </p>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="tabular">
                            {entry.settledAt.slice(11, 19)} UTC
                          </span>
                          <span className="tabular">
                            balance {formatUsd(entry.balanceAfter)}
                          </span>
                          <span className="tabular">
                            block {entry.blockNumber.toLocaleString("en-US")}
                          </span>
                          <Badge
                            variant="outline"
                            className="border-primary/40 px-2 py-0 font-normal text-primary"
                          >
                            validator call
                          </Badge>
                          <a
                            className="font-mono underline underline-offset-4 hover:text-foreground"
                            href={`${explorerBase}/tx/${entry.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {shortHash(entry.txHash)}
                          </a>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// --- small pieces --------------------------------------------------------

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <Input
        type="number"
        inputMode="decimal"
        className="tabular"
        value={value}
        onChange={(e) => {
          const parsed = Number(e.target.value);
          onChange(Number.isFinite(parsed) ? parsed : 0);
        }}
      />
    </label>
  );
}

function SummaryRow({
  label,
  value,
  alert,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2.5 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "tabular text-right font-medium",
          alert ? "text-warning" : "text-foreground"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function Stat({
  label,
  value,
  suffix,
  tone,
  compact,
}: {
  label: string;
  value: string;
  suffix?: string;
  tone?: "primary" | "warning";
  compact?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tabular font-semibold",
          compact ? "text-lg" : "text-2xl",
          tone === "primary"
            ? "text-primary"
            : tone === "warning"
              ? "text-warning"
              : "text-foreground"
        )}
      >
        {value}
      </p>
      {suffix ? (
        <p className="text-xs text-muted-foreground">{suffix}</p>
      ) : null}
    </div>
  );
}

function StatusBadge({ vault }: { vault: Vault }) {
  if (vault.status === "ACTIVE") {
    return (
      <Badge className="gap-2">
        <span className="size-1.5 rounded-full bg-primary-foreground pulse-dot" />
        Running
      </Badge>
    );
  }
  if (vault.status === "IDLE") {
    return <Badge variant="secondary">Empty</Badge>;
  }
  return (
    <Badge
      variant="outline"
      className={cn(
        "max-w-[16rem] whitespace-normal text-right font-normal",
        vault.status === "STOPPED"
          ? "border-warning/50 text-warning"
          : "border-primary/50 text-primary"
      )}
    >
      {stopReasonLabel(vault.stopReason)}
    </Badge>
  );
}

function CountdownRing({
  secondsLeft,
  total,
  running,
}: {
  secondsLeft: number;
  total: number;
  running: boolean;
}) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const progress = running ? Math.min(1, secondsLeft / total) : 0;

  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      <div className="relative size-[104px]">
        <svg viewBox="0 0 104 104" className="size-full -rotate-90">
          <circle
            cx="52"
            cy="52"
            r={radius}
            fill="none"
            strokeWidth="6"
            className="stroke-border"
          />
          <circle
            cx="52"
            cy="52"
            r={radius}
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            className="stroke-primary transition-[stroke-dashoffset] duration-1000 ease-linear"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular text-2xl font-semibold">
            {running ? `${secondsLeft}s` : "—"}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {running ? "to settle" : "idle"}
          </span>
        </div>
      </div>
      <p className="max-w-[9rem] text-center text-[10px] leading-tight text-muted-foreground">
        Demo clock: 20 seconds stands in for a real 15 minute window.
      </p>
    </div>
  );
}
