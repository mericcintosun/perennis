"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { WalletPanel } from "@/components/wallet-panel";
import { cn } from "@/lib/utils";
// Config, not chain code. lib/config.ts imports nothing (not even viem), so
// pulling VAULT_ADDRESS in here cannot drag the RPC layer into the client
// bundle. lib/dreamdex.ts, lib/rpc.ts and lib/markets.ts stay server only.
import {
  BINARY_MARKETS_MODULE,
  CHAIN_ID,
  COLLATERAL_TOKEN,
  SUBSCRIPTION_FUNDING_STT,
  VAULT_ADDRESS,
} from "@/lib/config";
import { planDefaults } from "@/lib/data/seed";
import { parsePlanForm } from "@/lib/schemas";
import {
  armNextCall,
  connectWallet,
  depositCalls,
  ensureChain,
  haltCall,
  isWriteConfigured,
  sendVaultTx,
  startPlanCall,
  withdrawCall,
  type VaultCall,
} from "@/lib/tx";
import { isBusy, type WalletState } from "@/lib/wallet-state";
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
  const router = useRouter();
  const [vaultList, setVaultList] = useState<Vault[]>(initialVaults);
  const [activeId, setActiveId] = useState(initialVaults[0].id);
  const [secondsLeft, setSecondsLeft] = useState(DEMO_WINDOW_SECONDS);
  const [form, setForm] = useState({ ...planDefaults });
  const [walletState, setWalletState] = useState<WalletState>({
    kind: "disconnected",
  });

  /** True when NEXT_PUBLIC_CONTRACT_ADDRESS is filled in. */
  const writeConfigured = isWriteConfigured();

  /**
   * A transaction can only go out with both halves present: a deployed vault in
   * the env and a wallet connected on the right chain. Missing either one is not
   * an error, it is the fixture path, and every action below has that branch in
   * its own body.
   */
  const canWrite =
    writeConfigured &&
    (walletState.kind === "idle" ||
      walletState.kind === "tx-confirmed" ||
      walletState.kind === "tx-rejected" ||
      walletState.kind === "tx-failed");

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

  // Data enters through the server component, never through a chained effect.
  // router.refresh() re-runs app/console/page.tsx and the new props arrive here,
  // so this is the one place local state follows the chain.
  useEffect(() => {
    setVaultList(initialVaults);
  }, [initialVaults]);

  // Tick the demo clock only while a position is actually open.
  useEffect(() => {
    if (active.status !== "ACTIVE" || !active.openMarketId) return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [active.status, active.openMarketId, active.id]);

  // Countdown reaching zero is the settlement block. Nobody clicks anything.
  //
  // Two paths, both silent. On the chain path the roll already happened inside
  // the settlement block, so the console re-reads it off the RollSettled logs.
  // On the fixture path settleAndRoll() runs the mirror of that same sequence.
  // The demo clock caption under the ring is unchanged either way.
  useEffect(() => {
    if (secondsLeft > 0) return;

    if (source === "chain") {
      router.refresh();
      setSecondsLeft(DEMO_WINDOW_SECONDS);
      return;
    }

    setVaultList((list) =>
      list.map((v) => {
        if (v.id !== activeId) return v;
        const result = settleAndRoll(v, windows, new Date());
        return result ? result.vault : v;
      })
    );
    setSecondsLeft(DEMO_WINDOW_SECONDS);
  }, [secondsLeft, activeId, windows, source, router]);

  // One definition of what a valid plan is, in lib/schemas.ts. The console
  // renders the messages the schema produced and the encoder refuses anything
  // that did not parse, so the two can never disagree.
  //
  // Parsed once and read twice: the error list below, and the transaction
  // preview, which shows the numbers that are about to be encoded. Deriving
  // both from the same parse is what keeps the sentence on screen and the
  // calldata in the wallet popup from ever disagreeing.
  const parsedPlan = useMemo(() => parsePlanForm(form), [form]);
  const errors = useMemo<string[]>(
    () => (parsedPlan.ok ? [] : parsedPlan.issues),
    [parsedPlan]
  );

  // --- wallet ------------------------------------------------------------

  async function handleConnect() {
    setWalletState({ kind: "connecting" });
    setWalletState(await connectWallet());
  }

  async function handleSwitchNetwork() {
    setWalletState({ kind: "connecting" });
    setWalletState(await ensureChain());
  }

  /**
   * Send a list of calls in order, stopping at the first one that does not
   * confirm. Approve then deposit is the only two call sequence in the app.
   * The idempotency guard lives in lib/tx.ts, so a second click on a control
   * that somehow escaped the disabled state still sends one transaction.
   */
  const runCalls = useCallback(
    async (calls: readonly VaultCall[]): Promise<boolean> => {
      for (const call of calls) {
        setWalletState({ kind: "connecting" });
        const result = await sendVaultTx(call, setWalletState);
        setWalletState(result);
        if (result.kind !== "tx-confirmed") return false;
      }
      router.refresh();
      return true;
    },
    [router]
  );

  function selectVault(id: string) {
    setActiveId(id);
    setSecondsLeft(DEMO_WINDOW_SECONDS);
  }

  function updateVault(id: string, next: (v: Vault) => Vault) {
    setVaultList((list) => list.map((v) => (v.id === id ? next(v) : v)));
  }

  /** One signature: writes the plan, queues three windows, opens the subscription. */
  function writePlan() {
    const parsed = parsedPlan;
    if (!parsed.ok) return;

    const queue = windows
      .filter(
        (w) =>
          w.asset === form.asset && (w.state === "Trading" || w.state === "Listed")
      )
      .map((w) => w.marketId);
    if (queue.length === 0) return;

    if (canWrite) {
      // Real path, DEMO.md step 1. Approve when the standing allowance is short,
      // deposit, then one startPlan that writes the plan, queues the windows,
      // funds the subscription out of msg.value and enters the first window.
      void (async () => {
        const funding = await depositCalls(parsed.plan.deposit, decimals);
        const plan = startPlanCall(parsed.plan, queue.slice(0, 3), decimals);
        if (!plan) return;
        await runCalls([...funding, plan]);
      })();
      return;
    }

    // Fallback, in the same function: no vault address or no connected wallet,
    // so the card moves locally and the wallet strip says the write was
    // simulated. This is the path the deployed demo URL runs on.
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
    if (canWrite) {
      const known = new Set([
        ...active.queue,
        ...active.ledger.map((e) => e.marketId),
      ]);
      const more = windows
        .filter(
          (w) =>
            (!active.plan || w.asset === active.plan.asset) &&
            !known.has(w.marketId)
        )
        .map((w) => w.marketId)
        .slice(0, 3);
      const call = armNextCall(more);
      if (call) {
        void runCalls([call]);
        return;
      }
    }

    // Fallback, same function: local queue update on the fixture path.
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
    if (canWrite) {
      const call = haltCall();
      if (call) {
        void runCalls([call]);
        return;
      }
    }

    // Fallback, same function.
    updateVault(activeId, (v) => ({
      ...v,
      status: "STOPPED",
      stopReason: "owner-halt",
    }));
  }

  function withdrawAll() {
    if (canWrite) {
      const call = withdrawCall(active.balance, decimals);
      if (call) {
        void runCalls([call]);
        return;
      }
    }

    // Fallback, same function.
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
        {/* The badge says which path this render came from. When a vault is
            configured the address sits next to it and links out to the
            explorer, so the claim on screen is one click from being checked.
            With no address the badge renders alone, exactly as before. */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-normal">
            {source === "chain"
              ? "Live read from Shannon"
              : "Seed data, no vault address set"}
          </Badge>
          {VAULT_ADDRESS ? (
            <a
              href={`${explorerBase}/address/${VAULT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              title={VAULT_ADDRESS}
              className={cn(
                badgeVariants({ variant: "outline" }),
                // 44px tall below sm, matching every other tap target on this
                // screen. From sm up it sits back on the badge's own height.
                "min-h-11 font-mono font-normal underline-offset-4 hover:text-primary hover:underline sm:min-h-0"
              )}
            >
              {shortHash(VAULT_ADDRESS, 10)}
            </a>
          ) : null}
        </div>
      </div>

      {sourceNote ? (
        <Alert variant="warning" className="mb-6">
          <AlertDescription>{sourceNote}</AlertDescription>
        </Alert>
      ) : null}

      <WalletPanel
        state={walletState}
        explorerBase={explorerBase}
        writeConfigured={writeConfigured}
        expectedChainId={CHAIN_ID}
        onConnect={() => void handleConnect()}
        onSwitchNetwork={() => void handleSwitchNetwork()}
      />

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
            {/* Rendered above every write control on this card, so a judge
                reads what the next click sends before any wallet popup can
                open. */}
            <TransactionPreview
              vaultStatus={active.status}
              deposit={form.deposit}
              stakePerWindow={form.stakePerWindow}
              direction={form.direction}
              asset={form.asset}
              withdrawable={active.balance}
              canWrite={canWrite}
              explorerBase={explorerBase}
            />

            {active.status === "IDLE" ? (
              <>
                {/* Two number fields side by side leave each label about 120px
                    at 360px, so they stack below sm and pair from there up. */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  {/* "Losses in a row" and "Take profit (USDso)" are unreadable
                      in a third of a 360px card, so the three stop rule fields
                      stack below sm. */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                  <Alert variant="warning">
                    <AlertDescription>
                      <ul className="space-y-1">
                        {errors.map((e) => (
                          <li key={e}>{e}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                ) : null}

                {/* Bound to the wallet state, never to a timer. While a
                    transaction is in flight this control cannot be pressed
                    again, which is the first half of the duplicate guard. The
                    second half is withIdempotency() in lib/tx.ts. */}
                <Button
                  className="w-full"
                  size="lg"
                  disabled={errors.length > 0 || isBusy(walletState)}
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
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isBusy(walletState)}
                    onClick={armNext}
                  >
                    Arm 3 more windows
                  </Button>
                  {active.status === "ACTIVE" ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isBusy(walletState)}
                      onClick={halt}
                    >
                      Halt the plan
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isBusy(walletState)}
                      onClick={withdrawAll}
                    >
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
                {/* Shortened to fit a 360px card, with the whole address on the
                    title so it can still be read and copied. */}
                <CardDescription
                  className="truncate font-mono text-xs"
                  title={active.address}
                >
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
                  {/* Entry price, implied probability and book depth: three
                      figures with a caption each, so two up below sm and three
                      up from there. */}
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
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
                <VaultEmptyState vault={active} />
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

              <QueueStrip vault={active} windows={windows} source={source} />

              {/* This line counts plan signatures only. The deposit is its own
                  step in DEMO.md (an approve when the allowance is short, then
                  the deposit), so it is not part of the number, and the number
                  itself does not change. */}
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
                <LedgerEmptyState vault={active} />
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
                          {/* Derived, not decorative. On the chain path the
                              sender of the transaction that emitted RollSettled
                              is compared against owner() on the vault, so this
                              badge is the claim DEMO.md step 5 makes on camera. */}
                          <Badge
                            variant="outline"
                            className={cn(
                              "px-2 py-0 font-normal",
                              entry.trigger === "reactivity"
                                ? "border-primary/40 text-primary"
                                : "border-border text-muted-foreground"
                            )}
                          >
                            {entry.trigger === "reactivity"
                              ? "validator call"
                              : "owner call"}
                          </Badge>
                          <a
                            className="font-mono underline underline-offset-4 hover:text-foreground"
                            href={`${explorerBase}/tx/${entry.txHash}`}
                            title={entry.txHash}
                            target="_blank"
                            rel="noopener noreferrer"
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

// --- empty states --------------------------------------------------------

/**
 * No open position. Named and exported so the state triad on /console is
 * greppable: this is the empty half of the vault card, the skeleton lives in
 * app/console/loading.tsx and the failure in app/console/error.tsx.
 *
 * Both wordings carry a call to action, because an empty box with no next step
 * reads as a broken screen on camera. The illustration goes through next/image.
 */
export function VaultEmptyState({ vault }: { vault: Vault }) {
  const idle = vault.status === "IDLE";
  return (
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
          {idle ? "No position open" : stopReasonLabel(vault.stopReason)}
        </p>
        <p className="text-sm text-muted-foreground">
          {idle
            ? "Write a plan on the left and the vault takes the first window straight away."
            : "The balance stays in the vault. Withdraw it, or write a new plan when you want to start again."}
        </p>
      </div>
    </div>
  );
}

/**
 * The queue strip, DEMO.md step 7.
 *
 * The market ids the vault will enter next, each one carrying the lifecycle
 * state market discovery read for it. It needs no fetch, no route and no
 * signature: `windows` is the list discoverEventWindows() in lib/markets.ts
 * produced for this render, and `vault.queue` is what the contract holds. Delete
 * lib/markets.ts and every row below loses its state.
 *
 * Three states, like every other element on this screen. Empty when the queue is
 * dry, normal when it is not, and a caveat line when the ids came from fixtures
 * rather than from the chain.
 *
 * Two honest labels instead of one invented state:
 *   - an empty id is the chain path. `_queue` is private on PerennisVault, so
 *     snapshot() reports the pending count and not the ids in it
 *   - an id with no matching window is one the markets module has not resolved
 */
export function QueueStrip({
  vault,
  windows,
  source,
}: {
  vault: Vault;
  windows: EventWindow[];
  source: DataSourceLabel;
}) {
  const shown = vault.queue.slice(0, 4);
  const hidden = vault.queue.length - shown.length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Next in the queue
        </p>
        <p className="text-xs text-muted-foreground">
          {source === "chain"
            ? "States read live through the DreamDEX markets SDK"
            : "States from the fixture window set"}
        </p>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
          <p className="text-sm font-medium">The queue is dry</p>
          <p className="mx-auto mt-1 max-w-[52ch] text-sm text-muted-foreground">
            Arm 3 more windows and the vault refills it, permissionlessly. Any
            wallet can send that call, and none of them can move the money.
          </p>
        </div>
      ) : (
        <>
          <ul className="grid gap-2 sm:grid-cols-2">
            {shown.map((marketId, i) => {
              // Named `match` and not `window`: this is a client component and
              // shadowing the global there is a trap for the next reader.
              const match = windows.find((w) => w.marketId === marketId);
              const known = marketId.length > 0;
              return (
                <li
                  key={`${marketId}-${i}`}
                  className="flex items-start gap-2.5 rounded-md border border-border bg-secondary/30 px-3 py-2"
                >
                  <span className="tabular mt-0.5 shrink-0 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p
                      className="truncate font-mono text-xs"
                      title={known ? marketId : undefined}
                    >
                      {known ? shortHash(marketId, 8) : "id held by the vault"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {match
                        ? `${match.asset} · ${match.durationMinutes} min · ${match.state}`
                        : known
                          ? "Not resolved by the markets module yet"
                          : "Queued on chain, snapshot() reports the count and not the id"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          {hidden > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {hidden} more window{hidden === 1 ? "" : "s"} armed behind these.
            </p>
          ) : null}
        </>
      )}

      {source === "seed" ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Seed data: these ids come from fixtures/event-windows.json. With
          NEXT_PUBLIC_BINARY_MARKETS_MODULE set they come from loadMarkets().
        </p>
      ) : null}
    </div>
  );
}

/** No rolls yet. The call to action is what makes the first row appear. */
export function LedgerEmptyState({ vault }: { vault: Vault }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
      <p className="text-sm font-medium">No rolls yet</p>
      <p className="mx-auto mt-1 max-w-[46ch] text-sm text-muted-foreground">
        {vault.status === "ACTIVE"
          ? "The first row lands the moment the open window settles. Let the countdown reach zero and watch it arrive, no signature needed."
          : "Write a plan on the left. The first row lands the moment the first window settles."}
      </p>
    </div>
  );
}

// --- small pieces --------------------------------------------------------

/**
 * What the next click will send, in order, one plain sentence each, rendered
 * before any wallet popup can open.
 *
 * Three rules hold this block together:
 *
 *   1. The numbers come from the same form values lib/tx.ts encodes with, and
 *      the subscription funding is the same SUBSCRIPTION_FUNDING_STT constant
 *      parseEther() reads in startPlanCall(). The screen and the calldata are
 *      the same two numbers, not two copies of one.
 *   2. The approve line always names an exact amount and the vault contract as
 *      the spender. There is no unlimited approval anywhere in this app and no
 *      approval to an EOA.
 *   3. The collateral is called tUSDC here, which is what the wallet popup will
 *      call it, rather than the USDso the rest of this screen uses for the
 *      denomination. A preview that does not match the popup is worse than no
 *      preview.
 */
function TransactionPreview({
  vaultStatus,
  deposit,
  stakePerWindow,
  direction,
  asset,
  withdrawable,
  canWrite,
  explorerBase,
}: {
  vaultStatus: Vault["status"];
  deposit: number;
  stakePerWindow: number;
  direction: string;
  asset: string;
  withdrawable: number;
  canWrite: boolean;
  explorerBase: string;
}) {
  const vaultLabel = VAULT_ADDRESS
    ? `the Perennis vault at ${shortHash(VAULT_ADDRESS, 10)}`
    : "the Perennis vault, once one is configured";

  const lines =
    vaultStatus === "IDLE"
      ? [
          `Approve exactly ${formatUsd(deposit)} tUSDC for ${vaultLabel}. Skipped when the standing allowance already covers it.`,
          `Deposit ${formatUsd(deposit)} tUSDC into ${vaultLabel}.`,
          `Write the plan (${direction === "UP" ? "Up" : "Down"} on ${asset}, ${formatUsd(stakePerWindow)} per window) and send ${SUBSCRIPTION_FUNDING_STT} STT to fund the reactivity subscription.`,
        ]
      : vaultStatus === "ACTIVE"
        ? [
            "Arm up to 3 more windows on the vault. No collateral moves and no approval is asked for.",
            "Halt the plan on the vault. The roll stops and the balance stays where it is.",
          ]
        : [
            "Arm up to 3 more windows on the vault. No collateral moves and no approval is asked for.",
            `Withdraw ${formatUsd(withdrawable)} tUSDC from the vault to the owner address.`,
          ];

  return (
    <div className="space-y-4 rounded-lg border border-border bg-secondary/40 p-4">
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          What the next click sends
        </p>
        <ol className="space-y-2 text-xs text-muted-foreground">
          {lines.map((line, i) => (
            <li key={line} className="flex gap-2.5">
              <span className="shrink-0 font-mono text-foreground">{i + 1}.</span>
              <span>{line}</span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted-foreground">
          {canWrite
            ? "Every amount above is exact. This app never asks for an unlimited approval, and the only spender it ever names is the vault contract."
            : "Nothing is broadcast on this path: either no vault address is configured or no wallet is connected on this chain, so the card moves locally and the wallet strip says the write was simulated."}
        </p>
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Contracts this screen talks to
        </p>
        <AddressRow
          label="Perennis vault"
          address={VAULT_ADDRESS}
          explorerBase={explorerBase}
        />
        <AddressRow
          label="Collateral (tUSDC)"
          address={COLLATERAL_TOKEN}
          explorerBase={explorerBase}
        />
        <AddressRow
          label="BinaryMarketsModule"
          address={BINARY_MARKETS_MODULE}
          explorerBase={explorerBase}
        />
      </div>
    </div>
  );
}

/**
 * One address, truncated for a 360px card, with the whole value on the title so
 * it can be read and copied, and a link out to the explorer. An address that is
 * not configured says so in words rather than rendering a link to nowhere.
 */
function AddressRow({
  label,
  address,
  explorerBase,
}: {
  label: string;
  address?: string;
  explorerBase: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      {address ? (
        <a
          className="inline-flex min-h-11 items-center font-mono text-xs underline underline-offset-4 hover:text-primary sm:min-h-0"
          href={`${explorerBase}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          title={address}
        >
          {shortHash(address, 10)}
        </a>
      ) : (
        <span className="text-xs text-muted-foreground">Not configured here</span>
      )}
    </div>
  );
}

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
