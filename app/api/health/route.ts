// One place to ask whether this deployment is talking to a chain yet.
//
// Phase 2 points its checks here instead of guessing from the page. It reports
// what is configured, never a secret: no RPC key, no private key, no address
// beyond a boolean saying whether one is set.

import { NextResponse } from "next/server";
import { adapterMode, getAdapter, vaultAddressSet } from "@/lib/adapters";
import { somniaShannon } from "@/lib/dreamdex";
import type { ApiResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Health {
  adapterMode: string;
  chainId: number;
  decimals: number;
  vaultAddressSet: boolean;
}

export async function GET() {
  const decimals = await getAdapter().getCollateralDecimals();

  const body: ApiResponse<Health> = {
    source: decimals.source,
    data: {
      adapterMode: adapterMode(),
      chainId: somniaShannon.id,
      decimals: decimals.data,
      vaultAddressSet: vaultAddressSet(),
    },
    ...(decimals.note ? { note: decimals.note } : {}),
  };

  return NextResponse.json(body, { status: 200 });
}
