// Domain types for Perennis.
//
// Everything the console, the adapters and the API handlers pass around is
// declared here, so a screen never has to import from a data module to learn a
// shape. Values live in lib/data/seed.ts (fixtures) or come off the chain
// through lib/dreamdex.ts, and both are served through lib/adapters.
//
// Market ids, prices and lifecycle states follow the DreamDEX binary market
// model: outcome contracts trade between 1 and 99 cents and settle at 1 USDso
// (winner) or 0 (loser), with a voided market paying 0.5 to both sides.

export type Direction = "UP" | "DOWN";
export type Asset = "BTC" | "ETH";

/** Whether a screen is showing chain reads or the fixture set. */
export type DataSourceLabel = "chain" | "seed";

/** DreamDEX market lifecycle. Only "Trading" accepts orders. */
export type MarketState =
  | "Listed"
  | "Trading"
  | "Locked"
  | "Resolved"
  | "Voided";

export interface EventWindow {
  /**
   * Market id, written in the shortened form the DreamDEX UI shows. The chain
   * path in lib/dreamdex.ts pads it back out to bytes32.
   */
  marketId: string;
  asset: Asset;
  /** Human readable question the window resolves. */
  question: string;
  durationMinutes: 15 | 60;
  opensAt: string;
  locksAt: string;
  state: MarketState;
  /** Best ask in cents for the UP outcome token, 1 to 99. */
  upAskCents: number;
  /** Best ask in cents for the DOWN outcome token, 1 to 99. */
  downAskCents: number;
  /** Resting depth on the book, in USDso. */
  bookDepthUsd: number;
}

/**
 * Which level of lib/markets.ts answered the window read.
 *
 *   "sdk"         @somnia-chain/markets-sdk loadMarkets() plus isBinaryMarket()
 *   "market-ids"  the per id getMarket(bytes32) overlay on the fixture ids
 *   "seed"        fixtures/event-windows.json
 *
 * Reported by GET /api/health so a deployment can say which one it is on
 * without anyone reading a log.
 */
export type MarketDiscoveryPath = "sdk" | "market-ids" | "seed";

export interface MarketDiscovery {
  via: MarketDiscoveryPath;
  /** Windows the level that answered produced. */
  windowCount: number;
  /** True when the SDK package loaded and exposed both functions this app calls. */
  sdkResolved: boolean;
}

export type RollOutcome = "WON" | "LOST" | "VOIDED";

export interface RollEntry {
  index: number;
  marketId: string;
  asset: Asset;
  direction: Direction;
  /** Entry price in cents paid per outcome contract. */
  entryCents: number;
  stake: number;
  outcome: RollOutcome;
  payout: number;
  balanceAfter: number;
  settledAt: string;
  blockNumber: number;
  txHash: string;
  /**
   * "reactivity" means the row was written by the validator synthetic call in the
   * settlement block, with no user wallet involved. "manual" means someone called
   * the vault themselves.
   */
  trigger: "reactivity" | "manual";
}

export interface StopRules {
  /** Halt after this many consecutive losing windows. */
  maxConsecutiveLosses: number;
  /** Halt if the vault balance falls to or below this figure, in USDso. */
  floorBalance: number;
  /** Halt once the vault balance reaches this figure, in USDso. */
  takeProfit: number;
}

export interface Plan {
  asset: Asset;
  direction: Direction;
  stakePerWindow: number;
  windows: number;
  rules: StopRules;
}

export type VaultStatus = "IDLE" | "ACTIVE" | "STOPPED" | "COMPLETED";

export type StopReason =
  | "consecutive-losses"
  | "floor-balance"
  | "take-profit"
  | "plan-complete"
  | "owner-halt"
  | null;

export interface SubscriptionHealth {
  /** Reactivity subscription id returned by the precompile at 0x0100. */
  subscriptionId: number | null;
  /** Gas budget left with the subscription owner, in STT. */
  gasBudgetStt: number;
  /** Gas a single handler run has cost so far, worst case observed. */
  worstCaseHandlerGas: number;
  priorityFeeGwei: number;
}

export interface Vault {
  id: string;
  /** Deployed PerennisVault clone address on Shannon. */
  address: string;
  label: string;
  /** Collateral held by the vault, in USDso (tUSDC on Shannon). */
  balance: number;
  depositTotal: number;
  status: VaultStatus;
  stopReason: StopReason;
  plan: Plan | null;
  windowsFilled: number;
  consecutiveLosses: number;
  /** Market ids pre-written into the vault queue at plan time. */
  queue: string[];
  /** The window the vault is currently holding a position in. */
  openMarketId: string | null;
  subscription: SubscriptionHealth;
  ledger: RollEntry[];
}

/** Where a given screen's numbers came from. Shown in the console header. */
export type DataSource = DataSourceLabel;

/**
 * The one response shape every adapter method and every API handler returns, so
 * a caller can always say which of the two paths produced the numbers it is
 * about to render.
 */
export interface ApiResponse<T> {
  source: DataSource;
  data: T;
  /** Set when the chain path was attempted and failed, or was skipped. */
  note?: string;
}
