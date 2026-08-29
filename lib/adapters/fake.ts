// Fixture adapter.
//
// Deliberately imports no viem and no chain client, so nothing in this file can
// drag the RPC layer into a bundle. It is the default everywhere: a fresh
// checkout with an empty .env.local runs the whole demo path off this file.

import { eventWindows, vaults } from "@/lib/data/seed";
import type {
  ApiResponse,
  EventWindow,
  MarketDiscovery,
  RollEntry,
  Vault,
} from "@/lib/types";
import type { PerennisAdapter } from "./types";

/** tUSDC on Shannon is 6 decimals. The chain adapter reads it off the token. */
const SEED_DECIMALS = 6;

/**
 * `note` is set when the caller asked for the chain and did not get it, for
 * example ADAPTER_MODE=real with no vault address. The console badge shows it
 * so a fallback never looks like a working chain read.
 */
export function createFakeAdapter(note?: string): PerennisAdapter {
  const wrap = <T>(data: T): ApiResponse<T> => ({
    source: "seed",
    data,
    ...(note ? { note } : {}),
  });

  return {
    async getEventWindows(): Promise<ApiResponse<EventWindow[]>> {
      return wrap(eventWindows);
    },
    async getVaults(): Promise<ApiResponse<Vault[]>> {
      return wrap(vaults);
    },
    async getCollateralDecimals(): Promise<ApiResponse<number>> {
      return wrap(SEED_DECIMALS);
    },
    // Vault 02 is the seeded live vault, the one the console opens on and the
    // one the chain adapter replaces with the deployed vault.
    async getRollLedger(): Promise<ApiResponse<RollEntry[]>> {
      return wrap(vaults[1].ledger);
    },
    // No SDK call is made on this path and none is claimed. The fixtures are the
    // seed level of lib/markets.ts, reported as exactly that.
    async getMarketDiscovery(): Promise<ApiResponse<MarketDiscovery>> {
      return wrap({
        via: "seed",
        windowCount: eventWindows.length,
        sdkResolved: false,
      });
    },
  };
}

export const fakeAdapter = createFakeAdapter();
