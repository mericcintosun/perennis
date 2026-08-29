// Chain adapter.
//
// A thin wrapper over the reads in lib/dreamdex.ts. Those functions keep their
// own fixture fallback in the same body and never throw, so a failed RPC call
// comes back here as source "seed" with a note rather than as an exception.
//
// No process.env read lives here. Whether the collateral token is configured is
// a question for lib/config.ts, and this file asks it there.

import {
  fetchCollateralDecimals,
  fetchEventWindows,
  fetchRollLedger,
  fetchVaults,
} from "@/lib/dreamdex";
import { discoverEventWindows } from "@/lib/markets";
import { COLLATERAL_TOKEN } from "@/lib/config";
import { coreFailure, failureNote } from "@/lib/errors";
import type {
  ApiResponse,
  EventWindow,
  MarketDiscovery,
  RollEntry,
  Vault,
} from "@/lib/types";
import type { PerennisAdapter } from "./types";

export const chainAdapter: PerennisAdapter = {
  async getEventWindows(): Promise<ApiResponse<EventWindow[]>> {
    return fetchEventWindows();
  },

  async getVaults(): Promise<ApiResponse<Vault[]>> {
    return fetchVaults();
  },

  async getCollateralDecimals(): Promise<ApiResponse<number>> {
    const decimals = await fetchCollateralDecimals();
    return COLLATERAL_TOKEN
      ? { source: "chain", data: decimals }
      : {
          source: "seed",
          data: decimals,
          note: failureNote(
            coreFailure(
              "not-configured",
              "No collateral token address is set, so 6 decimals is assumed."
            )
          ),
        };
  },

  async getRollLedger(): Promise<ApiResponse<RollEntry[]>> {
    return fetchRollLedger();
  },

  // Straight from lib/markets.ts, so the health probe reports the level that
  // actually answered rather than the level this deployment asked for.
  async getMarketDiscovery(): Promise<ApiResponse<MarketDiscovery>> {
    const { response, via, sdkResolved } = await discoverEventWindows();
    return {
      source: response.source,
      data: { via, windowCount: response.data.length, sdkResolved },
      ...(response.note ? { note: response.note } : {}),
    };
  },
};
