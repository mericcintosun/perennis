import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { StandingPlanConsole } from "@/components/standing-plan-console";
import {
  fetchCollateralDecimals,
  fetchEventWindows,
  fetchVaults,
  somniaShannon,
} from "@/lib/dreamdex";

// The chain reads happen per request rather than at build time, so a deployed
// vault address shows live state instead of whatever was true when it built.
export const dynamic = "force-dynamic";

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

export default async function Home() {
  const [windows, vaults, decimals] = await Promise.all([
    fetchEventWindows(),
    fetchVaults(),
    fetchCollateralDecimals(),
  ]);

  const note = vaults.note ?? windows.note;
  const source =
    windows.source === "chain" && vaults.source === "chain" ? "chain" : "seed";

  return (
    <div className="min-h-screen">
      <SiteHeader chainId={somniaShannon.id} />

      <main>
        {/* Hero */}
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
          <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-32">
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
              afternoon means coming back sixteen times to redeem and re-enter.
              Perennis takes that plan once, then redeems and rolls itself at every
              settlement, with your stop rules written in as contract terms.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button asChild size="lg">
                <a href="#console">Write a standing plan</a>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <a href="#how">See how the roll works</a>
              </Button>
            </div>

            <dl className="mt-14 grid max-w-2xl grid-cols-3 gap-8 border-t border-border pt-8">
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

        {/* Console */}
        <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="mb-10 max-w-[68ch]">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              The console
            </h2>
            <p className="mt-3 text-muted-foreground">
              Three vaults: an empty one to write a plan into, one running an
              eight window plan on BTC, and one that halted itself after two
              losses in a row. Watch the countdown reach zero. Nothing asks you to
              sign.
            </p>
          </div>

          <StandingPlanConsole
            windows={windows.data}
            initialVaults={vaults.data}
            source={source}
            sourceNote={note}
            decimals={decimals}
            explorerBase={somniaShannon.blockExplorers.default.url}
          />
        </section>

        {/* How it works */}
        <section
          id="how"
          className="scroll-mt-20 border-y border-border bg-card/40"
        >
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-start">
              <div className="max-w-[68ch]">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
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
                        <h3 className="font-medium">{s.title}</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {s.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
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
        <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="max-w-[68ch]">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              What Perennis is not
            </h2>
            <p className="mt-3 text-muted-foreground">
              Rolling a position is an old problem. Three things already try to
              solve it, and each one leaves something running or someone waiting.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {comparisons.map((c) => (
              <Card key={c.label}>
                <CardContent className="space-y-3 p-6">
                  <p className="text-sm font-medium text-primary">{c.label}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {c.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Risk */}
        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div className="max-w-[62ch] space-y-4">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  The stops are the product
                </h2>
                <p className="leading-relaxed text-muted-foreground">
                  An outcome contract pays 1 or 0. A plan that keeps re-entering
                  without a limit is a martingale wearing a nicer interface, so
                  the three stop rules are not a setting the frontend enforces.
                  They live in the settlement path: consecutive losses, floor
                  balance, take profit. When one trips, the contract halts itself
                  and the balance stays where you can withdraw it.
                </p>
                <p className="text-sm text-muted-foreground">
                  Testnet software. Shannon testnet only, with tUSDC as
                  collateral. Do not point it at money you care about.
                </p>
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
      </main>

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
              rel="noreferrer"
            >
              DreamDEX docs
            </a>
            <a
              className="hover:text-foreground"
              href="https://docs.somnia.network/developer/reactivity"
              target="_blank"
              rel="noreferrer"
            >
              Somnia reactivity
            </a>
            <a
              className="hover:text-foreground"
              href="https://shannon-explorer.somnia.network"
              target="_blank"
              rel="noreferrer"
            >
              Shannon explorer
            </a>
            <a
              className="hover:text-foreground"
              href="https://dorahacks.io/hackathon/event-contracts"
              target="_blank"
              rel="noreferrer"
            >
              Event Contracts Hackathon
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
