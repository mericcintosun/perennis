# Perennis demo contract

This file is the cross phase contract. Every later phase builds against it, and
the Phase 8 video shot list is derived from it directly. If a step here stops
working, that is a build break, not a polish item.

## The problem, in one sentence

Event Contracts settle every 15 minutes, so holding a view for an afternoon
means coming back sixteen times to redeem and re-enter.

## Where the demo starts

Route: `/console`

Not the landing page. The recording opens on `/console` with Vault 01 selected
and the browser already scrolled to the top of the console.

The console header carries the vault address next to the source badge and links
it to the Shannon explorer whenever `NEXT_PUBLIC_CONTRACT_ADDRESS` is set, so the
"Live read from Shannon" claim is one click from being checked. With no address
configured the badge renders alone and says so.

## The trigger and the wow moment

**Trigger:** the countdown ring on the vault card reaches zero.

**Wow moment:** nobody clicks, no wallet dialog opens, and the card redeems and
re-enters by itself.

**Closing line:** "nobody clicked, nobody stopped it, the rule was inside the
contract."

## The steps

Each step names the route that serves it.

1. **`/console`** Vault 01 is empty. Deposit 200, then write the plan: Up, 25 per
   window, 8 windows, stop at 2 losses in a row, floor 100, take profit 320. One
   signature writes the plan, queues three windows and opens the subscription.
   Say: "that is my last click."

2. **`/console`** The first window opens. The countdown ring runs, and the card
   shows the entry price in cents, the implied probability read off the book, and
   the resting book depth.

3. **`/console`** The pre-write health strip under the card reads market state
   Trading, the collateral decimals read from the token contract, and the
   reactivity subscription with its remaining gas and priority fee.

4. **`/console`** The countdown hits zero. The card rolls itself: the position is
   redeemed, the balance and the streak move, the next window off the queue is
   entered, and the roll ledger gains a row. No wallet dialog appears. Hands off
   the keyboard for this one.

5. **`/console`** The new ledger row links out to the Shannon explorer
   transaction and is marked "validator call", because the roll was produced by a
   validator in the settlement block rather than sent from the owner's wallet.

6. **`/console`** Switch to Vault 03. Two losses in a row sit in its ledger, the
   plan halted itself on the contract rule, and the balance is sitting in the
   vault waiting to be withdrawn.

7. **`/console`** Scroll to the queue strip under the pre-write checks on the
   vault card. It names the next windows the vault will enter, up to four of
   them, each with the lifecycle state market discovery read for that id. On the
   chain path those states come from `@somnia-chain/markets-sdk` `loadMarkets()`
   filtered by `isBinaryMarket()`. Nothing is clicked and nothing is signed: the
   strip is showing what the vault does next, on its own. An id the markets
   module has not resolved says exactly that, and a queue the vault is holding
   privately says that instead of showing an invented id.

8. **`/`** The landing page carries the closing frame: the problem sentence, the
   three step explanation, and what Perennis is not.

## The demo clock

The countdown is `DEMO_WINDOW_SECONDS = 20` in
`components/standing-plan-console.tsx`. A real Event Contracts window is 15
minutes. The countdown is labelled as a demo clock on screen and must stay
labelled: the compressed clock is the only thing about the flow that is sped up,
and presenting it as real time would be a lie about the one number a judge can
check.

## What each step needs to exist

| Step | Depends on |
| --- | --- |
| 1 | `StandingPlanConsole` plan builder, `planDefaults` |
| 2 | `EventWindow` data through the adapter, which comes from `discoverEventWindows()` in `lib/markets.ts`, and `entryPriceCents()` |
| 3 | `preflight()` in `lib/vault.ts`, collateral decimals from the adapter |
| 4 | `settleAndRoll()` in `lib/vault.ts`, the countdown effect |
| 5 | `explorerTxUrl()` and the `trigger: "reactivity"` field on `RollEntry` |
| 6 | Vault 03 seeded as `STOPPED` on `consecutive-losses` |
| 7 | `QueueStrip` in `components/standing-plan-console.tsx`, `discoverEventWindows()` in `lib/markets.ts` |
| 8 | `app/page.tsx` |

Steps 1 to 6 keep the numbers they were given in Phase 1. `HANDOFF.md` sections
7 and 8 refer to them by number, so step 7 was inserted at the end and the
landing page step moved to 8 rather than renumbering the walk.
