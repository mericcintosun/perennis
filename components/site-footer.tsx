// The footer is links plus one sentence.
//
// It used to carry a paragraph of risk copy and two address rows. Both moved:
// the addresses are on the proof panel at /#proof (components/proof-panel.tsx),
// which links each one to the Shannon explorer and says "not configured in this
// deployment" in words when it is empty, and the risk paragraph is in the folded
// block on the landing page. Two copies of the same address is one copy that can
// go stale.

import Image from "next/image";
// Config, not chain code. lib/config.ts imports nothing, so naming the chain id
// in the footer cannot pull the RPC layer into this module graph.
import { CHAIN_ID } from "@/lib/config";

const REPO_URL = "https://github.com/mericcintosun/perennis";

const links = [
  { label: "Security notes", href: `${REPO_URL}/blob/main/SECURITY.md` },
  { label: "Source on GitHub", href: REPO_URL },
  {
    label: "DreamDEX docs",
    href: "https://docs.dreamdex.io/developers/event-contracts",
  },
  {
    label: "Somnia reactivity",
    href: "https://docs.somnia.network/developer/reactivity",
  },
  {
    label: "Shannon explorer",
    href: "https://shannon-explorer.somnia.network",
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.svg"
            alt="Perennis"
            width={135}
            height={20}
            className="h-5 w-auto opacity-80"
          />
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {links.map((link) => (
            <a
              key={link.label}
              className="inline-flex min-h-11 items-center hover:text-foreground sm:min-h-0"
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-8">
        <p className="text-xs text-muted-foreground">
          Testnet software on Somnia Shannon (chain {CHAIN_ID}) with tUSDC as
          collateral, unaudited, with no upgrade path. Contract addresses are in
          the{" "}
          <a className="underline underline-offset-4 hover:text-foreground" href="/#proof">
            proof panel
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
