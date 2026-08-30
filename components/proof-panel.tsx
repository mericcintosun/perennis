// The proof panel, DEMO.md step 9. Everything a judge needs to check the
// "live read from Shannon" claim without leaving the landing page: the three
// deployed addresses with explorer links, the health probe that says which path
// the app is actually on, and a pointer at the evidence table a human fills in
// after the deploy.
//
// It imports lib/config.ts and nothing else from lib/. That file imports
// nothing at all, not even viem, so no chain code enters this module graph and
// this stays a plain server component.

import { AddressCopy } from "@/components/address-copy";
import {
  BINARY_MARKETS_MODULE,
  CHAIN_ID,
  COLLATERAL_TOKEN,
  EXPLORER_URL,
  VAULT_ADDRESS,
} from "@/lib/config";

const REPO_URL = "https://github.com/mericcintosun/perennis";

/** Head and tail of an address, so a 360px row does not push the page sideways. */
function truncate(address: string) {
  return address.length > 18
    ? `${address.slice(0, 10)}...${address.slice(-6)}`
    : address;
}

const addresses = [
  {
    label: "PerennisVault",
    note: "The vault that holds the plan, the collateral and the queue.",
    address: VAULT_ADDRESS,
  },
  {
    label: "Collateral (tUSDC)",
    note: "The ERC20 the vault stakes. Its decimals are read off it, never assumed.",
    address: COLLATERAL_TOKEN,
  },
  {
    label: "BinaryMarketsModule",
    note: "DreamDEX. buy enters a window, redeem converts the outcome token back.",
    address: BINARY_MARKETS_MODULE,
  },
];

export function ProofPanel() {
  return (
    <div className="border-t border-border">
      <div className="space-y-8 py-8">
        <dl className="space-y-0">
          {addresses.map((row) => (
            <div
              key={row.label}
              className="flex flex-col gap-1 border-b border-border py-4 first:pt-0 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-6"
            >
              <div className="min-w-0">
                <dt className="text-sm font-medium">{row.label}</dt>
                <p className="text-xs text-muted-foreground">{row.note}</p>
              </div>
              <dd className="min-w-0 break-all font-mono text-xs">
                {row.address ? (
                  <a
                    className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-primary sm:min-h-0"
                    href={`${EXPLORER_URL}/address/${row.address}`}
                    title={row.address}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {truncate(row.address)}
                  </a>
                ) : (
                  <span className="text-muted-foreground">
                    not configured in this deployment
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-1 border-b border-border pb-8 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-6">
          <div className="min-w-0">
            <p className="text-sm font-medium">The readiness probe</p>
            <p className="text-xs text-muted-foreground">
              Says whether this deployment is reading chain {CHAIN_ID} or serving
              the fixture set, and which level of market discovery answered.
            </p>
          </div>
          {/* Open it, or copy the path and curl it. The control says "Copied" in
              words rather than swapping an icon nobody was looking at. */}
          <div className="flex flex-wrap items-center gap-3">
            <a
              className="inline-flex min-h-11 items-center text-xs underline underline-offset-4 hover:text-primary sm:min-h-0"
              href="/api/health"
            >
              GET /api/health
            </a>
            <AddressCopy value="/api/health" label="Copy path" />
          </div>
        </div>

        <p className="max-w-[68ch] text-xs leading-relaxed text-muted-foreground">
          The deploy transaction, the startPlan hash and the RollSettled hash
          live in{" "}
          <a
            className="underline underline-offset-4 hover:text-primary"
            href={`${REPO_URL}/blob/main/EVIDENCE.md`}
            target="_blank"
            rel="noopener noreferrer"
          >
            EVIDENCE.md
          </a>{" "}
          in the repository. Every row there is written by a human after the
          deploy, and a row that has not been filled in yet says so rather than
          carrying a hash that looks real. If an address above says it is not
          configured, this deployment is running on the fixture set and the
          console badge says the same thing.
        </p>
      </div>
    </div>
  );
}
