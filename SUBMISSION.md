# DoraHacks BUIDL submission, paste ready

**The live form could not be opened while this file was written, so the field
order below is best effort and must be checked against the real form at
https://dorahacks.io/hackathon/event-contracts before anything is pasted.**
Field names, ordering and character limits on DoraHacks change between seasons.
Where a limit is unknown this file says so rather than guessing a number.

Two rows go with one submission and there is no second form to fill in. The
tracks are at the bottom of this file, with headings byte identical to
`DELIVERY.md`.

Anything marked `PENDING, filled by a human before submitting` is a gate. The
same string appears in the Demo table in `README.md` and the two must be
replaced in the same sitting, because a jury panel has already scored this
submission down once for a live link that did not answer and a video field that
was a placeholder.

---

## Project name

```
Perennis
```

Character limit: unknown.

## One line tagline

```
Standing order plans for DreamDEX Event Contracts. Write the plan once, and the vault redeems and re-enters itself at every settlement with your stop rules enforced as contract terms.
```

Character limit: unknown. If the form caps the tagline shorter, cut to the first
sentence and the clause after the comma:

```
Write one plan for DreamDEX Event Contracts. The vault redeems and re-enters itself at every settlement, with your stop rules as contract terms.
```

## Full description

```
DreamDEX Event Contracts open 15 minute and 1 hour windows on BTC and ETH. There is no way to express a view that lasts an afternoon in one transaction. For every single window you wait for the lock, wait for the resolve, redeem the winning ERC-6909 outcome token, look up the next window's market id, and send a new order. Four steps, and a four hour view means sixteen repeats. Miss one round and your capital sits there as an unredeemed token balance.

Perennis is a vault contract you deploy and own. You deposit collateral and write one plan: direction, stake per window, how many windows, and three stop rules. That same transaction pre-loads the next market ids into the vault's queue and opens a Somnia reactivity subscription against the binary markets module. It is the last click.

At the end of every window, validators call the vault's _onEvent handler in the settlement block itself. The vault redeems the resolved position, updates its streak and PnL counters, checks the stop rules, and if the plan is still live it takes the next market id off the queue and enters. There is no keeper network polling from outside, no server in between, and no process you have to keep alive. That is the difference from Chainlink Automation or Gelato: those send a separate transaction a block or more after settlement and charge a keeper fee, and the Somnia reactivity handler does not.

The stop rules are the point rather than a feature. An outcome contract pays 1 or 0, so a rolling plan without a limit is a martingale with a nicer interface. Three rules sit in the settlement path as contract conditions: halt after N consecutive losing windows, halt if the balance drops to your floor, and close once the balance reaches your take profit. When one trips, the contract halts itself and the balance stays in the vault where you can withdraw it. The frontend does not enforce them and cannot override them.

Three separate layers carry weight, and pulling any of them out breaks the product rather than degrading it. The Somnia reactivity precompile at 0x0100 is what makes the roll happen with no keeper. The DreamDEX BinaryMarketsModule is how the vault redeems the outcome token, buys into the next window, and gates every write on lifecycle state 1 (Trading). The DreamDEX markets SDK is where the window queue comes from: discoverEventWindows() calls loadMarkets() and keeps what isBinaryMarket() accepts, so the ids written into the queue are ids the module can resolve, with a per id read and a fixture set behind it as fallbacks.

The app is one console screen. It reads through a single adapter interface, so it runs on fixtures with an empty environment file and switches onto Shannon when the contract addresses are set, without touching a component. The badge in the console header always says which of the two you are looking at, and GET /api/health reports the same thing as JSON, including which of the three market discovery levels answered. The landing page carries a proof panel at /#proof naming the vault, the collateral token and the markets module with explorer links, so the "live read from Shannon" claim can be checked without trusting a badge. An address that is not configured says so in words rather than showing a placeholder hash.

What is honest about the demo: the countdown on screen is a 20 second demo clock standing in for a real 15 minute window, and it is labelled as one on screen. That compressed clock is the only thing about the flow that is sped up. The contract is unaudited testnet software on Somnia Shannon with tUSDC as collateral.
```

Character limit: unknown. DoraHacks descriptions are usually generous. If it is
capped near 2,000 characters, keep paragraphs 1, 2, 4 and the last one and drop
paragraphs 3, 5 and 6.

## GitHub link

```
https://github.com/mericcintosun/perennis
```

Mandatory field. The repository must be public before this is pasted, because a
judge will open it.

## Demo video link

```
PENDING, filled by a human before submitting
```

Mandatory field. Record `VIDEO.md`, which is banded to a 2:20 cut, confirm the
2 to 3 minute length the form asks for, upload it at least 12 hours before the
deadline, and check that the link plays in a private window before it goes here.

## Live demo link

```
PENDING, filled by a human before submitting
```

The intended target is `https://perennis-app.vercel.app`. It goes on the form
only after `/console` renders in a cold private window on the production
deployment, not a preview URL.

## Tech stack

```
Solidity 0.8.24, Foundry, Somnia reactivity precompile 0x0100, DreamDEX BinaryMarketsModule, DreamDEX markets SDK (@somnia-chain/markets-sdk), ERC-6909 outcome tokens, tUSDC collateral, Somnia Shannon testnet (chain 50312), Next.js 15 App Router, TypeScript strict, Tailwind CSS v4, shadcn primitives, viem, zod, Vercel.
```

Do not list a DreamDEX bot kit `doctor.ts`. It is not vendored in this
repository, and `DELIVERY.md` records that a jury panel already flagged that
exact line as a tool named in the stack text that is not in the file list.

## Track

Nothing on the form selects a track. Both rows below are entered off the same
submission and neither has a second form. Headings are byte identical to the
ones in `DELIVERY.md`, which are byte identical to the hackathon page.

### $5,000 USDso Prize Pool

- **entryMode:** automatic
- The action is this BUIDL submission. Nothing else.

### Featured placement in the Somnia Discord showcase series

- **entryMode:** automatic
- No action. It is awarded off the main judging, with no second form and no
  separate submission.

## Team

```
Meric Cintosun, solo builder. GitHub: https://github.com/mericcintosun
```

Replace or extend if anyone else should be credited. Character limit and whether
the form wants one row per member: unknown.

---

## What this submission does not claim

Written down here so no field above overstates the build, and so a judge
checking the repository finds the same story:

- The countdown in the demo is `DEMO_WINDOW_SECONDS = 20`, standing in for a
  real 15 minute Event Contracts window. It is labelled a demo clock on screen.
- With no addresses configured the console runs on `fixtures/*.json` and both
  the header badge and `GET /api/health` say so. On that path the roll comes
  from the settlement mirror in `lib/vault.ts` and the transaction hash is
  synthetic (`syntheticTxHash()`), which the video script tells the narrator to
  say out loud rather than paper over.
- The contract is unaudited, has no upgrade path, and is deployed to testnet
  only.
- `EVIDENCE.md` carries one row per on chain artefact. A row that has not been
  filled in says `NOT YET FILLED` rather than a plausible looking hash. Every
  row must be filled before this form is submitted.

## Before you paste anything

`DELIVERY.md` has the full list under "Before submitting". The three gates are
the live URL answering in a private window, the video link coming from a real
recorded take, and every slot in `EVIDENCE.md` filled.
