import type { Metadata } from "next";
import Link from "next/link";
import { StandingPlanConsole } from "@/components/standing-plan-console";
import { getAdapter } from "@/lib/adapters";
// Config, not chain code. Importing the explorer base from lib/config.ts rather
// than from lib/dreamdex.ts keeps viem out of this page's module graph.
import { EXPLORER_URL } from "@/lib/config";

// Reads happen per request rather than at build time, so a deployed vault
// address shows live state instead of whatever was true when it built.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Console",
  description:
    "Write a standing plan, watch the vault redeem and re-enter itself at every settlement, and read the roll ledger back.",
};

export default async function ConsolePage() {
  const adapter = getAdapter();
  const [windows, vaults, decimals] = await Promise.all([
    adapter.getEventWindows(),
    adapter.getVaults(),
    adapter.getCollateralDecimals(),
  ]);

  const note = vaults.note ?? windows.note ?? decimals.note;
  const source =
    windows.source === "chain" && vaults.source === "chain" ? "chain" : "seed";

  return (
    <section className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      <div className="mb-10 max-w-[68ch]">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          The console
        </h1>
        <p className="mt-3 text-muted-foreground">
          Three vaults sit side by side: Vault 01 is empty and ready for a plan,
          Vault 02 is running an eight window BTC plan with a position open, and
          Vault 03 halted itself after two losses in a row. Watch the countdown
          on Vault 02 reach zero, because the card redeems and re-enters on its
          own and nothing asks you to sign.
        </p>
        {/* The proof panel lives on the landing page, so the link out is here
            rather than in the header, which already wraps at 360px. */}
        <p className="mt-3 text-sm text-muted-foreground">
          <Link
            className="underline underline-offset-4 hover:text-foreground"
            href="/#proof"
          >
            Contract addresses and the health probe
          </Link>{" "}
          are on the overview page.
        </p>
      </div>

      <StandingPlanConsole
        windows={windows.data}
        initialVaults={vaults.data}
        source={source}
        sourceNote={note}
        decimals={decimals.data}
        explorerBase={EXPLORER_URL}
      />
    </section>
  );
}
