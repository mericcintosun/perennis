// Vault state, read through the adapter seam.
//
// The optional `address` query param is validated before anything else runs, so
// a malformed address is a 400 and never an RPC call.

import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";
import { firstIssueHint, vaultsQuerySchema } from "@/lib/schemas";
import type { CoreFailure } from "@/lib/errors";
import { coreFailure } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const parsed = vaultsQuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );

  if (!parsed.success) {
    const body: CoreFailure = coreFailure(
      "invalid-input",
      firstIssueHint(parsed.error.issues)
    );
    return NextResponse.json(body, { status: 400 });
  }

  const vaults = await getAdapter().getVaults();

  // When an address is given, narrow to that vault. An address that matches
  // nothing returns an empty list rather than a 404: the caller asked a valid
  // question and the answer is that this deployment does not serve that vault.
  const wanted = parsed.data.address?.toLowerCase();
  const data = wanted
    ? vaults.data.filter((v) => v.address.toLowerCase() === wanted)
    : vaults.data;

  return NextResponse.json({ ...vaults, data }, { status: 200 });
}
