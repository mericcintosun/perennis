import type { Metadata } from "next";
import { StandingPlanConsole } from "@/components/standing-plan-console";
import { getAdapter } from "@/lib/adapters";
import { somniaShannon } from "@/lib/dreamdex";

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
          Three vaults sit side by side. Vault 01 is empty, so you can deposit and
          write a plan into it. Vault 02 is running an eight window plan on BTC
          with a position open right now. Vault 03 halted itself after two losses
          in a row, and its balance is waiting to be withdrawn. Let the countdown
          reach zero on Vault 02 and watch the card roll. Nothing asks you to
          sign.
        </p>
      </div>

      <StandingPlanConsole
        windows={windows.data}
        initialVaults={vaults.data}
        source={source}
        sourceNote={note}
        decimals={decimals.data}
        explorerBase={somniaShannon.blockExplorers.default.url}
      />
    </section>
  );
}
