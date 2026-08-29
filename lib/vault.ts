// The roll engine.
//
// This is a TypeScript mirror of the settlement path inside
// contracts/src/PerennisVault.sol, so the console can show exactly what the
// contract will do before a single transaction is signed. Keep the two in sync:
// if you change a stop rule here, change it in _settleAndRoll too.
//
// Order of operations on every settlement, same as the contract:
//   1. redeem the outcome token from the window that just resolved
//   2. update balance, consecutive loss counter and the roll ledger
//   3. evaluate the three stop rules
//   4. if the plan is still live, take the next market id off the queue and enter

import type {
  Direction,
  EventWindow,
  Plan,
  RollEntry,
  RollOutcome,
  StopReason,
  Vault,
} from "./types";

/** Deterministic 32 bit hash so a given market id always resolves the same way. */
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** Ask price in cents for the side the plan is on. */
export function entryPriceCents(window: EventWindow, direction: Direction) {
  return direction === "UP" ? window.upAskCents : window.downAskCents;
}

/**
 * Outcome contracts pay 1 USDso if the window resolves your way, 0 if it does
 * not. Buying at 52 cents with a 25 USDso stake gets you 48.08 contracts.
 */
export function contractsBought(stake: number, priceCents: number) {
  return stake / (priceCents / 100);
}

/**
 * Resolve a window. The chain decides this for real; here the market id seeds a
 * deterministic draw weighted by the implied probability on the book, so demo
 * runs are repeatable and a given vault always tells the same story.
 */
export function resolveWindow(
  window: EventWindow,
  direction: Direction
): RollOutcome {
  const draw = hashSeed(window.marketId + direction);
  // Roughly 1 window in 40 gets voided by the oracle, matching what Shannon does
  // when the price feed is missing at lock time.
  if (draw > 0.975) return "VOIDED";
  const implied = entryPriceCents(window, direction) / 100;
  return draw < implied ? "WON" : "LOST";
}

export interface RollResult {
  vault: Vault;
  entry: RollEntry;
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Evaluate the three stop rules against a post-settlement balance. Returns the
 * reason the plan halts, or null when it stays live. This is the whole risk
 * layer: on an instrument that pays 1 or 0, a rolling plan without stops turns
 * into a martingale.
 */
export function evaluateStops(
  plan: Plan,
  balance: number,
  consecutiveLosses: number,
  windowsFilled: number
): StopReason {
  if (consecutiveLosses >= plan.rules.maxConsecutiveLosses) {
    return "consecutive-losses";
  }
  if (balance <= plan.rules.floorBalance) return "floor-balance";
  if (balance >= plan.rules.takeProfit) return "take-profit";
  if (windowsFilled >= plan.windows) return "plan-complete";
  if (balance < plan.stakePerWindow) return "floor-balance";
  return null;
}

/**
 * Settle the open window and, if the plan survives the stop rules, enter the
 * next one off the queue. Pure: returns a new vault rather than mutating.
 */
export function settleAndRoll(
  vault: Vault,
  windows: EventWindow[],
  settledAt: Date
): RollResult | null {
  const plan = vault.plan;
  if (!plan || vault.status !== "ACTIVE" || !vault.openMarketId) return null;

  const open = windows.find((w) => w.marketId === vault.openMarketId);
  if (!open) return null;

  const entryCents = entryPriceCents(open, plan.direction);
  const contracts = contractsBought(plan.stakePerWindow, entryCents);
  const outcome = resolveWindow(open, plan.direction);

  // Winner redeems 1 USDso per contract, loser redeems 0, a voided market pays
  // 0.5 to both sides.
  const payout =
    outcome === "WON" ? contracts : outcome === "VOIDED" ? contracts * 0.5 : 0;

  const balance = round2(vault.balance + payout);
  const consecutiveLosses = outcome === "LOST" ? vault.consecutiveLosses + 1 : 0;
  const windowsFilled = vault.windowsFilled + 1;
  const index = vault.ledger.length + 1;

  const entry: RollEntry = {
    index,
    marketId: open.marketId,
    asset: open.asset,
    direction: plan.direction,
    entryCents,
    stake: plan.stakePerWindow,
    outcome,
    payout: round2(payout),
    balanceAfter: balance,
    settledAt: settledAt.toISOString(),
    blockNumber: 18_405_486 + index * 1_367,
    txHash: syntheticTxHash(open.marketId, index),
    trigger: "reactivity",
  };

  const stopReason = evaluateStops(
    plan,
    balance,
    consecutiveLosses,
    windowsFilled
  );

  // Next window comes off the queue that was written at plan time. An empty
  // queue is not a failure: the vault holds the balance and waits for armNext.
  const queue = [...vault.queue];
  let openMarketId: string | null = null;
  let nextBalance = balance;

  if (!stopReason) {
    const next = queue.shift();
    if (next) {
      openMarketId = next;
      nextBalance = round2(balance - plan.stakePerWindow);
    }
  }

  const status = stopReason
    ? stopReason === "plan-complete" || stopReason === "take-profit"
      ? "COMPLETED"
      : "STOPPED"
    : "ACTIVE";

  return {
    entry,
    vault: {
      ...vault,
      balance: nextBalance,
      status,
      stopReason,
      consecutiveLosses,
      windowsFilled,
      queue,
      openMarketId,
      ledger: [...vault.ledger, entry],
      subscription: {
        ...vault.subscription,
        gasBudgetStt: round2(Math.max(0, vault.subscription.gasBudgetStt - 0.4)),
        worstCaseHandlerGas: Math.max(
          vault.subscription.worstCaseHandlerGas,
          291_000 + Math.floor(hashSeed(open.marketId) * 40_000)
        ),
      },
    },
  };
}

/**
 * Roll transactions are produced by validators in the settlement block, not sent
 * from the owner's wallet, so the hash is derived from the market and the roll
 * index rather than from a nonce.
 */
function syntheticTxHash(marketId: string, index: number) {
  const a = Math.floor(hashSeed(marketId + index) * 0xffffffff)
    .toString(16)
    .padStart(8, "0");
  const b = Math.floor(hashSeed(marketId + "b" + index) * 0xffffffff)
    .toString(16)
    .padStart(8, "0");
  return `0x${a}${b}${a.split("").reverse().join("")}${b}${a}${b
    .split("")
    .reverse()
    .join("")}${a}${b}`.slice(0, 66);
}

export function realizedPnl(vault: Vault) {
  if (vault.depositTotal === 0) return 0;
  const staked = vault.openMarketId && vault.plan ? vault.plan.stakePerWindow : 0;
  return round2(vault.balance + staked - vault.depositTotal);
}

export function winRate(vault: Vault) {
  const settled = vault.ledger.filter((e) => e.outcome !== "VOIDED");
  if (settled.length === 0) return null;
  const won = settled.filter((e) => e.outcome === "WON").length;
  return Math.round((won / settled.length) * 100);
}

export function formatUsd(n: number) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function shortHash(hash: string, lead = 8) {
  return `${hash.slice(0, lead)}...${hash.slice(-6)}`;
}

// --- pre-write safety checks --------------------------------------------

export interface PreflightCheck {
  id: string;
  label: string;
  detail: string;
  ok: boolean;
}

/**
 * What the vault verifies before it is allowed to write. Rendered as the health
 * strip under the vault card so a delayed handler reads as a designed state and
 * not as a bug: the doc warns that a low priorityFeePerGas can defer a handler
 * run indefinitely.
 */
export function preflight(
  window: EventWindow | null,
  vault: Vault,
  decimals: number
): PreflightCheck[] {
  const sub = vault.subscription;
  const gasOk = sub.gasBudgetStt >= 2 && sub.subscriptionId !== null;
  const queueOk = vault.status !== "ACTIVE" || vault.queue.length > 0;
  const stakeOk = !vault.plan || vault.balance >= vault.plan.stakePerWindow;

  return [
    {
      id: "market-state",
      label: "Market state",
      detail: window
        ? window.state === "Trading"
          ? "Trading, accepting orders"
          : `${window.state}, orders rejected`
        : "No open window",
      ok: window?.state === "Trading",
    },
    {
      id: "decimals",
      label: "Collateral decimals",
      detail: `${decimals} decimals, read from the token contract`,
      ok: true,
    },
    {
      id: "subscription",
      label: "Reactivity subscription",
      detail: sub.subscriptionId
        ? `#${sub.subscriptionId}, ${sub.gasBudgetStt.toFixed(1)} STT left, ${sub.priorityFeeGwei} gwei priority`
        : "Not opened yet",
      ok: gasOk,
    },
    {
      id: "queue",
      label: "Window queue",
      detail: queueOk
        ? `${vault.queue.length} window${vault.queue.length === 1 ? "" : "s"} armed ahead`
        : "Empty, balance held until armNext refills it",
      ok: queueOk,
    },
    {
      id: "stake",
      label: "Stake coverage",
      detail: stakeOk
        ? "Balance covers the next stake"
        : "Below one stake, the floor rule halts the plan",
      ok: stakeOk,
    },
  ];
}

export function stopReasonLabel(reason: StopReason): string {
  switch (reason) {
    case "consecutive-losses":
      return "Halted: consecutive loss limit hit";
    case "floor-balance":
      return "Halted: balance reached the floor";
    case "take-profit":
      return "Closed: take profit reached";
    case "plan-complete":
      return "Closed: every window in the plan filled";
    case "owner-halt":
      return "Halted by the owner";
    default:
      return "Running";
  }
}
