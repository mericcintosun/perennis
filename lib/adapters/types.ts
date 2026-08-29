// The adapter seam.
//
// Every screen and every API handler reads through this interface and never
// calls lib/dreamdex.ts or lib/data/seed.ts directly. Phase 2 swaps the fake
// implementation for the chain one behind getAdapter() without a page file
// changing, which is the whole point of the seam.

import type { ApiResponse, EventWindow, Vault } from "@/lib/types";

export interface PerennisAdapter {
  getEventWindows(): Promise<ApiResponse<EventWindow[]>>;
  getVaults(): Promise<ApiResponse<Vault[]>>;
  getCollateralDecimals(): Promise<ApiResponse<number>>;
}

/** Accepted values of ADAPTER_MODE. Anything else is treated as "fake". */
export type AdapterMode = "fake" | "real";
