// Seed data for the Perennis console.
//
// Everything here is shaped exactly like what the live adapters in lib/dreamdex.ts
// return once NEXT_PUBLIC_CONTRACT_ADDRESS and NEXT_PUBLIC_BINARY_MARKETS_MODULE
// are set, so swapping the mock for the chain is a data-source change, not a
// refactor. Market ids, prices and lifecycle states follow the DreamDEX binary
// market model: outcome contracts trade between 1 and 99 cents and settle at
// 1 USDso (winner) or 0 (loser), with a voided market paying 0.5 to both sides.

export type Direction = "UP" | "DOWN";
export type Asset = "BTC" | "ETH";

/** Whether a screen is showing chain reads or the seed set in this file. */
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

/**
 * The window queue. In production this comes from loadMarkets() filtered by
 * isBinaryMarket(); here it is twelve consecutive 15 minute BTC and ETH windows
 * on the afternoon of 2 September 2026, which is what a real Shannon session
 * looks like.
 */
export const eventWindows: EventWindow[] = [
  {
    marketId: "0x9a41c7e0b2f5486d8e13a7c04b9f2d61",
    asset: "BTC",
    question: "BTC above 112,400 at 14:15 UTC",
    durationMinutes: 15,
    opensAt: "2026-09-02T14:00:00.000Z",
    locksAt: "2026-09-02T14:15:00.000Z",
    state: "Resolved",
    upAskCents: 52,
    downAskCents: 49,
    bookDepthUsd: 8420,
  },
  {
    marketId: "0x3d77b18ce4a90f25b6c81de07f4a2938",
    asset: "BTC",
    question: "BTC above 112,650 at 14:30 UTC",
    durationMinutes: 15,
    opensAt: "2026-09-02T14:15:00.000Z",
    locksAt: "2026-09-02T14:30:00.000Z",
    state: "Resolved",
    upAskCents: 47,
    downAskCents: 54,
    bookDepthUsd: 7960,
  },
  {
    marketId: "0xc508e2a4917bd36f0a2c74e8b15d9f43",
    asset: "BTC",
    question: "BTC above 112,900 at 14:45 UTC",
    durationMinutes: 15,
    opensAt: "2026-09-02T14:30:00.000Z",
    locksAt: "2026-09-02T14:45:00.000Z",
    state: "Resolved",
    upAskCents: 55,
    downAskCents: 46,
    bookDepthUsd: 9110,
  },
  {
    marketId: "0x71b0d94fa3e5c827106bd4f92a83e7c5",
    asset: "BTC",
    question: "BTC above 113,050 at 15:00 UTC",
    durationMinutes: 15,
    opensAt: "2026-09-02T14:45:00.000Z",
    locksAt: "2026-09-02T15:00:00.000Z",
    state: "Trading",
    upAskCents: 51,
    downAskCents: 50,
    bookDepthUsd: 10480,
  },
  {
    marketId: "0x2e64af08d1c73b95e07a2f6b8c410de9",
    asset: "BTC",
    question: "BTC above 113,200 at 15:15 UTC",
    durationMinutes: 15,
    opensAt: "2026-09-02T15:00:00.000Z",
    locksAt: "2026-09-02T15:15:00.000Z",
    state: "Listed",
    upAskCents: 49,
    downAskCents: 52,
    bookDepthUsd: 6240,
  },
  {
    marketId: "0x8fc3175be92a0d46c58e3b71f204a6d8",
    asset: "BTC",
    question: "BTC above 113,350 at 15:30 UTC",
    durationMinutes: 15,
    opensAt: "2026-09-02T15:15:00.000Z",
    locksAt: "2026-09-02T15:30:00.000Z",
    state: "Listed",
    upAskCents: 48,
    downAskCents: 53,
    bookDepthUsd: 5870,
  },
  {
    marketId: "0x46a9e02c8b7d1530e4c92a7b681df8c2",
    asset: "BTC",
    question: "BTC above 113,500 at 15:45 UTC",
    durationMinutes: 15,
    opensAt: "2026-09-02T15:30:00.000Z",
    locksAt: "2026-09-02T15:45:00.000Z",
    state: "Listed",
    upAskCents: 53,
    downAskCents: 48,
    bookDepthUsd: 5310,
  },
  {
    marketId: "0xb27f4d9016ae83c5720d1e6fa94b3c80",
    asset: "BTC",
    question: "BTC above 113,600 at 16:00 UTC",
    durationMinutes: 15,
    opensAt: "2026-09-02T15:45:00.000Z",
    locksAt: "2026-09-02T16:00:00.000Z",
    state: "Listed",
    upAskCents: 50,
    downAskCents: 51,
    bookDepthUsd: 4990,
  },
  {
    marketId: "0x0d51ca387e6b249f18a0c73df5216be4",
    asset: "ETH",
    question: "ETH above 4,180 at 15:00 UTC",
    durationMinutes: 15,
    opensAt: "2026-09-02T14:45:00.000Z",
    locksAt: "2026-09-02T15:00:00.000Z",
    state: "Trading",
    upAskCents: 46,
    downAskCents: 55,
    bookDepthUsd: 6720,
  },
  {
    marketId: "0xe93b6f10d84c2a57093be5d7126af408",
    asset: "ETH",
    question: "ETH above 4,195 at 15:15 UTC",
    durationMinutes: 15,
    opensAt: "2026-09-02T15:00:00.000Z",
    locksAt: "2026-09-02T15:15:00.000Z",
    state: "Listed",
    upAskCents: 52,
    downAskCents: 49,
    bookDepthUsd: 5480,
  },
  {
    marketId: "0x5c18709ad3f6be24801c9e5b7fa02d36",
    asset: "ETH",
    question: "ETH above 4,210 at 15:30 UTC",
    durationMinutes: 15,
    opensAt: "2026-09-02T15:15:00.000Z",
    locksAt: "2026-09-02T15:30:00.000Z",
    state: "Listed",
    upAskCents: 54,
    downAskCents: 47,
    bookDepthUsd: 4130,
  },
  {
    marketId: "0xa70e2d5c93186bf4025d8a1e6c73409b",
    asset: "ETH",
    question: "ETH above 4,225 at 15:45 UTC",
    durationMinutes: 15,
    opensAt: "2026-09-02T15:30:00.000Z",
    locksAt: "2026-09-02T15:45:00.000Z",
    state: "Listed",
    upAskCents: 47,
    downAskCents: 54,
    bookDepthUsd: 3880,
  },
];

export const vaults: Vault[] = [
  {
    id: "vault-01",
    address: "0x4Ae1b83Cd07f52196e0C4bA9d3F8e7215c0aB6D4",
    label: "Vault 01",
    balance: 0,
    depositTotal: 0,
    status: "IDLE",
    stopReason: null,
    plan: null,
    windowsFilled: 0,
    consecutiveLosses: 0,
    queue: [],
    openMarketId: null,
    subscription: {
      subscriptionId: null,
      gasBudgetStt: 12.4,
      worstCaseHandlerGas: 0,
      priorityFeeGwei: 6,
    },
    ledger: [],
  },
  {
    id: "vault-02",
    address: "0xD91c47Ea60b2f5384c17aB9e05D6f8213B7c4E90",
    label: "Vault 02",
    // 218.53 after the third roll, less the 25 staked into the open window.
    balance: 193.53,
    depositTotal: 200,
    status: "ACTIVE",
    stopReason: null,
    plan: {
      asset: "BTC",
      direction: "UP",
      stakePerWindow: 25,
      windows: 8,
      rules: { maxConsecutiveLosses: 2, floorBalance: 100, takeProfit: 320 },
    },
    windowsFilled: 3,
    consecutiveLosses: 0,
    queue: [
      "0x2e64af08d1c73b95e07a2f6b8c410de9",
      "0x8fc3175be92a0d46c58e3b71f204a6d8",
      "0xb27f4d9016ae83c5720d1e6fa94b3c80",
    ],
    openMarketId: "0x71b0d94fa3e5c827106bd4f92a83e7c5",
    subscription: {
      subscriptionId: 41827,
      gasBudgetStt: 9.8,
      worstCaseHandlerGas: 318_400,
      priorityFeeGwei: 8,
    },
    ledger: [
      {
        index: 1,
        marketId: "0x9a41c7e0b2f5486d8e13a7c04b9f2d61",
        asset: "BTC",
        direction: "UP",
        entryCents: 52,
        stake: 25,
        outcome: "WON",
        payout: 48.08,
        balanceAfter: 223.08,
        settledAt: "2026-09-02T14:15:04.000Z",
        blockNumber: 18_402_771,
        txHash:
          "0x7c2e9a4b13d05f86e2a7c1904bd53f8e620a94c7d1b8e05f39a7c26d418b0f52",
        trigger: "reactivity",
      },
      {
        index: 2,
        marketId: "0x3d77b18ce4a90f25b6c81de07f4a2938",
        asset: "BTC",
        direction: "UP",
        entryCents: 47,
        stake: 25,
        outcome: "LOST",
        payout: 0,
        balanceAfter: 198.08,
        settledAt: "2026-09-02T14:30:03.000Z",
        blockNumber: 18_404_119,
        txHash:
          "0x1f83b0d5c47e29a6015b8d3fe70c4a92836d5b17e0af92c3418d7b06ea5c39f1",
        trigger: "reactivity",
      },
      {
        index: 3,
        marketId: "0xc508e2a4917bd36f0a2c74e8b15d9f43",
        asset: "BTC",
        direction: "UP",
        entryCents: 55,
        stake: 25,
        outcome: "WON",
        payout: 45.45,
        balanceAfter: 218.53,
        settledAt: "2026-09-02T14:45:02.000Z",
        blockNumber: 18_405_486,
        txHash:
          "0x92c0a71e5db38f461072ae9c5b30df84176e2a09c8b514fd73a06e2b91cd478a",
        trigger: "reactivity",
      },
    ],
  },
  {
    id: "vault-03",
    address: "0x6B72f19aE054c38d7129Ab6e0F5d842937Ce1B08",
    label: "Vault 03",
    // Halted before entering a fourth window, so nothing is staked out.
    balance: 164.55,
    depositTotal: 200,
    status: "STOPPED",
    stopReason: "consecutive-losses",
    plan: {
      asset: "ETH",
      direction: "DOWN",
      stakePerWindow: 30,
      windows: 6,
      rules: { maxConsecutiveLosses: 2, floorBalance: 120, takeProfit: 340 },
    },
    windowsFilled: 3,
    consecutiveLosses: 2,
    queue: [],
    openMarketId: null,
    subscription: {
      subscriptionId: 41590,
      gasBudgetStt: 11.1,
      worstCaseHandlerGas: 296_200,
      priorityFeeGwei: 8,
    },
    ledger: [
      {
        index: 1,
        marketId: "0x0d51ca387e6b249f18a0c73df5216be4",
        asset: "ETH",
        direction: "DOWN",
        entryCents: 55,
        stake: 30,
        outcome: "WON",
        payout: 54.55,
        balanceAfter: 224.55,
        settledAt: "2026-09-02T13:15:05.000Z",
        blockNumber: 18_396_204,
        txHash:
          "0x3ea9714c085d2f6790ab34c1e85f207d9b6a3c04e81f725063ad19b40c7e2f58",
        trigger: "reactivity",
      },
      {
        index: 2,
        marketId: "0xe93b6f10d84c2a57093be5d7126af408",
        asset: "ETH",
        direction: "DOWN",
        entryCents: 49,
        stake: 30,
        outcome: "LOST",
        payout: 0,
        balanceAfter: 194.55,
        settledAt: "2026-09-02T13:30:02.000Z",
        blockNumber: 18_397_573,
        txHash:
          "0xb4160fa9d27e35c8017b4e2a96df530c81a7f460b2e9d5310c84a7f6e02b953d",
        trigger: "reactivity",
      },
      {
        index: 3,
        marketId: "0x5c18709ad3f6be24801c9e5b7fa02d36",
        asset: "ETH",
        direction: "DOWN",
        entryCents: 47,
        stake: 30,
        outcome: "LOST",
        payout: 0,
        balanceAfter: 164.55,
        settledAt: "2026-09-02T13:45:04.000Z",
        blockNumber: 18_398_941,
        txHash:
          "0x58d17e0b93ca246f0817b5e3d90fa62c4718e0a35bd692c1704fa8e35b160d27",
        trigger: "reactivity",
      },
    ],
  },
];

/** Defaults the plan builder opens with. Matches the 90 second demo script. */
export const planDefaults = {
  deposit: 200,
  asset: "BTC" as Asset,
  direction: "UP" as Direction,
  stakePerWindow: 25,
  windows: 8,
  maxConsecutiveLosses: 2,
  floorBalance: 100,
  takeProfit: 320,
};
