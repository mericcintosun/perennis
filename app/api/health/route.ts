// One place to ask whether this deployment is talking to a chain yet.
//
// This is the readiness probe for the ADAPTER_MODE flip. It reports what is
// configured, never a secret: no RPC key, no private key, no address beyond a
// boolean saying whether one is set. The reactivity precompile is the one
// address printed in full, and it is a protocol constant that is the same for
// everyone.
//
// rollLedgerSource is the field that answers the Phase 2 question: did the roll
// ledger actually come off the chain, or is the console still showing fixtures?

import { NextResponse } from "next/server";
import { adapterMode, getAdapter, vaultAddressSet } from "@/lib/adapters";
import { CHAIN_ID, REACTIVITY_PRECOMPILE } from "@/lib/config";
import type { ApiResponse, DataSource } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Health {
  adapterMode: string;
  chainId: number;
  decimals: number;
  vaultAddressSet: boolean;
  /** Protocol constant, the same on every Somnia deployment. */
  reactivityPrecompile: string;
  /** "chain" once RollSettled logs are being read, "seed" while on fixtures. */
  rollLedgerSource: DataSource;
}

export async function GET() {
  const adapter = getAdapter();
  const [decimals, ledger] = await Promise.all([
    adapter.getCollateralDecimals(),
    adapter.getRollLedger(),
  ]);

  const note = ledger.note ?? decimals.note;

  const body: ApiResponse<Health> = {
    source: decimals.source,
    data: {
      adapterMode: adapterMode(),
      chainId: CHAIN_ID,
      decimals: decimals.data,
      vaultAddressSet: vaultAddressSet(),
      reactivityPrecompile: REACTIVITY_PRECOMPILE,
      rollLedgerSource: ledger.source,
    },
    ...(note ? { note } : {}),
  };

  return NextResponse.json(body, { status: 200 });
}
