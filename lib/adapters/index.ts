// Adapter selection.
//
// One env var decides which implementation the whole app reads through:
//
//   ADAPTER_MODE=fake   fixtures only, no RPC (the default)
//   ADAPTER_MODE=real   chain reads through lib/dreamdex.ts
//
// Fake is the default on purpose. A missing or misspelled value gives a working
// console rather than a blank page, and asking for the chain without a deployed
// vault falls back to fixtures with the reason attached so the console badge can
// say why.

import { createFakeAdapter, fakeAdapter } from "./fake";
import { chainAdapter } from "./chain";
import type { AdapterMode, PerennisAdapter } from "./types";

export type { AdapterMode, PerennisAdapter } from "./types";

export function adapterMode(): AdapterMode {
  return process.env.ADAPTER_MODE === "real" ? "real" : "fake";
}

export function vaultAddressSet(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CONTRACT_ADDRESS);
}

export function getAdapter(): PerennisAdapter {
  if (adapterMode() !== "real") return fakeAdapter;

  if (!vaultAddressSet()) {
    return createFakeAdapter(
      "ADAPTER_MODE is real but NEXT_PUBLIC_CONTRACT_ADDRESS is empty, so this screen is on seed data."
    );
  }

  return chainAdapter;
}
