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

### Fence lift, Phase 8 only, now spent

Phase 8 replaced the palette wholesale, and four vector files carried the dead
hexes in their own markup rather than through a token. Phase 8 was granted a
named exception to the `public/` and `app/icon.svg` rules above for exactly those
four files, and the repaint is already applied:

1. `app/icon.svg`, ground `#16110D`, strokes `#D2622F` and `#F3EAE0`, `rx="4"`
2. `public/logo.svg`, now a text-only wordmark with the glyph paths dropped. It
   is kept for OG reuse and is imported by nothing under `app/` or `components/`
3. `public/illustrations/roll-loop.svg`
4. `public/illustrations/window-grid.svg`

Everything else under `public/` stayed untouched, `public/brand/logo.png`,
`public/brand/og.png` and `app/opengraph-image.png` in particular, and no
`app/opengraph-image.tsx` was added. `public/brand/logo.png` is the one mark in
the header under the ONE MARK rule, and repainting that raster is Phase 9 work.
The fence is closed again.

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

### Fence lift, Phase 5 only, now spent

Phase 5 was a security pass and was granted a second scoped exception to the
same rule, for security fixes only. Applied, and recorded here so a later phase
does not read the diff and assume the fence is open:

1. **checked approvals:** `_approveExact` and `_clearApproval`, two private
   helpers that `require` the returned boolean. All three bare
   `collateral.approve(...)` call sites in `_enterNext` now go through them.
2. **unspent stake credited back:** `_enterNext` measures
   `collateral.balanceOf(address(this))` around the `try markets.buy(...)` and
   returns `stake - spent` to `balance`. `PositionOpened` carries the measured
   `spent` instead of the requested `stake`, same three parameters.
3. **measured redeem delta:** `_settleAndRoll` measures the collateral balance
   around `markets.redeem(marketId)` and credits the delta instead of the
   number the module returned. `RollSettled` still carries its five arguments,
   now with the measured payout.
4. **`startPlan` guard:** reverts `PlanActive()` when `status == Status.Active`,
   so a second plan cannot overwrite `openMarketId` and strand a live window.
5. **`armNext` zero id guard:** reverts `ZeroWindowId()`, plus a comment naming
   the trust boundary that stays open. Same external signature.
6. **two new owner gated functions:** `rescue()` (untracked collateral surplus
   plus the native balance to the owner, never collateral `balance` accounts
   for) and `stopSubscription()` (the first call site for
   `ISomniaReactivity.unsubscribe`, which nothing called before).
7. **two new errors:** `PlanActive()` and `ZeroWindowId()`.
8. **`_enterNext` and `_settleAndRoll` are `internal`, not `private`.** A
   successful `startPlan` calls the reactivity precompile at `0x0100`, which has
   no code inside forge, so the settlement path was unreachable from a test
   without a cheatcode. `VaultHarness` in `contracts/test/PerennisVault.t.sol`
   subclasses the vault to reach them. Neither function is in the ABI and
   `_onEvent` is still the only path to them on chain.

Unchanged, and still fenced: `_evaluateStops` and the stop rule semantics, every
`event` declaration byte for byte, the `Plan`, `Roll`, `Status` and `StopReason`
shapes, the `startPlan` and `armNext` external signatures, and
`contracts/script/Deploy.s.sol`. `lib/vault.ts` is still a valid mirror. The
fence is closed again: anything beyond the eight items above is off limits.

**The contract changed, so the deployed address changed.** Anything under
`contracts/broadcast/` is stale from this commit onward. `EVIDENCE.md` row 1 is
the single source for the live vault address.

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

**`IDENTITY.md` at the repo root is law for every colour, font, radius, layout
and motion decision.** It was authored in Phase 8 and it outranks taste. Read it
before touching anything visual. The token table lives there and is implemented
in the `:root` block of `app/globals.css`, which is the only place a colour is
allowed to exist: no hex literal in any file under `app/` or `components/`.

Short version: warm brown-black ground, one clay accent (`--primary`), outcome
colour through `--positive` and `--negative` with the word WON or LOST always
beside the figure, square corners at `--radius: 0.125rem`, Fraunces for display,
IBM Plex Sans for text, IBM Plex Mono for addresses, hashes, market ids and block
numbers only. There is no amber in this product. Two keyframes exist,
`pns-ink-in` and `pns-rule-draw`, and there is no IntersectionObserver anywhere.

Every interactive primitive goes through `components/ui/` with `cn()`, which
today means `badge`, `button`, `card`, `input`, `alert` (variants `default` and
`warning`), `skeleton` and `separator`. Dark only, and that decision is final:
there is no theme toggle.

## Compaction

When compacting preserve the list of modified files and test commands.
