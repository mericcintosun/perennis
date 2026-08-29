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
 * How far back getLogs looks for RollSettled. Shannon produces blocks fast, so
 * a wide window is cheap here and still bounded, which matters because some RPC
 * providers reject an unbounded fromBlock.
 */
export const LEDGER_LOOKBACK_BLOCKS = 50_000n;

/** Ledger rows the console ever renders, and the cap on per row RPC follow ups. */
export const MAX_LEDGER_ROWS = 12;

/** Window ids a single armNext call may push. Mirrors MAX_QUEUE_ADD in the contract. */
export const MAX_QUEUE_ADD = 8;
