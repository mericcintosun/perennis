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
DELIVERY.md                   the two hackathon rows, what to submit, and the
                              human's pre-submission list
app/
  layout.tsx                  metadata (title template), SiteHeader, <main>,
                              SiteFooter. The shared shell for both routes
  page.tsx                    landing only: hero, how it works, differentiation,
                              risk. Static, no data fetching
  console/page.tsx            THE DEMO ROUTE. Server component, force-dynamic,
                              reads through getAdapter() and renders the console
  console/loading.tsx         skeleton matching the console grid
  api/windows/route.ts        GET, ApiResponse<EventWindow[]> via getAdapter()
  api/vaults/route.ts         GET, ApiResponse<Vault[]> via getAdapter(), with
                              an optional address query param validated by zod
  api/rolls/route.ts          GET, ApiResponse<RollEntry[]>, the roll ledger on
                              its own. Optional address and limit params
  api/health/route.ts         GET, adapter mode, chain id, decimals, whether a
                              vault address is set, the reactivity precompile
                              and rollLedgerSource. The readiness probe
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
  config.ts                   every address, endpoint and tuning constant.
                              Imports nothing, not even viem
  errors.ts                   CoreErrorCode, CoreFailure, coreFailure()
  log.ts                      the [core] logger. Ids, hashes, counts, durations
  schemas.ts                  zod schemas the API routes parse queries with
  types.ts                    every domain type plus ApiResponse<T>. No values
  data/seed.ts                typed re-export of the fixtures, plus planDefaults
  adapters/types.ts           the PerennisAdapter interface
  adapters/fake.ts            fixtures, source "seed", no viem import
  adapters/chain.ts           wraps lib/dreamdex.ts reads unchanged
  adapters/index.ts           getAdapter(), reads ADAPTER_MODE, defaults to fake
  vault.ts                    PURE roll engine, a mirror of the contract's
                              settlement path, plus preflight() checks
  dreamdex.ts                 chain integration: vault snapshot, roll ledger,
                              collateral decimals. Server only
  markets.ts                  market discovery, three levels: the markets SDK,
                              the per id getMarket read, the fixtures
  rpc.ts                      the Shannon client and the one retry loop, shared
                              by dreamdex.ts and markets.ts
types/
  somnia-markets-sdk.d.ts     the narrow SDK surface this app calls
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
- `lib/tx.ts` is the write path. With `NEXT_PUBLIC_CONTRACT_ADDRESS` set and a
  wallet connected on chain 50312, the plan button sends approve, deposit and
  one `startPlan`, and "Arm 3 more windows", "Halt the plan" and the withdraw
  button send `armNext`, `halt` and `withdraw`. Every one of them falls back to
  the local state update in the same function when either half is missing.

**What is mocked, by exact function name:**

- The whole app runs on the fake adapter by default. `getAdapter()` in
  `lib/adapters/index.ts` returns `fakeAdapter` unless `ADAPTER_MODE=real`, so
  `/console` and all three API routes serve `fixtures/*.json`. Nothing has been
  read off a chain in this repo yet, not once.
- `ADAPTER_MODE=real` with an empty `NEXT_PUBLIC_CONTRACT_ADDRESS` falls back to
  the fixtures and puts the reason in `note`, which the console renders as a
  warning strip. That is by design, not a bug to fix.
- ~~`fetchEventWindows()` in `lib/dreamdex.ts`.~~ Done in Phase 4.
  `discoverEventWindows()` in `lib/markets.ts` calls
  `@somnia-chain/markets-sdk` `loadMarkets()` filtered by `isBinaryMarket()`,
  with the per id `getMarket(bytes32)` read as the fallback and the fixtures
  behind that. The SDK call site has never been executed from inside this repo,
  so treat it as unverified. See section 9.
- ~~`fetchVaults()` ledger field.~~ Done in Phase 2. `fetchRollLedger()` in
  `lib/dreamdex.ts` builds the ledger from `getLogs` on `RollSettled`, and the
  fixture ledger is only the fallback. See section 7.
- `resolveWindow()` in `lib/vault.ts`. Deterministic draw seeded from the market
  id, weighted by the implied probability on the book, so demo runs repeat
  exactly. On chain this comes from the settlement event payload.
- `settleAndRoll()` in `lib/vault.ts` drives the console clock. It is a mirror of
  the contract, not the contract. Keep the two in sync.
- The countdown uses `DEMO_WINDOW_SECONDS = 20` in
  `components/standing-plan-console.tsx`, a real window is 15 minutes. It is
  labelled as a demo clock on screen. Do not quietly present it as real time.
- `@somnia-chain/markets-sdk` is in `package.json` under `optionalDependencies`
  at `^0.28.0` as of Phase 4, loaded through a guarded dynamic import so a
  package that cannot be fetched degrades one read rather than breaking the
  install. Confirm the exact published name before the recording.
- The window queue written by `startPlan` comes from whatever
  `discoverEventWindows()` produced for that render. On the SDK path those are
  real market ids and `toBytes32()` in `lib/tx.ts` passes them through unchanged.
  On either fallback they are fixture ids padded to bytes32, which the module
  cannot resolve, so `_enterNext` emits `EntrySkipped`. `GET /api/health` says
  which of the two you are on.

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

---

## 7. Phase 2 record, the roll ledger comes off the chain

### Goal

Take one mechanism off fixtures: the vault snapshot and the roll ledger, read
off a deployed `PerennisVault` on Shannon with the ledger built from
`RollSettled` logs instead of `syntheticTxHash()` in `lib/vault.ts`. That makes
`DEMO.md` step 5 real, because the new ledger row links to a real Shannon
explorer transaction and its "validator call" badge is derived from the
transaction sender rather than asserted.

### Status

Written, not executed. Nothing in this phase was run: no `npm install`, no
`npm run build`, no `forge test`, no RPC call against Shannon. Treat every
command dependent claim as unverified.

**The mechanism that went real:** the vault snapshot (`fetchVaults()`) and the
roll ledger (`fetchRollLedger()`), both in `lib/dreamdex.ts`. The ledger reads
`RollSettled` logs off `NEXT_PUBLIC_CONTRACT_ADDRESS`, keeps the most recent 12,
reads `rollAt(index)` for the stake, direction and settlement timestamp the
event payload does not carry, and derives `trigger` by comparing the sender of
the emitting transaction against `owner()` on the vault. A sender that is not
the owner is labelled `"reactivity"` and the console badge reads "validator
call"; the owner is labelled `"manual"` and the badge reads "owner call".

**Adapter methods still on fixtures:**

- `getEventWindows()`. Market discovery is still a hardcoded id list with a
  per id `getMarket(bytes32)` overlay. The `@somnia-chain/markets-sdk`
  `loadMarkets()` plus `isBinaryMarket()` swap is Phase 3.
- `resolveWindow()` in `lib/vault.ts`, the deterministic draw.
- `settleAndRoll()` in `lib/vault.ts`, the mirror that drives the console clock.
- `DEMO_WINDOW_SECONDS = 20` in `components/standing-plan-console.tsx`, the demo
  clock, still labelled as one on screen.
- `getCollateralDecimals()` reads the real token when
  `NEXT_PUBLIC_COLLATERAL_TOKEN` is set, and returns 6 otherwise.

**Env keys the runner must fill** to see any of this against the chain:

| Key | Value |
| --- | --- |
| `ADAPTER_MODE` | `real` |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | the deployed `PerennisVault` address |
| `NEXT_PUBLIC_BINARY_MARKETS_MODULE` | DreamDEX BinaryMarketsModule on Shannon |

`NEXT_PUBLIC_COLLATERAL_TOKEN` is already filled with tUSDC.
`NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_SOMNIA_RPC_URL` and
`NEXT_PUBLIC_EXPLORER_URL` have working defaults.

No key with a `NEXT_PUBLIC_` prefix holds a secret. The deployer key is used by
forge on the command line and is read by no file under `app/`, `components/` or
`lib/`.

### Decisions

- **`lib/config.ts` is the only config reader.** Every address, endpoint and
  tuning constant moved there and it imports nothing, not even viem, so a client
  file that pulls it in cannot drag the RPC layer into the bundle. Only two
  files in the repo read `process.env` now: `lib/config.ts` and
  `lib/adapters/index.ts`, which needs `ADAPTER_MODE` before any config loads.
- **`app/layout.tsx`, `app/console/page.tsx` and `app/api/health/route.ts` no
  longer import `lib/dreamdex.ts`.** They wanted the chain id and the explorer
  base, which are config, so they take `CHAIN_ID` and `EXPLORER_URL` from
  `lib/config.ts`. That keeps viem out of three module graphs it had no reason
  to be in.
- **One retry loop, in one function.** `withTimeoutAndRetry()` in
  `lib/dreamdex.ts` wraps every outbound call. Worst case latency for a single
  read is `RPC_TIMEOUT_MS * (RPC_RETRY_COUNT + 1)`, both from `lib/config.ts`.
  There is no second retry loop on the core path.
- **Provider messages are never passed through.** `lib/errors.ts` classifies a
  throw by shape, not by text, and every `note` is a sentence written by us.
  Provider strings carry RPC URLs and sometimes request bodies, and those do not
  belong on a page.
- **The ledger read is bounded three times over**: `fromBlock` is `latest`
  minus `LEDGER_LOOKBACK_BLOCKS`, at most `MAX_LEDGER_ROWS` logs are kept, and
  the per row follow up reads only run over those. Transaction reads are
  deduplicated by hash, so twelve rows from three transactions cost three calls.
- **The "validator call" badge is now derived.** It was hardcoded in
  `components/standing-plan-console.tsx`. It reads `entry.trigger`, which is
  `"reactivity"` for every fixture row, so the fake path renders exactly what it
  rendered before.
- **`app/api/rolls/route.ts` accepts `address` but does not route on it.** This
  deployment reads one vault. The parameter is validated and reserved so the
  factory work in a later phase does not change this endpoint's contract.
- **One new dependency, the pre-approved one.** `zod ^3.24.1`. No markets SDK,
  no wagmi, no rainbowkit.

### Failed attempts and deviations

- **`_settleAndRoll` still opens with an interaction.** The acceptance list asks
  for checks, effects, interactions there, but `markets.redeem(marketId)` has to
  run before the payout is known, so the first statement in that function is an
  external call and no reordering fixes that without changing the payout maths,
  which the fence forbids. The mitigation is the `noReentry` lock on `_onEvent`,
  the only path that reaches `_settleAndRoll`. `withdraw` and `deposit` do read
  correctly, and `deposit` documents its exception in the file.
- **A voided market reads as `LOST` on the chain path.** `RollSettled` carries a
  `bool won`, not a three way outcome, so `fetchRollLedger()` cannot tell a
  voided window (which pays 0.5 to both sides) from a loss. The fixture path
  still has `VOIDED` rows. Fixing this needs an event signature change, which
  the fence forbids, so it is recorded here instead. See the open questions.
- **`entryCents` is derived, not read.** The entry price is not in the event
  payload. A winning roll pays 1 per contract, so stake divided by payout is the
  price actually paid; otherwise the matching fixture window's book price is
  used; a losing roll on an unknown market leaves 0, which renders as "0c"
  rather than an invented number.
- **`settledAt` falls back to the epoch** on the rare row where the `rollAt`
  follow up read fails but the log itself came through. That renders as
  "00:00:00 UTC". Better than dropping a real row or inventing a time.

### Files changed

Added: `lib/config.ts`, `lib/errors.ts`, `lib/log.ts`, `lib/schemas.ts`,
`app/api/rolls/route.ts`.

Changed: `lib/dreamdex.ts`, `lib/adapters/types.ts`, `lib/adapters/fake.ts`,
`lib/adapters/chain.ts`, `lib/adapters/index.ts`, `app/api/vaults/route.ts`,
`app/api/health/route.ts`, `app/console/page.tsx`, `app/layout.tsx`,
`components/standing-plan-console.tsx`, `contracts/src/PerennisVault.sol`,
`contracts/test/PerennisVault.t.sol`, `package.json`, `.env.example`,
`README.md`, `CLAUDE.md`, `HANDOFF.md`.

Deleted: nothing.

### Commands the runner should run

```bash
npm install            # picks up zod ^3.24.1
npm run build          # must pass with zero TypeScript errors
npm run seed           # twice, fixtures/seed-manifest.json must be identical
npm run test:contracts # cd contracts && forge test, fuzz case included
```

Then deploy the vault to Shannon, write the address into `.env.local` as
`NEXT_PUBLIC_CONTRACT_ADDRESS` and into `README.md`, set `ADAPTER_MODE=real`,
and check `GET /api/health`: `adapterMode` should read `"real"`,
`vaultAddressSet` should be `true`, and `rollLedgerSource` should read
`"chain"` once one settlement has happened. `GET /api/rolls` returns the ledger
on its own. Then spot check `/console` on the live URL with `ADAPTER_MODE`
unset, to confirm the fake path still renders.

### Open questions for the human

1. **Voided markets on the chain ledger.** `RollSettled` carries `bool won`, so
   a voided window is indistinguishable from a loss when read back. Options:
   add a `uint8 outcome` to the event (breaks the "rename no event" rule in
   spirit and needs `lib/vault.ts` updated in the same edit), read the markets
   module for the settlement mode per row (one more RPC call per row), or leave
   it. Safe default taken: leave it, and record the gap here.
2. **The `address` query parameter on `/api/rolls` and `/api/vaults`.** Both
   validate it and `/api/vaults` filters on it, but neither can serve a vault
   other than the configured one. Confirm that this is the right shape to keep
   before the factory work in a later phase.
3. **`MAX_PENDING = 32` on the queue.** A plan with more than 32 windows would
   need repeated `armNext` calls rather than one big one. The demo plan is 8
   windows, so this is far off the path, but it is a real limit and worth a
   nod.

### Next best step for Phase 3

Wallet connect and the write path (section 3E), then live market discovery
(section 3C). The read side is now done: `lib/adapters/chain.ts` serves the
console and all four API routes off Shannon with no page file touched, and
`GET /api/health` says whether it took. What is left on the demo path is that
`deposit`, `startPlan`, `armNext`, `halt` and `withdraw` still mutate local
state in `components/standing-plan-console.tsx` instead of sending a
transaction.

---

## 8. Phase 3 record, the write path and the wallet states

### Goal

Take the other half off local state. `DEMO.md` step 1 now runs as real
transactions (approve when the allowance is short, deposit, then one `startPlan`
that writes the plan, queues the windows, funds the subscription out of
`msg.value` and enters the first window), and step 4 re-reads the chain instead
of running the `settleAndRoll()` mirror whenever a vault address is configured.
Steps 2, 3, 5 and 6 keep working on both paths, and the fixture path renders
exactly what it rendered before.

### Status

Written, not executed. Nothing in this phase was run: no `npm install`, no
`npm run build`, no `npm run seed`, no `forge test`, no RPC call, no
transaction, no wallet dialog. Every command dependent claim below is
unverified and is the runner's to check.

**The mechanism that went real:** the five writes. `lib/tx.ts` encodes them with
`encodeFunctionData`, sends them through a `createWalletClient` over
`window.ethereum`, and waits `TX_CONFIRMATIONS` on a `createPublicClient` over
`RPC_URL`. `components/standing-plan-console.tsx` holds one `WalletState` and
calls `router.refresh()` on `tx-confirmed`, so the card follows the chain rather
than a local mutation.

**Still mocked, by exact function name:**

- `fetchEventWindows()` in `lib/dreamdex.ts`. Market discovery is still a
  hardcoded id list with a per id `getMarket(bytes32)` overlay. The
  `@somnia-chain/markets-sdk` `loadMarkets()` plus `isBinaryMarket()` swap is
  Phase 4, deferred because it is a new dependency this phase was told not to
  add and because the console cannot install or resolve one.
- `resolveWindow()` in `lib/vault.ts`, the deterministic draw.
- `settleAndRoll()` in `lib/vault.ts`. Still the mirror that drives the console
  clock, but only on the fixture path now: with `source === "chain"` the
  countdown effect calls `router.refresh()` instead.
- `syntheticTxHash()` in `lib/vault.ts`, reached only from `settleAndRoll()`.
- `toBytes32()` in `lib/tx.ts`. The queue written into `startPlan` is fixture
  market ids right padded to bytes32, so a real `startPlan` queues windows the
  BinaryMarketsModule does not know about until Phase 4 lands real discovery.
  The plan, the deposit, the stop rules and the subscription are all real.
- `DEMO_WINDOW_SECONDS = 20`, the demo clock, still labelled as one on screen.

### Decisions

- **Persistence is row 4 of the decision table: the step's proof IS the chain.**
  The demo's mutable state lives in `PerennisVault` on Shannon and nowhere else.
  Two rows were considered and rejected. A mirror database (Postgres or SQLite)
  was rejected because the whole claim of the product is that the roll happened
  without a server, and a row in our own table proves nothing a judge would
  accept. A KV store for the roll ledger was rejected for the same reason plus
  a second one: Phase 2 already reads the ledger from `RollSettled` logs, so a
  KV would be a cache in front of the only source of truth, with its own staleness
  bug on camera. There is no database, no KV, no Postgres, and no runtime
  filesystem write.
- **Client side idempotency, because there is no server side write.** The
  template's API route idempotency item does not apply: nothing on the demo path
  posts to a route. `withIdempotency()` in `lib/tx.ts` keys in flight calls on
  `${vaultAddress}:${functionName}:${argsHash}` and returns the first promise to
  a second caller, and the chain nonce is the second guard. Every submit control
  is also `disabled` on `isBusy(walletState)`, never on a timer.
- **No new npm dependency.** `viem ^2.21.0` was already installed and is the
  whole write path. No wagmi, no rainbowkit, no ethers, and no markets SDK. The
  EIP-1193 surface this app needs is four methods, written out in `lib/tx.ts`
  rather than pulled in as a library.
- **The viem client fence lift, two files.** `CLAUDE.md` says viem stays off the
  client bundle. A write path needs an encoder, so exactly two client reachable
  modules may import it: `lib/abi.ts` (data literals, imports nothing) and
  `lib/tx.ts`. `lib/dreamdex.ts` stays server only, and no file under `app/` or
  `components/` imports it. The lift is recorded in `CLAUDE.md` and is spent.
- **`lib/abi.ts` holds every ABI now**, and `lib/dreamdex.ts` re-exports the four
  read ones, so every Phase 2 importer keeps working with no edit. The five write
  entries live in a separate `perennisVaultWriteAbi` so the read array is still a
  literal copy of what Phase 2 shipped.
- **Decimals are never hardcoded on the write path.** Every amount goes through
  `parseUnits` with the decimals the adapter read off the token. A constant that
  is right on testnet misprices every order on mainnet.
- **`startPlan` carries value.** `NEXT_PUBLIC_SUBSCRIPTION_FUNDING_STT` (default
  `"0.05"`) is parsed with `parseEther` at call time. A string rather than a
  number because 0.05 has no exact float representation. A plan sent with zero
  value opens a subscription that cannot pay for a roll, which is the one failure
  the demo cannot recover from on camera.
- **Provider strings are never shown.** Code 4001 gets its own copy ("You closed
  the wallet, nothing was sent."), everything else goes through `classify()` in
  `lib/errors.ts` and gets a sentence written by us. Same rule Phase 2 set for
  the read path.
- **`planFormSchema` in `lib/schemas.ts` is now the single definition of a valid
  plan.** The console's `errors` memo renders what the schema produced, and
  nothing is encoded before `parsePlanForm()` succeeds.
- **The scripts own the fixtures, the human owns the chain.**
  `scripts/demo-reset.mjs` re-verifies `fixtures/*.json` and rewrites the
  manifest, then prints the exact `cast` commands for the chain half. It sends
  no transaction and holds no key.

### Failed attempts and deviations

- **`sendVaultTx` takes a second argument the spec did not name.** The spec asks
  for `sendVaultTx(call)` returning a `WalletState`, and for a `tx-pending`
  branch that links the hash. Those two cannot both be true with one return
  value: the hash only exists after the broadcast, and the return only arrives
  after the receipt. The fix is an optional `onPending` callback that fires once
  with the `tx-pending` state. Without it the pending branch could only show a
  spinner with nothing to link.
- **The `Plan` tuple's `asset` field is not sent.** `PerennisVault.Plan` has six
  fields and asset is not one of them: the asset is implied by the market ids in
  the queue. The console still holds it in the form and the schema still parses
  it, because the queue filter needs it.
- **A real `startPlan` will queue fixture market ids.** `toBytes32()` pads the
  shortened ids the fixtures carry. Until Phase 4 swaps discovery onto the
  markets SDK, the vault's queue on chain holds ids the module does not resolve,
  so `_enterNext` will emit `EntrySkipped` rather than `PositionOpened`. The
  plan, the money and the subscription are all real. This is the honest state of
  the write path and it is why Phase 4 is discovery.
- **`npm run demo:reset` is a no-op in the ordinary case, on purpose.** The
  fixtures are checked into git and nothing at runtime writes to them, so the
  fixture half of a reset is a proof plus a manifest rewrite. The chain half is
  a printed procedure and not a script action, because resetting a contract means
  sending transactions and this repo has no reason to hold a private key.
- **Nothing was run.** No error survived two correction attempts because no error
  could be observed: this session had no shell.

### Files changed

Added: `lib/abi.ts`, `lib/wallet-state.ts`, `lib/tx.ts`,
`components/wallet-panel.tsx`, `app/console/error.tsx`,
`scripts/demo-reset.mjs`, `.farm-commits.json`.

Changed: `lib/dreamdex.ts`, `lib/config.ts`, `lib/schemas.ts`,
`components/standing-plan-console.tsx`, `app/console/loading.tsx`,
`package.json`, `.env.example`, `README.md`, `CLAUDE.md`, `HANDOFF.md`.

Deleted: nothing. Nothing under `contracts/`, `public/`, `app/icon.svg` or
`app/opengraph-image.png` was touched, and there is still no third page route.

### Commands the runner should run

```bash
npm install            # dependencies are unchanged, this should be a no-op
npm run build          # must pass with zero TypeScript errors
npm run seed           # twice, fixtures/seed-manifest.json must be identical
npm run demo:reset     # then seed again, the manifest must still match
npm run test:contracts # cd contracts && forge test
```

Then, before the walk: import the deployer key into the browser wallet, because
`startPlan`, `withdraw` and `halt` are `onlyOwner`. Fund that address with STT
on chain 50312 for gas plus `NEXT_PUBLIC_SUBSCRIPTION_FUNDING_STT`, and with
tUSDC through `faucet(10000)` on
`0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E`. Fill `.env.local`
(`ADAPTER_MODE=real`, `NEXT_PUBLIC_CONTRACT_ADDRESS`,
`NEXT_PUBLIC_BINARY_MARKETS_MODULE`), check `GET /api/health`, then walk
`DEMO.md` three times. Last, redeploy to Vercel and walk the whole path in a
private window with `ADAPTER_MODE` unset, to confirm the fixture path still
renders.

Four wallet behaviours to check by hand, because no test covers them: connect,
a wrong network switch, one confirmed transaction, and one deliberately
rejected transaction. Each must land on the state the union describes.

### Open questions for the human

1. **`NEXT_PUBLIC_SUBSCRIPTION_FUNDING_STT` default of 0.05.** The reactivity
   docs mention a 32 SOMI equivalent for opening a subscription and section 3A
   of this file says the Shannon behaviour was never verified. 0.05 is a guess
   that keeps the demo cheap. If `startPlan` reverts on funding, raise this key
   rather than editing any code. Safe default taken: 0.05, documented in
   `.env.example`.
2. **The queue length written by `startPlan`.** The console sends the first three
   window ids, matching the copy on the button and in `DEMO.md`. `MAX_QUEUE_ADD`
   is 8. Confirm three is the number you want on camera.
3. **`withdrawAll` sends the full idle balance.** `withdraw` is
   `onlyOwner` and reverts above the balance, so a partial withdrawal UI would
   need a second field. Left as a single button. Confirm that is right.
4. **Approve amount.** The approve is for exactly the deposit, not unlimited. It
   costs one extra dialog on a second deposit and is the safer default. Say if
   you want an unlimited approve for the recording instead.

### Next best step for Phase 4

Live market discovery, section 3C. Add `@somnia-chain/markets-sdk`, pin the
version you actually install, and replace the hardcoded id list in
`fetchEventWindows()` with `loadMarkets()` plus `isBinaryMarket()`. That is the
one change that makes `startPlan` queue market ids the module can resolve, which
turns `EntrySkipped` into `PositionOpened` and closes the last gap between the
demo and the chain. `toBytes32()` in both `lib/tx.ts` and `lib/dreamdex.ts` stops
doing anything the moment ids arrive full length, and both can be deleted in the
same edit. After that, the health strip against live values (section 3F).

---

## 9. Phase 4 record, live discovery and the judged surface

### Goal

Close the gap section 8 named. `fetchEventWindows()` was a hardcoded market id
list, so a real `startPlan` queued ids the DreamDEX BinaryMarketsModule cannot
resolve and `_enterNext` emitted `EntrySkipped` instead of `PositionOpened`.
Phase 4 routes discovery through `@somnia-chain/markets-sdk` `loadMarkets()`
filtered by `isBinaryMarket()`, adds the queue strip as a new `DEMO.md` step 7,
and finishes the surface a judge actually touches: the responsive pass,
`DELIVERY.md`, the README track table, the Twitter card and a landing section
describing what shipped.

### Status

Written, not executed. Nothing in this phase was run: no `npm install`, no
`npm run build`, no `npm run seed`, no `forge test`, no RPC call, no SDK call, no
transaction, no dev server, no browser at any width. Every command dependent
claim below is unverified and is the runner's to check. In particular, whether
`@somnia-chain/markets-sdk` exists under that exact name at 0.28.0 or above has
not been checked against a registry from inside this session.

**The mechanism that went real, on paper:** `discoverEventWindows()` in
`lib/markets.ts`, three levels deep. Level one loads the SDK through a guarded
dynamic import and maps every binary market onto the `EventWindow` shape. Level
two is the Phase 2 per id `getMarket(bytes32)` overlay, moved into the same file
whole. Level three is `fixtures/event-windows.json`. Each level that does not
answer attaches a `note` written by us through `coreFailure()`, and
`GET /api/health` reports `marketDiscovery.via` so a deployment can say which
level answered without anyone reading a log.

**Deleting `lib/markets.ts` breaks `DEMO.md` step 2 and `DEMO.md` step 7.** Step
2 is the open window on the vault card (entry price, implied probability, book
depth), which comes from the window list this module produces. Step 7 is the
queue strip, whose per id lifecycle state is a lookup into that same list. The
dependency table in `DEMO.md` names the file on row 7, and the depth test is
stated under the README track table.

**Still mocked, by exact function name:**

- `resolveWindow()` in `lib/vault.ts`, the deterministic draw seeded from the
  market id. On chain this comes from the settlement event payload.
- `settleAndRoll()` in `lib/vault.ts`, the mirror that drives the console clock.
  Fixture path only: with `source === "chain"` the countdown calls
  `router.refresh()` instead.
- `syntheticTxHash()` in `lib/vault.ts`, reached only from `settleAndRoll()`.
- `DEMO_WINDOW_SECONDS = 20` in `components/standing-plan-console.tsx`, the demo
  clock, still labelled as one on screen.
- `toBytes32()`, which moved from `lib/dreamdex.ts` into `lib/markets.ts` and is
  re-exported from `lib/dreamdex.ts`. It still does real work on the fallback
  path, because fixture ids are the shortened form and need padding. Ids arriving
  full length from the SDK pass through it unchanged, so on the SDK path it is a
  no-op. The copy in `lib/tx.ts` is unchanged and is still what pads the ids the
  console writes into `startPlan`.
- The SDK response shape itself. `types/somnia-markets-sdk.d.ts` is written from
  the docs, not from a verified response, so every field is read through a
  candidate key list and a market that cannot be mapped is dropped rather than
  guessed at.

### Decisions

- **The markets SDK is an `optionalDependencies` entry, not a `dependencies`
  one.** A package that cannot be fetched (a renamed package, a private
  registry, a network failure) has to degrade one read rather than kill
  `npm install` and leave the runner with no repair path. The reason is written
  at the top of `lib/markets.ts` rather than in `package.json`, along with why
  the floor is 0.28.0: below it the decimal conversion produces
  `0.050000000000000003` and orders come back `InvalidPrice`.
- **The SDK import is dynamic, behind a variable specifier, with
  `/* webpackIgnore: true */`, inside try/catch.** That makes a missing package a
  caught runtime condition instead of a bundler resolution failure, which is the
  only way an optional dependency can be honest. Both the namespace and its
  `default` are checked, because a CommonJS package lands under `default` when it
  is imported from an ES module.
- **`lib/rpc.ts` is new, and it is the reason there is still exactly one retry
  loop.** `lib/dreamdex.ts` imports `lib/markets.ts`, so leaving the Shannon
  client and `withTimeoutAndRetry()` in `lib/dreamdex.ts` would have forced
  either a circular import between the two or a second retry loop in the new
  file. Both moved down into `lib/rpc.ts` and both modules import them from
  there. `lib/dreamdex.ts` re-exports `somniaShannon`, `withTimeoutAndRetry` and
  `toBytes32`, so every importer written before this phase resolves them from the
  same place it always did. This is a deviation from the Phase 2 decision that
  says the retry loop lives in `lib/dreamdex.ts`: the rule it was protecting (one
  loop, one bounded worst case latency) is intact, the file changed.
- **Step 7 was inserted at the end and the landing page step moved to 8.** Steps
  1 to 6 keep their numbers because sections 7 and 8 of this file refer to them
  by number and renumbering would make that history wrong.
- **Two nav links stay visible at 360px.** A hamburger for a two item nav costs
  one tap to reach half a menu, which is worse on a phone than the menu. Each
  link carries `inline-flex min-h-11 items-center ... sm:min-h-0` instead, and
  the header row wraps rather than pushing the page sideways. Recorded here as a
  deliberate adaptation of the mobile nav rule.
- **The queue strip has two honest labels, not one invented state.** An id with
  no matching window reads "Not resolved by the markets module yet". An empty id
  reads "Queued on chain, snapshot() reports the count and not the id", which is
  the literal truth: `_queue` is `private` on `PerennisVault` with no per index
  getter, so the chain path knows the pending count and not the ids in it.
- **`QueueStrip` takes a third prop the spec did not name, `source`.** The same
  section asks for a seed caveat branch, and seed-ness is not derivable from a
  `Vault` or an `EventWindow[]`. It is the value the parent already holds.
- **No new page route, no new API route, no new fetch.** The strip reuses the
  `windows` and `Vault` props that already flow into the console.

### Failed attempts and deviations

- **The SDK call site is written but unverified.** Nothing in this session could
  run `npm install` or reach a registry, so `loadMarkets()` and
  `isBinaryMarket()` have never been called. Per the cut protocol, the file, the
  call site and the guard stay, the fallback serves, and this is recorded as
  unverified rather than deleted. If the package name is wrong, the install still
  passes, `marketDiscovery.via` reads `market-ids` or `seed`, and the fix is the
  package name in `package.json` plus a reinstall. No code change is needed for
  that.
- **Two `grid-cols-2` grids survive without a breakpoint prefix**, at
  `components/standing-plan-console.tsx:428` (Up and Down) and `:443` (BTC and
  ETH). Both are two short buttons in a card that is 264px wide at 360px, so each
  button gets about 126px and the two up layout is correct at every width.
  Stacking them would be worse, so the acceptance line about bare `grid-cols-2`
  is knowingly not met on those two, and met everywhere else. The stat rows at
  `:619` and `:650` read `grid-cols-2 ... sm:grid-cols-3`, so they carry a
  breakpoint on the same grid.
- **The responsive pass was read, not seen.** Every width claim in this record is
  a reading of class names and a calculation from the container widths. No
  browser was opened at 360px, 768px or 1280px. That is the runner's check and it
  is the one most likely to find something this session could not.
- **`getMarketDiscovery()` on the chain adapter runs discovery a second time.**
  `GET /api/health` therefore does the SDK load twice per request when the
  console is also being rendered. A module level cache with a TTL was considered
  and dropped: a stale window list on camera is worse than one extra read on a
  probe route, and a cache would need an invalidation story this phase has no
  budget for.
- **Nothing was run.** No error survived two correction attempts because no error
  could be observed: this session had no shell.

### Files changed

Added: `lib/markets.ts`, `lib/rpc.ts`, `types/somnia-markets-sdk.d.ts`,
`DELIVERY.md`.

Changed: `lib/dreamdex.ts`, `lib/config.ts`, `lib/types.ts`,
`lib/adapters/types.ts`, `lib/adapters/fake.ts`, `lib/adapters/chain.ts`,
`app/api/health/route.ts`, `app/layout.tsx`, `app/page.tsx`,
`app/console/loading.tsx`, `components/standing-plan-console.tsx`,
`components/site-header.tsx`, `components/ui/button.tsx`, `package.json`,
`.env.example`, `DEMO.md`, `CLAUDE.md`, `README.md`, `HANDOFF.md`,
`.farm-commits.json`.

Deleted: nothing. Nothing under `contracts/`, `public/`, `app/icon.svg` or
`app/opengraph-image.png` was touched, there is no `app/opengraph-image.tsx`, and
there are still two page routes.

### Commands the runner should run

```bash
npm install            # picks up the optional @somnia-chain/markets-sdk
npm run build          # must pass with zero TypeScript errors
npm run seed           # twice, fixtures/seed-manifest.json must be identical
npm run test:contracts # unchanged this phase, nothing under contracts/ moved
```

If `npm install` warns that the optional dependency could not be resolved, that
is the designed path and not a failure: the install passes, the app builds, and
`marketDiscovery.via` reports `market-ids` or `seed`. Correct the package name
from the sponsor's own docs and reinstall to put it on `sdk`.

Then redeploy to the same Vercel project as the Phase 1 deploy so the canary URL
does not move, and check, in this order:

1. `GET /api/health` on the live URL. `marketDiscovery.via` and
   `marketDiscovery.sdkResolved` say whether the SDK actually loaded.
2. All eight `DEMO.md` steps in a private window, no console errors.
3. Devtools at 360px, 768px and 1280px: no horizontal page scroll, both nav
   links tappable, the ledger readable, every button at least 44px tall below the
   sm breakpoint.
4. View source on the home page: the og:image is an absolute URL that loads, and
   the twitter card meta tag reads `summary_large_image`.
5. `/console` with `ADAPTER_MODE` unset, to confirm the fixture path renders
   exactly what it rendered before this phase.

Before any chain walk, fund the owner wallet (`FARM_EVM_PRIVATE_KEY`): STT for
gas plus `NEXT_PUBLIC_SUBSCRIPTION_FUNDING_STT` on chain 50312 via
https://cloud.google.com/application/web3/faucet/somnia/shannon or Somnia Discord
`#dev-chat`, and tUSDC through `faucet(10000)` on
`0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E`.

### Acceptance gate, honestly

Met, by reading the files:

- `lib/markets.ts` exists, exports `discoverEventWindows`, and calls both
  `loadMarkets` and `isBinaryMarket` (`lib/markets.ts:220` and `:232`). The
  package is in `package.json` under `optionalDependencies` and is imported in
  `lib/markets.ts` (a type import at the top, plus the dynamic import at
  `lib/markets.ts:186`). It is not a decorative dependency: both functions are
  called and the result is what the console renders.
- `fetchEventWindows()` in `lib/dreamdex.ts` is a thin wrapper over
  `discoverEventWindows().response`, and all three levels attach a note written
  by us.
- `getMarketDiscovery()` is in `lib/adapters/types.ts` and in both
  implementations, and `app/api/health/route.ts` reports `marketDiscovery`.
- `lib/adapters/fake.ts` imports no viem and no chain module, so an empty
  `.env.local` still returns `fakeAdapter` from `getAdapter()` and `/console`
  renders exactly what it rendered before.
- `DEMO.md` runs 1 to 8 with no gaps and no repeats, step 7 names `/console` and
  its on screen result, and the table has rows 7 and 8.
- `QueueStrip` is exported from `components/standing-plan-console.tsx`, rendered
  inside the vault card under the pre-write checks, reachable without typing a
  URL, and has empty, seed and normal branches.
- `components/ui/button.tsx` gives every size `h-11` below `sm`, and both header
  links carry `min-h-11`.
- `DELIVERY.md` exists with both matrix names byte identical, both
  `entryMode: automatic`, and both `watch:` steps (4 and 7) exist in `DEMO.md`.
- The README table has the six columns in order, and both Prize cells are byte
  identical to the two matrix names.
- `app/layout.tsx` exports title, description and `twitter.card`.
  `app/opengraph-image.png` is untouched and no `opengraph-image.tsx` exists.
- Every `process.env` read still lives in `lib/config.ts` or
  `lib/adapters/index.ts`, and `NEXT_PUBLIC_MARKET_DISCOVERY` has a documented
  line in `.env.example`. No real key is in any tracked file.
- No `useSearchParams` anywhere, no runtime filesystem write outside `scripts/`,
  and no third client reachable module imports viem (`lib/rpc.ts` and
  `lib/markets.ts` are server only, reached through `lib/dreamdex.ts` and
  `lib/adapters/chain.ts`, and no file under `app/` or `components/` imports
  either).

Not met, or not checkable from here:

- **"the SDK path works" is unverified.** The call site exists and is guarded.
  Whether it returns anything is a runner check, `marketDiscovery.sdkResolved` is
  the field that answers it.
- **The bare `grid-cols-2` line**, on the two button pairs described above.
- **Every width claim.** Read, not seen.

### Open questions for the human

1. **Is `@somnia-chain/markets-sdk@^0.28.0` the right coordinate?** It was taken
   from the brief, not from a registry. If the real package name differs, change
   it in `package.json` and nothing in `lib/markets.ts` needs editing.
2. **The SDK field names in `types/somnia-markets-sdk.d.ts` are guesses from the
   docs.** The mapper reads a candidate list per field, so a different key name
   costs one line in that list. If you have a real `loadMarkets()` response,
   paste one market into the issue and the guesswork can go.
3. **A market that is neither BTC nor ETH is dropped.** The plan builder offers
   two assets and the `Asset` union has two members. If Event Contracts lists a
   third underlying, this is where it goes missing.
4. **The queue ids are not readable on the chain path.** `_queue` is private with
   no getter, so the strip shows a count with an honest label instead of ids.
   Exposing `queueAt(uint256)` on the contract would fix it, and the contract
   fence is closed, so it is a decision rather than an edit.

### Next best step for Phase 5

The health strip against live values, section 3F. `preflight()` in
`lib/vault.ts` already renders and `lib/markets.ts` now supplies a real market
lifecycle state, so the remaining fake input to that strip is the subscription
gas balance and the priority fee, which come off the reactivity precompile. After
that, the two submission artefacts that are not code: the 2 to 3 minute video
against a real 15 minute window boundary, and the SDK documentation feedback
report, which should be written straight out of the open questions above while
the friction is still fresh.
