# Perennis

**Stop renewing your Event Contracts position every 15 minutes. Write the plan
once, and the vault redeems and re-enters itself at every settlement with your
stop rules enforced as contract terms.**

> Live demo: https://perennis.vercel.app
> Video: `<ADD_VIDEO_URL>`

## The problem

DreamDEX Event Contracts open 15 minute and 1 hour windows on BTC and ETH. If you
have a view that lasts an afternoon, there is no way to express it in one
transaction. For every single window you wait for the lock, wait for the resolve,
redeem the winning ERC-6909 outcome token, look up the next window's market id,
and send a new order. Four steps. A four hour view means sixteen repeats.

Miss one round and your capital just sits there as an unredeemed token balance.
So people do one of two things: they trade a single window and leave, or they run
a bot on their laptop that dies when the laptop sleeps.

## The solution

Perennis is a vault contract you deploy and own. You deposit collateral and write
one plan: direction, stake per window, how many windows, and three stop rules.
The same transaction pre-loads the next three market ids into the vault's queue
and opens a Somnia reactivity subscription against the binary markets module.

At the end of every window, validators call the vault's `_onEvent` handler in the
settlement block itself. The vault redeems the resolved position, updates its
streak and PnL counters, checks the stop rules, and if the plan is still live it
takes the next market id off the queue and enters. There is no server in between,
no keeper network, and no process you have to keep alive.

The stop rules are the point. An outcome contract pays 1 or 0, so a rolling plan
without a limit is a martingale with a nicer interface. Three rules sit in the
settlement path as contract conditions:

- consecutive losses, halt after N losing windows in a row
- floor balance, halt if the balance drops to your floor
- take profit, close once the balance reaches your target

When one trips, the contract halts itself and the balance stays in the vault
where you can withdraw it.

## How it uses Somnia and DreamDEX

Three separate layers carry weight, and pulling any of them out breaks the
product rather than degrading it.

| Layer | Where it lives | What it does |
| --- | --- | --- |
| Somnia reactivity precompile `0x0100` | `contracts/src/PerennisVault.sol` | The vault opens its own subscription on `MarketResolved` and implements `ISomniaEventHandler._onEvent`. This is what makes the roll happen in the settlement block with no keeper. |
| DreamDEX BinaryMarketsModule | `contracts/src/PerennisVault.sol`, `lib/dreamdex.ts` | `redeem` converts the winning ERC-6909 outcome token back to collateral, `buy` enters the next window, `marketState` gates the write on lifecycle state 1 (Trading). |
| DreamDEX markets SDK | `lib/markets.ts` | `discoverEventWindows()` calls `loadMarkets()` and keeps what `isBinaryMarket()` accepts, so the window queue is real market ids rather than a list written by hand. Three levels: the SDK, then a per id `getMarket(bytes32)` read, then the fixtures, and `GET /api/health` says which one answered. |
| Chain reads for the console | `lib/dreamdex.ts` | `fetchVaults` reads `snapshot()` and `plan()` off the deployed vault with viem, `fetchRollLedger` builds the whole roll ledger from `RollSettled` logs so every row links to a real Shannon transaction, `fetchEventWindows` delegates to market discovery above, `fetchCollateralDecimals` reads decimals off the token instead of assuming 6. |

Every screen and every API route reads through one interface, `PerennisAdapter`
in `lib/adapters/`. `ADAPTER_MODE=fake` serves the fixtures in `fixtures/`,
`ADAPTER_MODE=real` serves `lib/dreamdex.ts`, which has one function per read
with both paths in the same body: the real chain call when the matching env var
is set, and the fixtures when it is not. That means the console is fully usable
with an empty `.env.local`, and pointing `NEXT_PUBLIC_CONTRACT_ADDRESS` at a
deployed vault switches the same screens onto Shannon without touching a
component. The badge in the console header always says which of the two you are
looking at.

`lib/vault.ts` is a line for line mirror of the contract's settlement path, so
the UI can show you what the vault will do before anything is signed. If you
change a stop rule in one, change it in the other.

## Tracks and how the code earns them

The hackathon published no sponsor bounties. Two rows, one submission that
enters both. `DELIVERY.md` has the deadlines and the pre-submission list.

| Bounty | Prize | Slots | Required tech | Code file | DEMO step |
| --- | --- | --- | --- | --- | --- |
| $5,000 USDso Prize Pool | $5,000 USDso Prize Pool | not published | DreamDEX Event Contracts, Somnia | `lib/markets.ts`, `contracts/src/PerennisVault.sol` | 4 |
| Featured placement in the Somnia Discord showcase series | Featured placement in the Somnia Discord showcase series | not published | DreamDEX Event Contracts, Somnia | `components/standing-plan-console.tsx` (`QueueStrip`) | 7 |

Qualification, in the hackathon's own words: the project must use DreamDEX Event
Contracts meaningfully, and the BUIDL form requires a GitHub link and a demo
video. Judging weights: Innovation and Originality 20%, Technical Implementation
25%, User Experience and Design 20%, Business and Ecosystem Impact 20%,
Presentation and Demo 15%.

The depth test: delete `lib/markets.ts` and DEMO steps 2 and 7 break, because the
open window on the vault card and every id in the queue strip come through
`discoverEventWindows()`.

## Tech stack

- Next.js 15 (App Router), TypeScript strict, Tailwind CSS v4, shadcn primitives
- viem for Somnia Shannon reads (chain 50312, `https://dream-rpc.somnia.network`)
- Solidity 0.8.24, Foundry, one contract with no external imports
- Somnia reactivity precompile `0x0100`, DreamDEX BinaryMarketsModule, ERC-6909
  outcome tokens, tUSDC collateral
- Deploys to Vercel, no server processes and no runtime filesystem writes

## Quickstart

```bash
npm install
cp .env.example .env.local   # optional, everything works without it
npm run dev
```

Open http://localhost:3000/console. It has three vaults: an empty one to write a
plan into, one running an eight window BTC plan, and one that halted itself after
two losses in a row. Let the countdown reach zero and watch the card roll with no
signature prompt. The countdown is a 20 second demo clock, labelled as one on
screen, standing in for a real 15 minute window.

To run against the chain, deploy the vault first and fill in
`NEXT_PUBLIC_CONTRACT_ADDRESS` and `NEXT_PUBLIC_BINARY_MARKETS_MODULE`. Build and
deploy commands are in [contracts/README.md](contracts/README.md), including the
`cast` calls for the tUSDC faucet, the deposit, and `startPlan`.

```bash
npm run build      # must stay green
npm run seed       # checks fixtures/*.json and rewrites fixtures/seed-manifest.json
npm run demo:reset # re-verifies the fixtures, prints the chain reset commands
npm run test:contracts   # cd contracts && forge test, needs Foundry installed
```

## Running against Shannon

Three env keys flip the whole app from fixtures onto the chain. Put them in
`.env.local` (see `.env.example` for where each value comes from):

```bash
ADAPTER_MODE=real
NEXT_PUBLIC_CONTRACT_ADDRESS=      # the deployed PerennisVault
NEXT_PUBLIC_BINARY_MARKETS_MODULE= # DreamDEX BinaryMarketsModule on Shannon
```

`NEXT_PUBLIC_MARKET_DISCOVERY` picks which level of `lib/markets.ts` runs first
and defaults to `sdk`, which falls through to the per id read and then to the
fixtures on its own. Set it to `seed` to pin the console to fixtures while
recording without a network.

`NEXT_PUBLIC_COLLATERAL_TOKEN` already points at tUSDC and only needs changing
if you move collateral. Nothing else is required, and no key in this app holds a
secret: the deployer key lives behind `FARM_EVM_PRIVATE_KEY`, is used by forge
only, and is read by no file under `app/`, `components/` or `lib/`.

`GET /api/health` is how you check whether the flip took. It reports
`adapterMode`, `chainId`, the collateral `decimals` it actually read,
`vaultAddressSet`, the reactivity precompile address, `rollLedgerSource` and
`marketDiscovery`. Two fields matter most: `rollLedgerSource` says `"chain"` once
the ledger is being built from `RollSettled` logs and `"seed"` while the console
is still on fixtures, and `marketDiscovery.via` says which level of
`lib/markets.ts` produced the window list (`"sdk"` once
`@somnia-chain/markets-sdk` resolves, `"market-ids"` for the per id read,
`"seed"` for the fixtures). `GET /api/rolls` returns the ledger on its own, and
takes an optional `limit` (1 to 12) and `address`.

Every read falls back rather than failing. A missing address, a timeout or a
rejected call comes back as `source: "seed"` with a written reason in `note`,
which the console renders as a badge. There is no error page on this path.

## Running the demo against Shannon

The read path works with nothing filled in. The write path needs a wallet, and
it has to be the right wallet: `startPlan`, `withdraw` and `halt` are
`onlyOwner` on `PerennisVault`, so the browser wallet you connect must be the
address that deployed the contract. Import `FARM_EVM_PRIVATE_KEY` into that
browser wallet, or redeploy the vault from the address you intend to demo with.
`armNext` is the exception: it is permissionless, so any wallet can refill the
queue.

In order:

1. Fill `.env.local`. `ADAPTER_MODE=real`, `NEXT_PUBLIC_CONTRACT_ADDRESS`,
   `NEXT_PUBLIC_BINARY_MARKETS_MODULE`. Two more control the write path:
   `NEXT_PUBLIC_SUBSCRIPTION_FUNDING_STT` (default `0.05`), the native STT the
   `startPlan` transaction carries to fund the reactivity subscription, and
   `NEXT_PUBLIC_TX_CONFIRMATIONS` (default `1`). `.env.example` says where every
   value comes from.
2. Fund the owner address. STT on chain 50312 for gas plus the subscription
   funding above, and tUSDC through `faucet(10000)` on
   `0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E`.
3. `npm run seed`. Checks `fixtures/*.json` against the invariants the demo walk
   depends on and rewrites `fixtures/seed-manifest.json`.
4. `npm run demo:reset`. Re-verifies the fixture side and prints the exact `cast`
   commands for the chain side (`halt()`, then `withdraw(uint256)`, or a
   redeploy). It never sends a transaction and never holds a key.
5. Walk `DEMO.md` end to end. Check `GET /api/health` first: `adapterMode` reads
   `real`, `vaultAddressSet` is `true`, and `rollLedgerSource` flips to `chain`
   once one settlement has happened.

With a wallet connected on chain 50312 and a vault address set, the console
sends real transactions: approve and deposit, then one `startPlan` that writes
the plan, queues the windows, funds the subscription and enters the first
window. With either half missing it keeps its local path and the wallet strip
says the write was simulated, which is what the deployed demo URL runs on.

## What we would build next

- Take the order book from `fetchOrderBook()` on the markets SDK so implied
  probability moves during the window instead of being the ask at discovery
  time. `lib/markets.ts` already loads the SDK, so this is one more call on a
  module that exists.
- A factory so each user gets their own vault clone from the UI, instead of one
  deploy per person.
- Let a plan follow a spread rather than a fixed side: keep rolling, but pick the
  cheaper leg when the book disagrees with the plan by more than a set margin.
- Subscription gas top up from inside the vault, so a long plan cannot stall
  because the owner's STT ran out mid session.

## AI use

We used AI coding assistants for scaffolding and boilerplate. Architecture,
product decisions, and final code review are our own.

## Status

Testnet software, Shannon only, with tUSDC as collateral. The contract has not
been audited and has no upgrade path. Do not point it at money you care about.
