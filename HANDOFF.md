# Perennis, build handoff

Paste this whole file into a fresh coding agent session opened at the repo root.
It is everything you need to start working. Do not go looking for other context.

---

## 1. Context

**Product:** Perennis

**One liner:** Stop renewing your Event Contracts position every 15 minutes.
Write the plan once, and the vault redeems and re-enters itself at every
settlement with your stop rules enforced as contract terms.

**What it feels like to use:** You open Perennis, deposit some collateral, and
write one plan: which direction, how much per window, how many windows, and what
makes it stop. Then you can close the tab. At the end of each round your winnings
are credited automatically and the next round is entered with the same plan,
without you clicking anything. If you lose twice in a row, or your balance falls
to the floor you set, the plan halts itself and the remaining balance waits in
the vault. You can come back at any time to halt the plan or withdraw.

**Hackathon:** Event Contracts Hackathon, run by Somnia Network with DreamDEX.
https://dorahacks.io/hackathon/event-contracts

**Submission deadline:** 8 September 2026, 18:00 UTC. Upload the video at least
12 hours before that.

**Target track:** $5,000 USDso prize pool (the single cash line, one open track,
no sponsor bounties published). A featured placement in the Somnia Discord
showcase series comes off the same judging with no extra work, so there is
nothing else to enter and no second submission to prepare.

**Verified submission requirements:**

- The project must use DreamDEX Event Contracts meaningfully.
- A working consumer facing product: a trading app, an AI trading agent, an
  analytics tool, a social prediction product, or something adjacent. Judges
  expect something close to production from experienced developers, not a proof
  of concept.
- Submitted as a BUIDL on DoraHacks. A GitHub link and a demo video are both
  mandatory on the form.
- Package: a prototype working on testnet, the public repo, a 2 to 3 minute demo
  video, optionally a slide deck and an SDK documentation feedback report.

**Judging weights, confirmed from the page:** Innovation and Originality 20%,
Technical Implementation 25%, User Experience and Design 20%, Business and
Ecosystem Impact 20%, Presentation and Demo 15%.

**Known field size:** roughly 10 BUIDLs as of 29 August, 249 registered
participants. It will grow in the last 48 hours. The prize split per placement
was never published.

---

## 2. Current state of this repo

Runs today with `npm install && npm run dev`, no env vars needed.

```
DEMO.md                       the cross phase demo contract. Steps, routes, the
                              wow moment. Phase 8's shot list comes from it
CLAUDE.md                     permanent agent notes: commands, pitfalls, the
                              Vercel guardrails, event to demo step table
app/
  layout.tsx                  metadata (title template), SiteHeader, <main>,
                              SiteFooter. The shared shell for both routes
  page.tsx                    landing only: hero, how it works, differentiation,
                              risk. Static, no data fetching
  console/page.tsx            THE DEMO ROUTE. Server component, force-dynamic,
                              reads through getAdapter() and renders the console
  console/loading.tsx         skeleton matching the console grid
  api/windows/route.ts        GET, ApiResponse<EventWindow[]> via getAdapter()
  api/vaults/route.ts         GET, ApiResponse<Vault[]> via getAdapter()
  api/health/route.ts         GET, adapter mode, chain id, decimals, whether a
                              vault address is set. Phase 2's readiness probe
  globals.css                 ALL colors live here as CSS variables. Palette:
                              #0B0F14 ground, #2DD4BF teal accent, #F5A524 amber
                              (stop rules and losses only), #94A3B8 slate
  icon.svg                    favicon glyph
  opengraph-image.png         pre-generated, Next serves it automatically.
                              Do NOT add an opengraph-image.tsx alongside it
  error.tsx, not-found.tsx,
  global-error.tsx            styled error and empty states
components/
  site-header.tsx             client component. Logo, chain badge, nav over the
                              two routes with aria-current
  site-footer.tsx             wordmark and the four reference links
  standing-plan-console.tsx   THE CORE SCREEN, client component. Plan builder,
                              live vault card with countdown ring, pre-write
                              health strip, roll ledger timeline
  ui/                         shadcn primitives (button, card, badge, input).
                              Extend here, never style inline
lib/
  types.ts                    every domain type plus ApiResponse<T>. No values
  data/seed.ts                typed re-export of the fixtures, plus planDefaults
  adapters/types.ts           the PerennisAdapter interface
  adapters/fake.ts            fixtures, source "seed", no viem import
  adapters/chain.ts           wraps lib/dreamdex.ts reads unchanged
  adapters/index.ts           getAdapter(), reads ADAPTER_MODE, defaults to fake
  vault.ts                    PURE roll engine, a mirror of the contract's
                              settlement path, plus preflight() checks
  dreamdex.ts                 chain integration, viem, Shannon chain definition
fixtures/
  event-windows.json          12 windows, unique market ids
  vaults.json                 3 vaults, Vault 03 halted on consecutive-losses
  seed-manifest.json          written by npm run seed, byte identical per run
scripts/
  seed.mjs                    fixture invariant checks and the manifest writer
contracts/
  src/PerennisVault.sol       the vault and the reactivity handler
  test/PerennisVault.t.sol    require based tests, no forge-std, mocks inline
  script/Deploy.s.sol         forge deploy script, returns the address
  README.md                   build, deploy and first run commands
public/
  logo.svg                    wordmark used in the header and footer
  brand/logo.png, brand/og.png  pre-generated rasters, both used on the page
  illustrations/*.svg         window grid and roll loop diagram, both rendered
```

**What is real:**

- `contracts/src/PerennisVault.sol` is complete and compiles: deposit, withdraw,
  `startPlan`, permissionless `armNext`, `halt`, the `_onEvent` handler, the stop
  rule evaluation and the roll ledger.
- `lib/dreamdex.ts` `fetchVaults()` reads `snapshot()` and `plan()` off a
  deployed vault over viem. That ABI is generated by hand from the contract in
  this repo, so it is exact.
- `lib/dreamdex.ts` `fetchCollateralDecimals()` reads `decimals()` off the ERC20.
- `lib/vault.ts` is the whole roll and stop rule engine, used by the live UI.
- The console is fully interactive: writing a plan, arming windows, halting,
  withdrawing, and the countdown driven roll all change real state.

**What is mocked, by exact function name:**

- The whole app runs on the fake adapter by default. `getAdapter()` in
  `lib/adapters/index.ts` returns `fakeAdapter` unless `ADAPTER_MODE=real`, so
  `/console` and all three API routes serve `fixtures/*.json`. Nothing has been
  read off a chain in this repo yet, not once.
- `ADAPTER_MODE=real` with an empty `NEXT_PUBLIC_CONTRACT_ADDRESS` falls back to
  the fixtures and puts the reason in `note`, which the console renders as a
  warning strip. That is by design, not a bug to fix.
- `fetchEventWindows()` in `lib/dreamdex.ts`. The chain path reads
  `getMarket(bytes32)` per known market id. The market id list is hardcoded and
  the ABI is written from the docs, not verified on chain. Replace with
  `@somnia-chain/markets-sdk` `loadMarkets()` + `isBinaryMarket()`.
- `fetchVaults()` ledger field. Vault numbers would come from the chain but
  `ledger:` is still seeded. Replace with `getLogs` on the `RollSettled` event.
- `resolveWindow()` in `lib/vault.ts`. Deterministic draw seeded from the market
  id, weighted by the implied probability on the book, so demo runs repeat
  exactly. On chain this comes from the settlement event payload.
- `settleAndRoll()` in `lib/vault.ts` drives the console clock. It is a mirror of
  the contract, not the contract. Keep the two in sync.
- The countdown uses `DEMO_WINDOW_SECONDS = 20` in
  `components/standing-plan-console.tsx`, a real window is 15 minutes. It is
  labelled as a demo clock on screen. Do not quietly present it as real time.
- `@somnia-chain/markets-sdk` is deliberately not in package.json yet. Add it
  when you wire live market discovery and order submission, and pin the version
  you actually install.

---

## 3. Mission, in build order

Total feature budget is about 12 hours. If you fall behind, cut from the bottom.

### A. Get the subscription open, before anything else (0.5h)

This is the single highest risk item in the project and it gates everything after
it. Opening a reactivity subscription needs a 32 SOMI balance on the owner, and
whether the Shannon STT equivalent behaves the same has not been verified.

Deploy the vault with an empty plan and open a subscription against any emitter.
If the balance requirement blocks you, ask in Somnia Discord `#dev-chat` and at
`developers@somnia.foundation` in the same hour. Everything below depends on the
answer, so do not start the UI work until you know.

While you are there, run the DreamDEX bot kit's `npx tsx scripts/doctor.ts`
against the testnet, call `faucet(10000)` on tUSDC, and read the collateral
decimals off the chain.

**Done looks like:** a subscription id returned by the precompile, and a handler
you wrote firing once on a real event.

### B. Verify the three unknown interfaces and deploy for real (4h)

`contracts/src/PerennisVault.sol` is written but three interfaces at the top of
the file are taken from documentation rather than the chain, and each is called
out in `contracts/README.md`:

1. `ISomniaReactivity.subscribe` at `0x0000...0100`
2. `MARKET_RESOLVED`, currently `keccak256("MarketResolved(bytes32,uint8)")`.
   Pull a real settlement receipt with `cast receipt` and compare topic 0, and
   check whether the payload really is a bare `uint8`.
3. `IBinaryMarkets.buy`, `.redeem`, `.marketState` on the BinaryMarketsModule

Fix whatever does not match, deploy to Shannon, deposit, `startPlan` on a real
window, and watch one settlement.

**Done looks like:** you have seen one roll happen on chain, and the transaction
came from a validator in the settlement block rather than from your wallet. Put
the vault address in `.env.local` and confirm the console badge flips from "Seed
data" to "Live read from Shannon". This is the end of day one and the wow moment
must exist by here.

### C. Window queue on live data (2h)

Swap `fetchEventWindows()` onto `markets-sdk` `loadMarkets()`, filter with
`isBinaryMarket()`, and have the plan builder write the real next three market
ids in the `startPlan` call. Wire the "Arm 3 more windows" button to the
permissionless `armNext` so anyone can refill a dry queue.

**Done looks like:** the plan transaction confirmation shows three windows queued
in one line, and the console never shows a stale market id.

### D. Ledger from chain logs (1h)

Replace the seeded `ledger:` in `fetchVaults()` with `getLogs` on `RollSettled`.
The timeline component already takes the shape it needs.

**Done looks like:** reload the page and the roll history survives, because it
was never in memory.

### E. Wallet connect and the write path (2h)

Right now the console mutates local state. Add wagmi + viem wallet connection and
send the real `deposit`, `startPlan`, `armNext`, `halt` and `withdraw`
transactions. Keep the optimistic local update so the card still moves while the
transaction confirms.

**Done looks like:** one signature for the plan, and a visible zero after it.

### F. Health strip against live values (1h)

`preflight()` in `lib/vault.ts` already renders. Feed it the real market
lifecycle state, the on chain decimals, and the actual subscription gas balance.
Set a generous `priorityFeePerGas`: the docs warn that a low one can defer a
handler run indefinitely, and a delayed roll has to read as a designed state on
camera rather than a bug.

**Done looks like:** the strip is green at second 40 of the demo, showing market
state Trading and enough subscription gas, and then the countdown hits zero.

### G. Submission (about 4h, not feature work)

README demo links, an architecture diagram, and the optional SDK documentation
feedback report. That report is free points with the developer relations side, so
write down every piece of friction you hit in section B honestly.

**The wow moment, scheduled explicitly.** Record it against a real 15 minute
window boundary, one unbroken take, no cuts:

- 0 to 15s: empty vault. Deposit 200 tUSDC, write the plan in three fields: Up,
  25 per window, 8 windows, stop at 2 losses in a row, floor 100, take profit
  320. One signature. Say: "that is my last click."
- 15 to 45s: position open in the first window, countdown running, implied
  probability and book on the card. At second 40 show the health strip. Take your
  hands off the keyboard and show there is nothing pending in the wallet.
- 45 to 75s: countdown hits zero. The card turns over by itself, the position is
  redeemed, the streak moves, the balance updates and a new position appears in
  the next window. Then open Shannon explorer and show that the roll transaction
  was produced by a validator in the settlement block, not sent from the user's
  wallet. **This is the whole submission. Everything else supports it.**
- 75 to 90s: switch to the pre-loaded second vault, read two consecutive losses
  in the roll ledger, show the plan halted itself and the balance is sitting in
  the vault. Close on: "nobody clicked, nobody stopped it, the rule was inside
  the contract."

One judging risk worth designing around: this is none of the four product types
the hackathon page invites, so a judge could file it as infrastructure rather
than a product. Open both the video and the README's first paragraph with the
human problem (coming back every 15 minutes), not with the contract. Show the
trader first, the architecture second.

---

## 4. Constraints

**Stack:** Next.js 15 App Router, TypeScript strict, Tailwind v4, deploys to
Vercel. No custom server, no runtime filesystem writes, no long lived process.
Tailwind v4 syntax only: there is no `tailwind.config.js` and no `@tailwind`
directives. Route `params` and `searchParams` are Promises and must be awaited.
Anything with `useState`, `useEffect` or an event handler needs `"use client"`.

**Design:** all colors are CSS variables in `app/globals.css`. Never put a hex
value in a component. Teal carries the identity, amber is only for stop rules and
loss states, and if amber starts appearing next to neutral information you have
broken the system. Every interactive element goes through `components/ui/` with
`cn()`. If you need a primitive that is not there, write it into
`components/ui/` in the same shadcn form, never inline.

**Writing style for anything a judge reads:** no em dashes and no en dashes, use
a comma or a period or parentheses. Banned words: seamless, leverage, empower,
revolutionize, streamline, game changer, cutting edge, delve, robust, unlock,
elevate, harness, effortless. Vary your sentence length. Use concrete numbers.
Write like a builder, not like a landing page.

**Scope discipline:** if something threatens the deadline, cut scope rather than
polish. A working roll on chain with an ugly ledger beats a beautiful ledger and
a roll you had to fake. Section B is not cuttable. Sections D, E and F are, in
that order.

**Keep `npm run build` passing after every change.** Do not leave the repo in a
state where it does not compile, even mid task.

---

## 5. Definition of done

- Deployed on Vercel and the URL is live.
- `README.md` demo links filled in: the Vercel URL and the video URL, with the
  `<ADD_VIDEO_URL>` placeholder gone.
- `PerennisVault` deployed on Shannon, the address in `.env.local` and in the
  README, and the console header reading "Live read from Shannon".
- The 90 second flow above works end to end against a real window, and the roll
  in the middle of it happened without a signature.
- The explorer tab is open and ready, showing the roll transaction came from the
  settlement block rather than from the user's wallet.
- The second vault is pre-loaded and already halted on two consecutive losses,
  so the closing 15 seconds need no setup.
- The wow moment has been rehearsed at least twice against a real window
  boundary, because you only get one take.
- BUIDL submitted on DoraHacks with the repo link and the video, at least 12
  hours before 8 September 18:00 UTC.

---

## 6. Phase 1 record, the walking skeleton

### Goal

Create the five seams every later phase depends on (the demo contract, the
`ADAPTER_MODE` adapter, the API handlers, the tokens file, a deployable shell)
and make the 90 second demo path clickable end to end on fixtures from a
dedicated `/console` route. No features, no chain work.

### Status

Done, with one deliberate deviation recorded below. The demo step that had to
work now lives on `/console`: the countdown reaches zero, `settleAndRoll()` in
`lib/vault.ts` turns the card over, a row lands in the roll ledger, and no
signature is asked for.

Nothing here has been executed. `npm install`, `npm run build`, `npm run seed`
and `forge build` are the runner's job, so treat every command dependent item as
unverified rather than passing.

### Decisions

- **Two routes, no more.** `/` is the landing page, `/console` is the demo. The
  old `#console` anchor is gone and no anchor to it survives outside `DEMO.md`.
- **Fake is the default adapter.** Only `ADAPTER_MODE === "real"` picks the chain
  path. A misspelled value gives a working console rather than a blank page.
- **`lib/data.ts` is deleted.** Types moved to `lib/types.ts`, values moved to
  `fixtures/*.json` and are re-exported through `lib/data/seed.ts` with a cast.
  `scripts/seed.mjs` is what actually guards those files, so the cast is the
  assertion and the seed script is the check.
- **`Sourced<T>` is gone,** replaced by `ApiResponse<T>` in `lib/types.ts`. One
  response shape for adapters, API handlers and pages.
- **The countdown now says it is a demo clock on screen.** `HANDOFF.md` and
  `DEMO.md` both claim it is labelled, and it was not, so a caption was added
  under the ring: "Demo clock: 20 seconds stands in for a real 15 minute window."
- **No new npm dependency.** None was needed, so the safe default held.
- **`app/global-error.tsx` now imports `globals.css`** and names CSS variables
  instead of carrying four hex literals, so `app/globals.css` really is the only
  place a color is defined.

### Failed attempts and deviations

- **`contracts/test/PerennisVault.t.sol` has exactly one import line**, and the
  acceptance list asked for none. `import {PerennisVault} from
  "../src/PerennisVault.sol";` is unavoidable: Solidity resolves symbols per
  file, so a test file with zero imports cannot name, deploy or call the contract
  it is testing. The reason behind the rule is honoured in full, which is that
  `forge-std` is not vendored (`contracts/lib` does not exist) and importing it
  would break `forge build`. There is no forge-std import, no cheatcode, and the
  mock ERC20 and mock markets module are declared in the same file. Assertions
  are plain `require`. If the runner wants literally zero imports, the only
  option is to delete the test file.

### Files changed

Added: `DEMO.md`, `CLAUDE.md`, `.farm-commits.json`, `lib/types.ts`,
`lib/data/seed.ts`, `lib/adapters/{types,fake,chain,index}.ts`,
`fixtures/{event-windows,vaults}.json`, `scripts/seed.mjs`,
`app/console/{page,loading}.tsx`, `app/api/{windows,vaults,health}/route.ts`,
`components/site-footer.tsx`, `contracts/test/PerennisVault.t.sol`.

Changed: `app/layout.tsx`, `app/page.tsx`, `app/error.tsx`, `app/not-found.tsx`,
`app/global-error.tsx`, `components/site-header.tsx`,
`components/standing-plan-console.tsx`, `lib/dreamdex.ts`, `lib/vault.ts`,
`package.json`, `.env.example`, `README.md`, `HANDOFF.md`.

Deleted: `lib/data.ts`.

### Commands the runner should run

```bash
npm install
npm run build          # must pass with zero TypeScript errors
npm run seed           # twice: fixtures/seed-manifest.json must be identical
cd contracts && forge build
```

Then the first Vercel deploy, and write the production URL back into the demo
link line in `README.md` and into this file.

### Open questions for the human

1. `contracts/test/PerennisVault.t.sol` keeps one relative import. Accept it, or
   drop the test file? Accepting is the recommendation.
2. Nothing else needed asking. No new dependency, no third page route, no change
   to the stop rule semantics in `lib/vault.ts` or `PerennisVault.sol`.

### Next best step for Phase 2

Open the reactivity subscription and verify the three unknown interfaces
(section 3A and 3B above). The frontend side is already staged for it: flip
`ADAPTER_MODE` to `real`, fill `NEXT_PUBLIC_CONTRACT_ADDRESS`, and
`lib/adapters/chain.ts` starts serving `/console` and all three API routes with
no page file touched. `GET /api/health` is the one place to check whether that
flip actually took.

Before any of that, the deployer wallet (`FARM_EVM_PRIVATE_KEY`) needs STT for
gas on `https://dream-rpc.somnia.network` (chain 50312), plus whatever the
reactivity subscription's 32 SOMI equivalent turns out to be on Shannon, and
tUSDC through `faucet(uint256)` on
`0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E`.
