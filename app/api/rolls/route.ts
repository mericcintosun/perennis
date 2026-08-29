// The roll ledger, read through the adapter seam.
//
// With ADAPTER_MODE=real and a deployed vault this returns source "chain" and
// every row carries a real transaction hash off Shannon, built from RollSettled
// logs in lib/dreamdex.ts. With the adapter unset it returns the fixture ledger
// with source "seed". Same shape either way.
//
// Validation runs first, before anything else in the handler. A bad query never
// reaches an RPC call.

import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";
import { firstIssueHint, rollsQuerySchema } from "@/lib/schemas";
import type { CoreFailure } from "@/lib/errors";
import { coreFailure } from "@/lib/errors";
import type { ApiResponse, RollEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const parsed = rollsQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );

  if (!parsed.success) {
    const body: CoreFailure = coreFailure(
      "invalid-input",
      firstIssueHint(parsed.error.issues)
    );
    return NextResponse.json(body, { status: 400 });
  }

  const ledger = await getAdapter().getRollLedger();

  // `address` is accepted and validated but not yet routed on: this deployment
  // reads one vault, the one in NEXT_PUBLIC_CONTRACT_ADDRESS. The parameter is
  // here so the factory work in a later phase does not change the contract of
  // this endpoint.
  const limit = parsed.data.limit;
  const data = limit ? ledger.data.slice(-limit) : ledger.data;

  const body: ApiResponse<RollEntry[]> = {
    source: ledger.source,
    data,
    ...(ledger.note ? { note: ledger.note } : {}),
  };

  return NextResponse.json(body, { status: 200 });
}
