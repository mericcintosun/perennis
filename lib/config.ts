// Every address, endpoint and tuning constant in one file.
//
// This module imports nothing. In particular it does not import viem, so a
// client component that pulls it in by accident cannot drag the RPC layer into
// the browser bundle. It exports plain values, never a client and never a
// function that opens a socket.
//
// It is also the only place under lib/ that reads process.env, with one
// exception: lib/adapters/index.ts reads ADAPTER_MODE, because the adapter
// selector has to answer that question before any config is loaded. Every key
// read here has a matching line in .env.example.
//
// NEXT_PUBLIC_* reads have to be written as literal member access. Next.js
// replaces them at build time by matching the exact text, so a computed lookup
// like process.env[key] would come back undefined in a production build.

/** A 20 byte EVM address, written the way viem wants it. Declared here so this file needs no viem import. */
export type EvmAddress = `0x${string}`;

function optionalAddress(value: string | undefined): EvmAddress | undefined {
  const trimmed = value?.trim();
  return trimmed ? (trimmed as EvmAddress) : undefined;
}

// --- chain ---------------------------------------------------------------

/** Somnia Shannon testnet. 50312 unless Somnia changes it. */
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 50312);

/** Shannon JSON-RPC endpoint every read goes out on. */
export const RPC_URL =
  process.env.NEXT_PUBLIC_SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network";

/**
 * Optional standby endpoints, comma separated, tried in order when RPC_URL does
 * not answer. Empty by default, which is the shape this app shipped with: one
 * endpoint and nothing else. Read as a literal member access, like every other
 * NEXT_PUBLIC_ key here, because Next.js substitutes these by matching the text.
 */
const RPC_FALLBACK_URLS = (
  process.env.NEXT_PUBLIC_SOMNIA_RPC_FALLBACK_URLS ?? ""
)
  .split(",")
  .map((url) => url.trim())
  .filter((url) => url.length > 0);

/**
 * Every endpoint a read may go out on, primary first, duplicates removed. One
 * entry unless NEXT_PUBLIC_SOMNIA_RPC_FALLBACK_URLS is set, so the default
 * deployment behaves exactly as it did before this list existed.
 */
export const RPC_URLS: readonly string[] = Array.from(
  new Set([RPC_URL, ...RPC_FALLBACK_URLS])
);

/** Block explorer base, used to link every roll transaction from the ledger. */
export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL ??
  "https://shannon-explorer.somnia.network";

// --- deployed contracts --------------------------------------------------

/** The deployed PerennisVault. Undefined means the console stays on fixtures. */
export const VAULT_ADDRESS = optionalAddress(
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
);

/** DreamDEX BinaryMarketsModule on Shannon. */
export const BINARY_MARKETS_MODULE = optionalAddress(
  process.env.NEXT_PUBLIC_BINARY_MARKETS_MODULE
);

/** Collateral token, tUSDC on Shannon. Decimals are read off it, never assumed. */
export const COLLATERAL_TOKEN = optionalAddress(
  process.env.NEXT_PUBLIC_COLLATERAL_TOKEN
);

// --- market discovery ----------------------------------------------------

/**
 * Which level of lib/markets.ts discovery to start at.
 *
 * "sdk" is the default and the one the demo runs on: @somnia-chain/markets-sdk
 * loadMarkets() filtered by isBinaryMarket(), falling through to the per id
 * getMarket read and then to the fixtures on its own. "market-ids" skips the SDK
 * and starts at the per id read. "seed" pins the console to the fixtures, which
 * is what you want when recording without a network.
 *
 * The union is written out here rather than imported, because this file imports
 * nothing. lib/types.ts declares the same three strings as MarketDiscoveryPath.
 * Anything unrecognised is treated as "sdk", the same way a misspelled
 * ADAPTER_MODE gives a working console rather than a blank page.
 */
export const MARKET_DISCOVERY: "sdk" | "market-ids" | "seed" =
  process.env.NEXT_PUBLIC_MARKET_DISCOVERY === "market-ids"
    ? "market-ids"
    : process.env.NEXT_PUBLIC_MARKET_DISCOVERY === "seed"
      ? "seed"
      : "sdk";

/**
 * Somnia reactivity precompile. Fixed by the protocol at 0x0100, so it is a
 * constant here rather than an env key. The same address is hardcoded in
 * contracts/src/PerennisVault.sol and the two must agree.
 */
export const REACTIVITY_PRECOMPILE: EvmAddress =
  "0x0000000000000000000000000000000000000100";

// --- tuning --------------------------------------------------------------

/** How long a single RPC call may take before it is abandoned. */
export const RPC_TIMEOUT_MS = 6000;

/** Retries after the first attempt. One retry, then fall back to fixtures. */
export const RPC_RETRY_COUNT = 1;

/**
 * Pause before the retry. An endpoint that answered 429 or 503 is being asked to
 * shed load, and re-sending the identical request in the same millisecond is the
 * one thing guaranteed not to help. Small enough that the retry still lands
 * inside the page's render budget.
 */
export const RPC_RETRY_BACKOFF_MS = 350;

/**
 * How long a successful chain read stays usable after the fact. A later read
 * that the endpoint refuses serves this instead of dropping the screen to
 * fixtures, so one rejected call does not blank a console that had live numbers
 * seconds earlier. Longer than the 20 second demo refresh, short enough that a
 * genuinely stale figure ages out rather than being shown all afternoon.
 */
export const CHAIN_CACHE_TTL_MS = 45_000;

/**
 * Blocks per eth_getLogs call.
 *
 * This is the constant the QA crawl was failing on. The public Shannon endpoint,
 * like most public JSON-RPC endpoints, caps the block span of a single
 * eth_getLogs and answers a wider request with a rejection rather than a
 * truncated result. The ledger used to ask for the whole lookback in one call
 * and got that rejection every time, which is why a console reading live vault
 * state still showed a fixture ledger. One thousand is the common published cap
 * and is what the scan in lib/dreamdex.ts walks in.
 */
export const LEDGER_CHUNK_BLOCKS = 1_000n;

/** Spans a single ledger scan may walk. Bounds the call count of one render. */
export const LEDGER_MAX_CHUNKS = 10;

/**
 * Wall clock the ledger scan may spend before it returns what it has. The scan
 * stops early as soon as it has MAX_LEDGER_ROWS rows, so this only binds on a
 * vault with no recent settlements, and it keeps that case off the page's
 * render budget.
 */
export const LEDGER_SCAN_BUDGET_MS = 3_000;

/**
 * How far back the scan looks for RollSettled, derived from the two constants
 * above so the span and the budget cannot drift apart. Never block zero: an
 * unbounded fromBlock is the other request shape public endpoints refuse.
 */
export const LEDGER_LOOKBACK_BLOCKS =
  LEDGER_CHUNK_BLOCKS * BigInt(LEDGER_MAX_CHUNKS);

/** Ledger rows the console ever renders, and the cap on per row RPC follow ups. */
export const MAX_LEDGER_ROWS = 12;

/** Window ids a single armNext call may push. Mirrors MAX_QUEUE_ADD in the contract. */
export const MAX_QUEUE_ADD = 8;

// --- the write path ------------------------------------------------------

/**
 * Native STT carried by the startPlan transaction, as a decimal string parsed
 * with parseEther at call time. startPlan is payable and the subscription is
 * funded out of msg.value, because the owner is billed for every handler run: a
 * plan sent with no value opens a subscription that cannot pay for a roll.
 *
 * A string rather than a number on purpose. 0.05 has no exact float
 * representation, and parseEther on the string is exact.
 */
export const SUBSCRIPTION_FUNDING_STT =
  process.env.NEXT_PUBLIC_SUBSCRIPTION_FUNDING_STT ?? "0.05";

/**
 * Confirmations waited for before a transaction is reported as confirmed.
 * Shannon produces blocks fast, so one is enough for a demo and keeps the wow
 * moment inside its five second budget. Raise it if you are recording against a
 * chain that reorganises.
 */
export const TX_CONFIRMATIONS = Number(
  process.env.NEXT_PUBLIC_TX_CONFIRMATIONS ?? 1
);
