// Vault state, read through the adapter seam.

import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";

export const dynamic = "force-dynamic";

export async function GET() {
  const vaults = await getAdapter().getVaults();
  return NextResponse.json(vaults, { status: 200 });
}
