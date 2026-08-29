# Perennis, working notes for coding agents

Short and permanent. Read `DEMO.md` for what the product has to do, `HANDOFF.md`
for where the build currently is.

## Commands

```bash
npm install     # install dependencies
npm run dev     # local dev server on http://localhost:3000
npm run build   # must stay green after every change
npm run seed    # validates fixtures and rewrites fixtures/seed-manifest.json
```

Contracts live in `contracts/` and build with `forge build` where Foundry is
installed. They are excluded from `tsconfig.json`.

## Stack pitfalls

- **Tailwind v4 only.** There is no `tailwind.config.js` and no `@tailwind`
  directives. Tokens are declared in `app/globals.css` with `@theme inline`.
- **App Router.** Route `params` and `searchParams` are Promises and must be
  awaited.
- Anything with `useState`, `useEffect` or an event handler needs `"use client"`
  at the top of the file.
- `useSearchParams` only works under a `Suspense` boundary.
- Keep `viem` off the client bundle. Pure helpers belong in `lib/vault.ts`, chain
  reads in `lib/dreamdex.ts`, and `lib/adapters/fake.ts` imports neither.

## Never touch

- `public/` in any form
- `app/icon.svg`
- `app/opengraph-image.png`, and never add an `app/opengraph-image.tsx` beside it
- `contracts/script/Deploy.s.sol`
- the settlement logic inside `contracts/src/PerennisVault.sol`

## Vercel guardrails

- No runtime filesystem writes in app code. `scripts/seed.mjs` writing a fixture
  at build time is fine, a request time write is not.
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
| `WindowsArmed`, `EntrySkipped` | Step 3, the queue count in the plan panel and the health strip |

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
