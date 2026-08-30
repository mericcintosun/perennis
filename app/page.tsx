import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { QueueMark, RollLoopMark } from "@/components/brand/marks";
import { ConsolePreview } from "@/components/console-preview";
import { LoopStepper } from "@/components/loop-stepper";
import { ProofPanel } from "@/components/proof-panel";
import { Reveal } from "@/components/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
// Config, not chain code. lib/config.ts imports nothing, so naming the chain id
// and the precompile here costs this static page no bundle weight, and the stat
// strip below cannot drift from what the app is actually pointed at.
import { CHAIN_ID, REACTIVITY_PRECOMPILE } from "@/lib/config";

export const metadata: Metadata = {
  title: "Standing order plans for Event Contracts",
};

/** The four facts in the hero. Each one is checkable in this repository. */
const heroStats: [string, string][] = [
  ["1", "signature per plan"],
  ["0", "keepers, bots or servers"],
  ["20s", "demo clock for a 15 minute window"],
  // Sliced off the constant rather than typed, so the strip and the contract
  // cannot disagree about which precompile this is.
  [`0x…${REACTIVITY_PRECOMPILE.slice(-4)}`, "Somnia reactivity precompile"],
];

/** Three numbers that exist in this repository, in place of seven claim cards. */
const tiles: { value: string; body: string }[] = [
  {
    value: "3",
    body: "Levels of market discovery in lib/markets.ts, tried in order, with GET /api/health naming the one that answered.",
  },
  {
    value: "11",
    body: "Tests on the vault contract, six of them written against a specific finding from the security pass.",
  },
  {
    value: "0",
    body: "Keeper transactions. The roll is a validator call inside the settlement block, not a second transaction after it.",
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

/** Stagger helper. Writes --delay, which app/globals.css reads for the entrance. */
function delay(ms: number): CSSProperties {
  return { "--delay": `${ms}ms` } as CSSProperties;
}

export default function Home() {
  return (
    <div>
      {/* Hero. Two columns from lg: the claim on the left, a static picture of
          /console on the right, one button into it.

          The brand wash used to run edge to edge under the headline and the lead
          paragraph. It is now confined to the right half, hidden below lg, and
          masked to fade out before it reaches the text column, so nothing
          decorative shares a bounding area with a sentence. */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[48%] lg:block"
        >
          <Image
            src="/brand/og.png"
            alt=""
            fill
            priority
            className="hidden object-cover opacity-[0.16] lg:block"
            style={{
              maskImage:
                "linear-gradient(to left, rgb(0 0 0 / 0.95), rgb(0 0 0 / 0) 72%)",
              WebkitMaskImage:
                "linear-gradient(to left, rgb(0 0 0 / 0.95), rgb(0 0 0 / 0) 72%)",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]">
            <div>
              <Badge
                variant="outline"
                className="fade-up mb-6 font-normal"
                style={delay(0)}
              >
                DreamDEX Event Contracts on Somnia Shannon, chain {CHAIN_ID}
              </Badge>

              <h1
                className="fade-up max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl"
                style={delay(80)}
              >
                Hold a view for <span className="text-primary">four hours</span>,
                sign once.
              </h1>

              <p
                className="fade-up mt-6 max-w-[62ch] text-lg leading-relaxed text-muted-foreground"
                style={delay(160)}
              >
                Event Contracts settle every 15 minutes, so an afternoon of
                conviction costs you sixteen round trips of redeeming and
                re-entering. Perennis takes the plan once, then rolls itself at
                every settlement with your stop rules written in as contract
                terms.
              </p>

              {/* One primary action. The second link is text, so there is no
                  question which button starts the demo. */}
              <div className="fade-up mt-9 space-y-3" style={delay(240)}>
                <Button asChild size="lg">
                  <Link href="/console">Write a standing plan</Link>
                </Button>
                <p className="text-sm text-muted-foreground">
                  Or read the{" "}
                  <a
                    className="underline underline-offset-4 hover:text-foreground"
                    href="#proof"
                  >
                    contract addresses
                  </a>{" "}
                  at the bottom of this page.
                </p>
              </div>

              {/* Mono, because every figure here is something you can go and
                  check rather than a marketing number. */}
              <dl
                className="fade-up mt-12 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-border pt-8 font-mono sm:grid-cols-4"
                style={delay(320)}
              >
                {heroStats.map(([value, label]) => (
                  <div key={label}>
                    <dt className="tabular text-xl font-semibold text-primary">
                      {value}
                    </dt>
                    <dd className="mt-1 text-[11px] leading-snug text-muted-foreground">
                      {label}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* The preview, with the roll loop mark floating beside it. The mark
                is decorative, so it is hidden from assistive technology and it
                sits behind the card on the z axis. */}
            <div className="fade-up relative" style={delay(200)}>
              <div
                aria-hidden
                className="glow-pulse pointer-events-none absolute -inset-6 -z-10 rounded-full bg-primary/10 blur-3xl"
              />
              <RollLoopMark className="float absolute -left-10 -top-10 -z-10 hidden size-24 text-primary/40 lg:block" />
              <ConsolePreview />
            </div>
          </div>
        </div>
      </section>

      {/* How it works, DEMO.md steps 1, 4 and 6 as three tabs rather than three
          stacked prose blocks. */}
      <Reveal>
        <section
          id="how"
          className="scroll-mt-20 border-b border-border bg-card/40"
        >
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-start">
              <div className="max-w-[68ch]">
                <Eyebrow>How it works</Eyebrow>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Three steps, and only the first one is yours
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Click through them. The vault is a contract you deploy and own,
                  and it holds the plan, the collateral and the queue.
                </p>

                <div className="mt-10">
                  <LoopStepper />
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
      </Reveal>

      {/* Three numbers, then one folded block holding everything the seven claim
          cards used to say. Outside that <details> no section on this page runs
          more than two paragraphs in a row. */}
      <Reveal>
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-[68ch]">
                <Eyebrow>What is running today</Eyebrow>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Numbers you can check in this repository
                </h2>
              </div>
              <QueueMark className="hidden size-12 text-muted-foreground/60 sm:block" />
            </div>

            <dl className="mt-10 grid gap-5 md:grid-cols-3">
              {tiles.map((tile) => (
                <Card key={tile.value}>
                  <CardContent className="space-y-3 p-6">
                    <dt className="tabular font-mono text-5xl font-semibold leading-none text-primary">
                      {tile.value}
                    </dt>
                    <dd className="text-sm leading-relaxed text-muted-foreground">
                      {tile.body}
                    </dd>
                  </CardContent>
                </Card>
              ))}
            </dl>

            {/* The only long form prose left on the page, folded away. */}
            <details className="mt-10 rounded-xl border border-border bg-card/60 p-6">
              <summary className="cursor-pointer text-sm font-medium marker:text-muted-foreground">
                The three things this replaces, and what each one leaves running
              </summary>
              <div className="mt-6 max-w-[68ch] space-y-6 text-sm leading-relaxed text-muted-foreground">
                <div className="space-y-2">
                  <h3 className="text-base font-medium text-foreground">
                    Renewing by hand
                  </h3>
                  <p>
                    Wait for the lock, wait for the resolve, redeem the outcome
                    token, find the next market id, send a new order. Four steps,
                    sixteen repeats for a four hour view. Miss one and your
                    capital sits there as an unredeemed token balance.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-medium text-foreground">
                    A bot on your laptop
                  </h3>
                  <p>
                    It holds a private key, it runs as a process you own, and it
                    dies when the laptop sleeps. Perennis has no process. The
                    plan lives inside a contract you own and the chain's own
                    event pipeline triggers it.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-medium text-foreground">
                    A keeper network
                  </h3>
                  <p>
                    Chainlink Automation and Gelato poll from outside and send a
                    separate transaction, so the roll lands a block or more after
                    settlement and carries a keeper fee. The Somnia reactivity
                    handler runs in the settlement block itself, so there is no
                    gap between resolve and re-entry.
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-medium text-foreground">
                    What is shipped behind those numbers
                  </h3>
                  <p>
                    PerennisVault holds the collateral, the plan and the window
                    queue, and implements the Somnia reactivity handler that
                    validators call in the settlement block. The window list
                    comes from the DreamDEX markets SDK through loadMarkets()
                    filtered by isBinaryMarket(), with a per id read and the
                    fixture set behind it. Every ledger row is built from a
                    RollSettled log on the deployed vault, so each one links to a
                    real Shannon transaction, and the validator call badge is
                    derived by comparing the sender against the vault owner
                    rather than asserted.
                  </p>
                  <p>
                    Testnet software, Shannon only, with tUSDC as collateral. An
                    outcome contract pays 1 or 0, so a plan that keeps
                    re-entering without a limit is a martingale wearing a nicer
                    interface. That is why the three stop rules live in the
                    settlement path and not in the frontend. The contract has not
                    been audited and has no upgrade path. Do not point it at
                    money you care about.
                  </p>
                </div>
              </div>
            </details>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button asChild size="lg">
                <Link href="/console">Open the console</Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                With no addresses configured it runs on the fixture set and the
                badge says so.
              </p>
            </div>
          </div>
        </section>
      </Reveal>

      {/* Proof, DEMO.md step 9. The addresses and the probe a judge needs to
          check the chain claim, on the page rather than in a markdown file. */}
      <Reveal>
        <section id="proof" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="max-w-[68ch]">
              <Eyebrow>Proof</Eyebrow>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Check the chain claim yourself
              </h2>
              <p className="mt-3 text-muted-foreground">
                Three addresses and one probe. If the console says it is reading
                Shannon, these are the contracts it is reading.
              </p>
            </div>
            <div className="mt-10">
              <ProofPanel />
            </div>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
