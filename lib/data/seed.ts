// Seed values for the Perennis console.
//
// The numbers live in fixtures/*.json so scripts/seed.mjs can validate them
// without importing TypeScript, and so Phase 2 can diff a chain read against a
// file rather than against a literal buried in a module.
//
// Everything here is shaped exactly like what the chain adapter returns once
// NEXT_PUBLIC_CONTRACT_ADDRESS and NEXT_PUBLIC_BINARY_MARKETS_MODULE are set, so
// swapping fixtures for the chain is a data source change and not a refactor.

import eventWindowsJson from "@/fixtures/event-windows.json";
import vaultsJson from "@/fixtures/vaults.json";

import type { Asset, Direction, EventWindow, Vault } from "@/lib/types";

// JSON.parse widens every string to `string` and every null to `null`, so
// TypeScript cannot see that "Trading" is a MarketState or that stopReason is a
// StopReason. scripts/seed.mjs is what actually guards these files, so the cast
// is the assertion and the seed script is the check.
export const eventWindows = eventWindowsJson as unknown as EventWindow[];
export const vaults = vaultsJson as unknown as Vault[];

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
