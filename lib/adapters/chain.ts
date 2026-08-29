// Chain adapter.
//
// A thin wrapper over the reads that already exist in lib/dreamdex.ts. Those
// functions keep their own fixture fallback in the same body, so a failed RPC
// call comes back here as source "seed" with a note rather than as a throw.
// Nothing is rewritten here and the markets SDK is not added: that is Phase 2.

import {
  fetchCollateralDecimals,
  fetchEventWindows,
  fetchVaults,
} from "@/lib/dreamdex";
import type { ApiResponse, EventWindow, Vault } from "@/lib/types";
import type { PerennisAdapter } from "./types";

const collateralTokenSet = Boolean(process.env.NEXT_PUBLIC_COLLATERAL_TOKEN);

export const chainAdapter: PerennisAdapter = {
  async getEventWindows(): Promise<ApiResponse<EventWindow[]>> {
    return fetchEventWindows();
  },

  async getVaults(): Promise<ApiResponse<Vault[]>> {
    return fetchVaults();
  },

  async getCollateralDecimals(): Promise<ApiResponse<number>> {
    const decimals = await fetchCollateralDecimals();
    return collateralTokenSet
      ? { source: "chain", data: decimals }
      : {
          source: "seed",
          data: decimals,
          note: "NEXT_PUBLIC_COLLATERAL_TOKEN is empty, using 6 decimals.",
        };
  },
};
