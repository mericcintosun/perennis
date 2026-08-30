import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ConsolePreview } from "@/components/console-preview";
import { ProofPanel } from "@/components/proof-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
// Config, not chain code. lib/config.ts imports nothing, so naming the chain id
// here costs this static page no bundle weight.
import { CHAIN_ID } from "@/lib/config";

export const metadata: Metadata = {
  title: "Standing order plans for Event Contracts",
};

const steps = [
  {
    step: "01",
    title: "Deposit and write one plan",
    body: "Direction, stake per window, how many windows, and three stop rules. The same transaction pre-loads the next three market ids into the vault queue and opens its reactivity subscription.",
  },
  {
    step: "02",
    title: "The settlement block does the work",
    body: "When a window resolves, validators call the vault's handler in that same block. It redeems the winning ERC-6909 outcome token, updates the streak and PnL counters, then enters the next window off the queue.",
  },
  {
    step: "03",
    title: "The stop rules halt it, not you",
    body: "Two losses in a row, a floor balance, a take profit figure. Each one is a require in the settlement path. When one trips, the plan stops and the remaining balance sits in the vault waiting for you.",
  },
];

const comparisons = [
  {
    label: "Renewing by hand",
    body: "Wait for the lock, wait for the resolve, redeem the outcome token, find the next market id, send a new order. Four steps, sixteen repeats for a four hour view. Miss one and your capital sits there as an unredeemed token balance.",
  },
  {
    label: "A bot on your laptop",
    body: "It holds a private key, it runs as a process you own, and it dies when the laptop sleeps. Perennis has no process. The plan lives inside a contract you own and the chain's own event pipeline triggers it.",
  },
  {
    label: "A keeper network",
    body: "Chainlink Automation and Gelato poll from outside and send a separate transaction, so the roll lands a block or more after settlement and carries a keeper fee. The Somnia reactivity handler runs in the settlement block itself. There is no gap between resolve and re-entry.",
  },
];

const shipped = [
  {
    title: "The vault contract",
    body: "PerennisVault holds the collateral, the plan and the window queue, and implements the Somnia reactivity handler that validators call in the settlement block. The stop rules are conditions in that settlement path, not a check the frontend runs.",
  },
  {
    title: "Market discovery through the DreamDEX markets SDK",
    body: "The window list comes from loadMarkets() filtered by isBinaryMarket(), so the ids written into the queue are ids the binary markets module can resolve. Two fallbacks sit behind it, a per id market read and the fixture set, and the health route says which one answered.",
  },
  {
    title: "The roll ledger, read back from the chain",
    body: "Every row in the ledger is built from a RollSettled log on the deployed vault, so each one links to a real Shannon transaction. The validator call badge is derived by comparing the sender against the vault owner, not asserted.",
  },
  {
    title: "One signature, then nothing",
    body: "Approve when the allowance is short, deposit, then a single startPlan that writes the plan, queues the windows, funds the subscription and enters the first market. Arming more windows is permissionless, so anyone can refill a dry queue.",
  },
];

/** The small uppercase label the console uses over each block, reused here so
 *  the page reads as a sequence of sections rather than one scroll of prose. */
function Eyebrow({ children }: { children: string }) {
  return (
    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

export default function Home() {
  return (
    <div>
      {/* Hero. The product is on screen before the fold: copy on the left, a
          static picture of /console on the right, one button into it. */}
      <section className="relative overflow-hidden border-b border-border">
        <Image
          src="/brand/og.png"
          alt=""
          fill
          priority
          className="pointer-events-none object-cover opacity-[0.13]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-background/90"
        />
        <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]">
            <div>
              <Badge variant="outline" className="mb-6 font-normal">
                DreamDEX Event Contracts on Somnia
              </Badge>
              <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
                Write the plan once.
                <br />
                The vault keeps trading it.
              </h1>
              <p className="mt-6 max-w-[68ch] text-lg leading-relaxed text-muted-foreground">
                Event Contracts settle every 15 minutes. Holding a view for one
                afternoon means coming back sixteen times to redeem and
                re-enter. Perennis takes that plan once, then redeems and rolls
                itself at every settlement, with your stop rules written in as
                contract terms.
              </p>

              {/* One primary action. The second link is text, so there is no
                  question which button starts the demo. */}
              <div className="mt-9 space-y-3">
                <Button asChild size="lg">
                  <Link href="/console">Write a standing plan</Link>
                </Button>
                <p className="text-sm text-muted-foreground">
                  <a
                    className="underline underline-offset-4 hover:text-foreground"
                    href="#how"
                  >
                    See how the roll works
                  </a>{" "}
                  first, or read the{" "}
                  <a
                    className="underline underline-offset-4 hover:text-foreground"
                    href="#proof"
                  >
                    contract addresses
                  </a>{" "}
                  at the bottom of this page.
                </p>
              </div>
            </div>

            <ConsolePreview />
          </div>

          {/* "Same block as settlement, no gap to re-enter" needs more than a
              third of a 360px screen, so the three figures stack below sm. */}
          <dl className="mt-14 grid max-w-2xl grid-cols-1 gap-6 border-t border-border pt-8 sm:grid-cols-3 sm:gap-8">
            {[
              ["1", "signature for an eight window plan"],
              ["0", "keepers, bots or servers running"],
              ["Same block", "as settlement, no gap to re-enter"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="tabular text-2xl font-semibold text-primary">
                  {value}
                </dt>
                <dd className="mt-1 text-sm text-muted-foreground">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 border-b border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="max-w-[68ch]">
              <Eyebrow>How it works</Eyebrow>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Three steps, and only the first one is yours
              </h2>
              <p className="mt-3 text-muted-foreground">
                The vault is a contract you deploy and own. It holds the plan,
                the collateral and the queue of upcoming market ids.
              </p>
              <div className="mt-10 space-y-8">
                {steps.map((s) => (
                  <div key={s.step} className="flex gap-6">
                    <span className="tabular shrink-0 text-sm font-semibold text-primary">
                      {s.step}
                    </span>
                    <div className="space-y-2">
                      <h3 className="text-base font-medium">{s.title}</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {s.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <Button asChild variant="outline" className="mt-10">
                <Link href="/console">Open the console</Link>
              </Button>
            </div>
            <Image
              src="/illustrations/window-grid.svg"
              alt=""
              width={240}
              height={120}
              className="hidden w-60 lg:block"
            />
          </div>
        </div>
      </section>

      {/* Differentiation */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="max-w-[68ch]">
            <Eyebrow>Prior art</Eyebrow>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              What Perennis is not
            </h2>
            <p className="mt-3 text-muted-foreground">
              Rolling a position is an old problem. Three things already try to
              solve it, and each one leaves something running or someone
              waiting.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {comparisons.map((c) => (
              <Card key={c.label}>
                <CardContent className="space-y-3 p-6">
                  <h3 className="text-base font-medium text-primary">
                    {c.label}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {c.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Risk */}
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="max-w-[68ch] space-y-4">
              <Eyebrow>Risk</Eyebrow>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                The stops are the product
              </h2>
              <p className="leading-relaxed text-muted-foreground">
                An outcome contract pays 1 or 0. A plan that keeps re-entering
                without a limit is a martingale wearing a nicer interface, so the
                three stop rules are not a setting the frontend enforces. They
                live in the settlement path: consecutive losses, floor balance,
                take profit. When one trips, the contract halts itself and the
                balance stays where you can withdraw it.
              </p>
              <p className="text-sm text-muted-foreground">
                Testnet software. Shannon testnet only, with tUSDC as collateral.
                Do not point it at money you care about.
              </p>
              <Button asChild variant="outline">
                <Link href="/console">See it run on the console</Link>
              </Button>
            </div>
            <Image
              src="/illustrations/roll-loop.svg"
              alt="Window locks, market resolves, vault redeems, next window opens, with the stop rules sitting in the middle of the loop"
              width={200}
              height={132}
              className="mx-auto w-full max-w-xs"
            />
          </div>
        </div>
      </section>

      {/* What shipped. Written after the build, so every line below names
          something that exists in this repo rather than something planned. */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="max-w-[68ch]">
            <Eyebrow>What shipped</Eyebrow>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              What is running today
            </h2>
            <p className="mt-3 text-muted-foreground">
              Perennis is a vault contract plus one screen. These four pieces are
              written against Somnia Shannon (chain {CHAIN_ID}) and serve the
              console the moment the contract addresses are configured.
            </p>
          </div>

          <ul className="mt-10 grid gap-5 md:grid-cols-2">
            {shipped.map((item) => (
              <li key={item.title}>
                <Card className="h-full">
                  <CardContent className="space-y-2 p-6">
                    <h3 className="text-base font-medium text-primary">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>

          {/* The closing CTA. It is filled rather than outlined because it is
              screens away from the hero, so there is no second primary action
              competing in the same view. */}
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Button asChild size="lg">
              <Link href="/console">Open the console</Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              The console is where the demo starts. With no addresses configured
              it runs on the fixture set and says so on the badge.
            </p>
          </div>
        </div>
      </section>

      {/* Proof, DEMO.md step 9. The addresses and the probe a judge needs to
          check the chain claim, on the page rather than in a markdown file. */}
      <section id="proof" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="max-w-[68ch]">
            <Eyebrow>Proof</Eyebrow>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Check the chain claim yourself
            </h2>
            <p className="mt-3 text-muted-foreground">
              Three addresses and one probe. If the console says it is reading
              Shannon, these are the contracts it is reading and this is where
              you confirm it.
            </p>
          </div>
          <div className="mt-10">
            <ProofPanel />
          </div>
        </div>
      </section>
    </div>
  );
}
