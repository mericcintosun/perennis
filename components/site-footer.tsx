import Image from "next/image";
import { Separator } from "@/components/ui/separator";
// Config, not chain code. lib/config.ts imports nothing, so naming the deployed
// addresses in the footer cannot pull the RPC layer into this module graph.
import {
  CHAIN_ID,
  COLLATERAL_TOKEN,
  VAULT_ADDRESS,
} from "@/lib/config";

const REPO_URL = "https://github.com/mericcintosun/perennis";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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
          <a
            className="hover:text-foreground"
            href="https://docs.dreamdex.io/developers/event-contracts"
            target="_blank"
            rel="noopener noreferrer"
          >
            DreamDEX docs
          </a>
          <a
            className="hover:text-foreground"
            href="https://docs.somnia.network/developer/reactivity"
            target="_blank"
            rel="noopener noreferrer"
          >
            Somnia reactivity
          </a>
          <a
            className="hover:text-foreground"
            href="https://shannon-explorer.somnia.network"
            target="_blank"
            rel="noopener noreferrer"
          >
            Shannon explorer
          </a>
          <a
            className="hover:text-foreground"
            href="https://dorahacks.io/hackathon/event-contracts"
            target="_blank"
            rel="noopener noreferrer"
          >
            Event Contracts Hackathon
          </a>
        </div>
      </div>

      {/*
        About and Security. It sits in the shared shell, so it is on both / and
        /console. Small type, and every row wraps rather than pushing a 360px
        page sideways. An address that is not configured says so in words: the
        deployed values live in EVIDENCE.md and are filled in by a human.
      */}
      <Separator />
      <div>
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 text-xs text-muted-foreground">
          <p className="font-medium uppercase tracking-wider">About and security</p>
          <p className="max-w-[70ch]">
            Perennis is testnet software on Somnia Shannon (chain id {CHAIN_ID}),
            with tUSDC as collateral. The contract has not been audited and has
            no upgrade path. Do not point it at money you care about.
          </p>
          <dl className="flex flex-wrap gap-x-8 gap-y-2">
            <FooterAddress label="Vault" address={VAULT_ADDRESS} />
            <FooterAddress label="Collateral" address={COLLATERAL_TOKEN} />
          </dl>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <a
              className="inline-flex min-h-11 items-center hover:text-foreground sm:min-h-0"
              href={`${REPO_URL}/blob/main/SECURITY.md`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Security notes
            </a>
            <a
              className="inline-flex min-h-11 items-center hover:text-foreground sm:min-h-0"
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Source on GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterAddress({
  label,
  address,
}: {
  label: string;
  address?: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <dt>{label}</dt>
      <dd className="break-all font-mono" title={address ?? undefined}>
        {address ?? "not configured in this deployment"}
      </dd>
    </div>
  );
}
