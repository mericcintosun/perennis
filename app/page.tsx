import type { Metadata } from "next";
import Link from "next/link";
import {
  BalanceLegend,
  BalanceSparkline,
} from "@/components/balance-sparkline";
import { QueueMark, StopRuleMark } from "@/components/brand/marks";
import { DispatchList, type DispatchEntry } from "@/components/dispatch-list";
import { FigureCount } from "@/components/figure-count";
import { ProofPanel } from "@/components/proof-panel";
import { RollFigure } from "@/components/roll-figure";
import { Button } from "@/components/ui/button";
// Config, not chain code. lib/config.ts imports nothing, so naming the chain id
// and the precompile here costs this static page no bundle weight, and the
// dateline below cannot drift from what the app is actually pointed at.
import { CHAIN_ID, REACTIVITY_PRECOMPILE } from "@/lib/config";
// The fixtures, at build time, not a fetch. Every figure on this page is read
// out of the same file /console runs on, so a page that says "six settled
// windows" cannot drift from the data behind that claim.
import { vaults } from "@/lib/data/seed";

export const metadata: Metadata = {
  title: "Standing order plans for Event Contracts",
};

/** Everything numeric on this page, derived from fixtures/vaults.json. */
const vault02 = vaults.find((entry) => entry.id === "vault-02") ?? null;
const fixtureDeposits = vaults.reduce(
  (sum, entry) => sum + entry.depositTotal,
  0
);
const fixtureSettled = vaults.reduce(
  (sum, entry) => sum + entry.ledger.length,
  0
);
const vault02Settled = vault02?.ledger.length ?? 0;
const vault02Deposit = vault02?.depositTotal ?? 0;
const vault02Balance = vault02?.balance ?? 0;
const vault02Stake = vault02?.plan?.stakePerWindow ?? 0;
const vault02Queued = vault02?.queue.length ?? 0;

/** DEMO.md steps 1, 4 and 6, as three sentences rather than three tabs. The
 *  call each one makes is named in plain language, because a judge reading this
 *  page cold does not know what _onEvent is and does not need to. */
const howItWorks: DispatchEntry[] = [
  {
    title: "You write the plan, once",
    body: "Direction, stake per window, window count and three stop rules go in as one transaction, which also queues the next market ids and opens the vault's reactivity subscription. That is the last click the demo asks for.",
  },
  {
    title: "The settlement block does the roll",
    body: "When a window resolves, validators call the vault's handler in that same block, so the redeem and the re-entry land together with no keeper, no server and no gap between them.",
  },
  {
    title: "The stop rules halt it, not you",
    body: "Losses in a row, a floor balance and a take profit are conditions inside that same settlement path, so when one of them trips the contract stops itself and the balance waits in the vault for you to withdraw.",
    mark: <StopRuleMark className="size-6 shrink-0 text-muted-foreground" />,
  },
];

/** Three figures that exist in this repository. Each one lives inside a
 *  sentence, per ARCHETYPE L3 in IDENTITY.md, and each one is checkable. */
const whatIsRunning: DispatchEntry[] = [
  {
    title: "Market discovery has three levels",
    body: "Market discovery tries three levels in lib/markets.ts, the DreamDEX markets SDK first, then a per id read, then the fixture set, and GET /api/health names the one that answered on this deployment.",
  },
  {
    title: "The vault contract is tested",
    body: "Eleven tests run against the vault contract, six of them written against a specific finding from the security pass, and they cover the settlement path through a harness because the reactivity precompile has no code inside forge.",
  },
  {
    title: "There are no keeper transactions",
    body: "Zero keeper transactions: the roll is a validator call inside the settlement block, not a second transaction after it, which is why no fee is paid to a network of pollers and no roll lands a block late.",
  },
];

/** A section rule: the label in the accent, then a hairline that draws itself
 *  across the remaining width. This is the only entrance below the fold, and it
 *  animates a transform on a decorative line, never the visibility of text. */
function SectionRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-xs font-medium uppercase tracking-[0.18em] text-primary">
        {label}
      </span>
      <span aria-hidden className="pns-rule h-px flex-1 bg-border" />
    </div>
  );
}

export default function Home() {
  return (
    <div>
      {/* The masthead, in two columns from lg up. The text column keeps the
          order it had: headline, lead, one primary button with a text link
          beside it, then the dateline under a hairline. The second column is the
          roll figure, which stacks under the dateline below lg rather than
          disappearing, because the ornament it replaces was lg-only and left a
          phone with no drawing on the page at all.

          No card, no badge over the headline, no mask and no gradient anywhere:
          the figure is svg strokes on the page's own ground. */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="grid gap-14 lg:grid-cols-[minmax(0,60ch)_minmax(0,1fr)] lg:items-start lg:gap-16">
            <div className="pns-masthead max-w-[60ch]">
              <h1 className="pns-ink-in font-serif text-5xl leading-[1.02] sm:text-7xl">
                Hold a view for four hours. Sign once.
              </h1>

              <p className="pns-ink-in mt-8 text-lg leading-relaxed text-muted-foreground">
                Event Contracts settle every 15 minutes, so an afternoon of
                conviction costs you sixteen round trips of redeeming and
                re-entering. Perennis takes the plan once, then rolls itself at
                every settlement with your stop rules written in as contract
                terms.
              </p>

              {/* One primary action. The second is a text link, so there is no
                  question which control starts the demo. */}
              <div className="pns-ink-in mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
                <Button asChild size="lg">
                  <Link href="/console">Open the console</Link>
                </Button>
                <a
                  className="text-sm text-primary underline underline-offset-4"
                  href="#proof"
                >
                  Read the contract addresses
                </a>
              </div>

              {/* The dateline. The only monospace on the first viewport, because
                  every value in it is an identifier a reader can go and check. */}
              <div className="pns-ink-in mt-12">
                <span
                  aria-hidden
                  className="pns-rule block h-px w-full bg-border"
                />
                <p className="mt-4 font-mono text-xs text-muted-foreground">
                  Somnia Shannon · chain {CHAIN_ID} · reactivity precompile 0x…
                  {REACTIVITY_PRECOMPILE.slice(-4)}
                </p>
              </div>
            </div>

            {/* The figure. Three stages on hairline rules, each one a mark from
                the brand family, each one a button that opens its own caption on
                hover and on keyboard focus. Stage one is open in the server
                HTML. */}
            <RollFigure />
          </div>
        </div>
      </section>

      {/* How it works. Same three beats as DEMO.md steps 1, 4 and 6, in the
          dispatch form, static, no state and no tabs. The lead sentence that
          used to sit here is gone: the masthead figure says it in a drawing, and
          a section gets one sentence plus a visual, not both twice. */}
      <section id="how" className="scroll-mt-20 border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <SectionRule label="How it works" />
          <h2 className="mt-8 max-w-[68ch] font-serif text-3xl leading-tight sm:text-4xl">
            Three steps, and only the first one is yours
          </h2>
          <DispatchList entries={howItWorks} className="mt-12" />
        </div>
      </section>

      {/* What is running today. The figures come first now, read straight out of
          fixtures/vaults.json, and every one of them lives inside its sentence
          per ARCHETYPE L3: no tile band, no stat strip, no number standing on
          its own. Then the three dispatch entries, then the long form comparison
          folded away underneath them. */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <SectionRule label="What is running today" />
          <h2 className="mt-8 max-w-[68ch] font-serif text-3xl leading-tight sm:text-4xl">
            Numbers you can check in this repository
          </h2>

          <p className="mt-6 max-w-[68ch] text-[15px] leading-relaxed text-muted-foreground">
            The fixture set the console runs on carries{" "}
            <FigureCount value={fixtureDeposits} /> tUSDC of deposits across{" "}
            {vaults.length} vaults and {fixtureSettled} settled windows, and not
            one of those settlements was signed by a hand.
          </p>

          <p className="mt-4 max-w-[68ch] text-[15px] leading-relaxed text-muted-foreground">
            Vault 02 deposited {vault02Deposit}, and its {vault02Settled} settled
            windows moved the balance <BalanceSparkline /> through{" "}
            <BalanceLegend />, with {vault02Stake} staked in the window that is
            still open, so the card reads {vault02Balance}.
          </p>

          <p className="mt-4 flex max-w-[68ch] items-start gap-3 text-[15px] leading-relaxed text-muted-foreground">
            {/* The queue mark replaces the words "the window queue", so it
                carries a title and becomes role="img". */}
            <QueueMark
              title="The window queue"
              className="mt-0.5 size-6 shrink-0"
            />
            <span>
              That same plan transaction queues the next {vault02Queued} market
              ids, so the vault already knows which window it enters after this
              one, and refilling the queue is permissionless.
            </span>
          </p>

          <DispatchList entries={whatIsRunning} className="mt-12" />

          {/* The only long form prose left on the page, folded away, on hairline
              rules rather than in a rounded box. */}
          <details className="mt-14 border-t border-border pt-6">
            <summary className="cursor-pointer text-sm font-medium marker:text-primary">
              The three things this replaces, and what each one leaves running
            </summary>
            <div className="mt-8 max-w-[68ch] space-y-8 text-sm leading-relaxed text-muted-foreground">
              <div className="space-y-2 border-t border-border pt-6">
                <h3 className="font-serif text-base text-foreground">
                  Renewing by hand
                </h3>
                <p>
                  Wait for the lock, wait for the resolve, redeem the outcome
                  token, find the next market id, send a new order. Four steps,
                  sixteen repeats for a four hour view. Miss one and your capital
                  sits there as an unredeemed token balance.
                </p>
              </div>

              <div className="space-y-2 border-t border-border pt-6">
                <h3 className="font-serif text-base text-foreground">
                  A bot on your laptop
                </h3>
                <p>
                  It holds a private key, it runs as a process you own, and it
                  dies when the laptop sleeps. Perennis has no process. The plan
                  lives inside a contract you own and the chain's own event
                  pipeline triggers it.
                </p>
              </div>

              <div className="space-y-2 border-t border-border pt-6">
                <h3 className="font-serif text-base text-foreground">
                  A keeper network
                </h3>
                <p>
                  Chainlink Automation and Gelato poll from outside and send a
                  separate transaction, so the roll lands a block or more after
                  settlement and carries a keeper fee. The Somnia reactivity
                  handler runs in the settlement block itself, so there is no gap
                  between resolve and re-entry.
                </p>
              </div>

              <div className="space-y-2 border-t border-border pt-6">
                <h3 className="font-serif text-base text-foreground">
                  What is shipped behind those numbers
                </h3>
                <p>
                  PerennisVault holds the collateral, the plan and the window
                  queue, and implements the Somnia reactivity handler that
                  validators call in the settlement block. The window list comes
                  from the DreamDEX markets SDK through loadMarkets() filtered by
                  isBinaryMarket(), with a per id read and the fixture set behind
                  it. Every ledger row is built from a RollSettled log on the
                  deployed vault, so each one links to a real Shannon
                  transaction, and the validator call badge is derived by
                  comparing the sender against the vault owner rather than
                  asserted.
                </p>
                <p>
                  Testnet software, Shannon only, with tUSDC as collateral. An
                  outcome contract pays 1 or 0, so a plan that keeps re-entering
                  without a limit is a martingale wearing a nicer interface. That
                  is why the three stop rules live in the settlement path and not
                  in the frontend. The contract has not been audited and has no
                  upgrade path. Do not point it at money you care about.
                </p>
              </div>
            </div>
          </details>

          {/* The second way into the console, deliberately not a second primary
              button: the masthead holds the one filled control on this page. */}
          <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Button asChild size="lg" variant="outline">
              <Link href="/console">Open the console</Link>
            </Button>
            <p className="max-w-[52ch] text-sm text-muted-foreground">
              With no addresses configured it runs on the fixture set and the
              badge says so.
            </p>
          </div>
        </div>
      </section>

      {/* Proof, DEMO.md step 9. The addresses and the probe a judge needs to
          check the chain claim, on the page rather than in a markdown file. */}
      <section id="proof" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <SectionRule label="Proof" />
          <h2 className="mt-8 max-w-[68ch] font-serif text-3xl leading-tight sm:text-4xl">
            Check the chain claim yourself
          </h2>
          <p className="mt-4 max-w-[68ch] text-[15px] leading-relaxed text-muted-foreground">
            Three addresses and one probe. If the console says it is reading
            Shannon, these are the contracts it is reading.
          </p>
          <div className="mt-10">
            <ProofPanel />
          </div>
        </div>
      </section>
    </div>
  );
}
