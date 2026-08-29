// Event windows, read through the adapter seam.
//
// No literals here on purpose: whatever the console sees, this route sees. When
// Phase 2 flips ADAPTER_MODE to real, this endpoint starts returning chain data
// with no edit. Validation, an error taxonomy and timeouts are Phase 2's job.

import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";

export const dynamic = "force-dynamic";

export async function GET() {
  const windows = await getAdapter().getEventWindows();
  return NextResponse.json(windows, { status: 200 });
}
