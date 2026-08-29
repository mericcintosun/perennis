# Perennis, working notes for coding agents

Short and permanent. Read `DEMO.md` for what the product has to do, `HANDOFF.md`
for where the build currently is.

## Commands

```bash
npm install            # install dependencies
npm run dev            # local dev server on http://localhost:3000
npm run build          # must stay green after every change
npm run seed           # validates fixtures and rewrites fixtures/seed-manifest.json
npm run demo:reset     # re-verifies fixtures, prints the chain reset commands
npm run test:contracts # cd contracts && forge test
```

Contracts live in `contracts/` and build with `forge build` where Foundry is
installed. They are excluded from `tsconfig.json`.

## Mental map

Two page routes and four API routes. There will still be two page routes after
every phase.

| Path | What it is |
| --- | --- |
| `app/page.tsx` | landing, static, no data fetching |
| `app/console/page.tsx` | THE DEMO ROUTE, server component, reads through `getAdapter()` |
| `app/api/windows/route.ts` | `ApiResponse<EventWindow[]>` |
| `app/api/vaults/route.ts` | `ApiResponse<Vault[]>`, optional `address` query param |
| `app/api/rolls/route.ts` | `ApiResponse<RollEntry[]>`, the roll ledger on its own, optional `address` and `limit` |
| `app/api/health/route.ts` | the readiness probe, including `rollLedgerSource` |

`lib/markets.ts` is market discovery, three levels deep (the markets SDK, the per
id `getMarket` read, then the fixtures), and `lib/rpc.ts` holds the Shannon
client and the one retry loop that `lib/dreamdex.ts` and `lib/markets.ts` share.
Both are server only.

`lib/config.ts` holds every address, endpoint and tuning constant and imports
nothing. `lib/errors.ts` is the error vocabulary, `lib/log.ts` the `[core]`
logger, `lib/schemas.ts` the zod edge validation. Only two files in the repo read
`process.env`: `lib/config.ts` and `lib/adapters/index.ts`.

## Stack pitfalls

- **Tailwind v4 only.** There is no `tailwind.config.js` and no `@tailwind`
  directives. Tokens are declared in `app/globals.css` with `@theme inline`.
- **App Router.** Route `params` and `searchParams` are Promises and must be
  awaited.
- Anything with `useState`, `useEffect` or an event handler needs `"use client"`
  at the top of the file.
- `useSearchParams` only works under a `Suspense` boundary.
- Keep `viem` off the client bundle, with the two named exceptions below. Pure
  helpers belong in `lib/vault.ts`, chain reads in `lib/dreamdex.ts`, and
  `lib/adapters/fake.ts` imports neither.

### Fence lift, Phase 3 only, now spent

A write path needs an encoder, so Phase 3 was granted a named exception to the
viem rule above for exactly two client reachable modules:

1. `lib/abi.ts`, which holds every ABI and imports nothing at all
2. `lib/tx.ts`, the write client, which imports viem, `lib/abi.ts`,
   `lib/config.ts`, `lib/errors.ts` and `lib/wallet-state.ts` and nothing else

`lib/dreamdex.ts` stays server only and no file under `app/` or `components/`
imports it. The lift is closed again: a third client file reaching for viem is
off limits, and anything new on the write path goes through `lib/tx.ts`.

## Never touch

- `public/` in any form
- `app/icon.svg`
- `app/opengraph-image.png`, and never add an `app/opengraph-image.tsx` beside it
- `contracts/script/Deploy.s.sol`
- the settlement logic inside `contracts/src/PerennisVault.sol`

### Fence lift, Phase 2 only, now spent

Phase 2 was granted a named exception to that last rule for exactly four
security fixes, and they are already applied. The lift is recorded here so a
later phase does not read the diff and assume the fence is open:

1. queue cap: `MAX_QUEUE_ADD`, `MAX_PENDING` and `error QueueFull()` on
   `armNext` and on the `windowIds` loop in `startPlan`
2. reentrancy lock: a `locked` flag and a `noReentry` modifier on `deposit`,
   `withdraw` and `_onEvent`
3. allowance reset: `collateral.approve(address(markets), 0)` on the success
   branch of `_enterNext`, not only in the catch
4. calldata guard: `_onEvent` returns early when `data.length < 32`

`_evaluateStops`, the payout maths and every event name and signature are
unchanged, so `lib/vault.ts` is still a valid mirror. The fence is closed again:
anything beyond those four is off limits.

## Vercel guardrails

- No runtime filesystem writes in app code. `scripts/seed.mjs` and
  `scripts/demo-reset.mjs` writing `fixtures/seed-manifest.json` from the command
  line is fine, a request time write is not. Those two files are the only place
  `fs` appears in the repo.
- `useSearchParams` only under a `Suspense` boundary.
- No Node only APIs in edge paths, no custom server, no `output: export`,
  standard Next build only.
- Every `process.env.X` read anywhere in the repo has a matching `X=` line in
  `.env.example`.

## Contract events to demo steps

The events in `contracts/src/PerennisVault.sol` are the indexer seam for Phase 2.
Every one of them names something a `DEMO.md` step shows on screen. Rename none
of them.

| Event | What the demo shows |
| --- | --- |
| `PlanWritten`, `SubscriptionOpened` | Step 1, one signature writes the plan and opens the subscription |
| `PositionOpened` | Step 2, the first window is entered and the card shows entry price and book |
| `RollSettled` | Steps 4 and 5, the ledger row with its balance, block and validator call badge |
| `PlanHalted` | Step 6, Vault 03 halted on two losses in a row |
| `WindowsArmed`, `EntrySkipped` | Step 3, the queue count in the plan panel and the health strip. Step 7, the queue strip on the vault card, which names the queued market ids and the lifecycle state discovery read for each |

## Writing rules

User facing copy in English. No em dashes and no en dashes anywhere, use a comma,
a period or parentheses. Banned words: seamless, leverage, empower, revolutionize,
streamline, game changer, cutting edge, delve, robust, unlock, elevate, harness,
effortless. Vary sentence length, use concrete numbers, write like a builder.

## Design rules

All colors are CSS variables in `app/globals.css`. No hex literal in any file
under `app/` or `components/`. Teal carries the identity, amber is only for stop
rules and loss states. Every interactive primitive goes through `components/ui/`
with `cn()`. Dark only, and that decision is final: there is no theme toggle.

## Compaction

When compacting preserve the list of modified files and test commands.
