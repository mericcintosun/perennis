// The adapter seam.
//
// Every screen and every API handler reads through this interface and never
// calls lib/dreamdex.ts or lib/data/seed.ts directly. Phase 2 put two of these
// methods on the chain (getVaults and getRollLedger) without a page file
// changing, which is the whole point of the seam.
//
// Both implementations satisfy the same interface: lib/adapters/fake.ts answers
// from fixtures/*.json with no viem import, lib/adapters/chain.ts answers from
// lib/dreamdex.ts. Adding a method here means adding it to both.

import type { ApiResponse, EventWindow, RollEntry, Vault } from "@/lib/types";

export interface PerennisAdapter {
  getEventWindows(): Promise<ApiResponse<EventWindow[]>>;
  getVaults(): Promise<ApiResponse<Vault[]>>;
  getCollateralDecimals(): Promise<ApiResponse<number>>;
  /**
   * The roll ledger on its own, without the vault snapshot around it. The chain
   * implementation builds it from RollSettled logs, so every row carries a real
   * transaction hash the Shannon explorer will open.
   */
  getRollLedger(): Promise<ApiResponse<RollEntry[]>>;
}

/** Accepted values of ADAPTER_MODE. Anything else is treated as "fake". */
export type AdapterMode = "fake" | "real";
