# The 90 second take

One unbroken take, 90 seconds, no cuts. This file is the shot list, so nothing
has to be invented while the recorder is running. Every band below names the
route, what is on screen, what the narrator says, and what must not be on screen.

The bands come straight out of two files already in this repo. The wow moment is
`HANDOFF.md` section 3 ("the countdown hits zero, nobody clicks, no wallet dialog
opens, and the card redeems and re-enters itself"), and the beats are `DEMO.md`
steps 1 to 6 in order. If a band here disagrees with `DEMO.md`, `DEMO.md` wins.

The first jury panel asked for four things on screen in the opening: the console
mode badge, the plan transaction signed in the wallet, real market ids plus the
countdown in the queue strip, and the new roll ledger row. Fifteen seconds cannot
hold all four, because two of them do not exist until a plan has been written.
So the badge and the signature are band 1, the queue strip and the countdown are
band 2, and the ledger row is band 3. All four are on camera inside 75 seconds.

---

## 0 to 15 seconds, the silent open

**Route:** `/console`, already scrolled to the top, Vault 01 selected.

**On screen:**

- The source badge in the console header (`components/standing-plan-console.tsx:379`).
  It reads "Live read from Shannon" on the chain path and "Seed data, no vault
  address set" on the fixture path. Whichever it reads, it stays in frame.
- The vault address next to it, linking to the explorer, when one is configured.
- Deposit 200 into Vault 01, then the plan fields: Up, 25 per window, 8 windows,
  stop at 2 losses in a row, floor 100, take profit 320.
- The wallet dialog opening once for the plan, and the signature going through.
  That is `startPlan`, which writes the plan, queues the windows, funds the
  reactivity subscription out of `msg.value` and enters the first window.

**Narrator says:** nothing. No narration at all for the first 15 seconds. The
panel asked for this literally. Let the screen carry it.

**Must not be on screen:** a terminal, a code editor, devtools, a second browser
tab, or a `.env.local` file with any value visible.

---

## 15 to 45 seconds, the position is open and the vault is holding it

**Route:** `/console`, same view, scrolled down the vault card.

**On screen:**

- The countdown ring running (`CountdownRing`,
  `components/standing-plan-console.tsx:1130`), with its caption underneath
  saying the 20 second clock stands in for a real 15 minute window.
- The open window card: entry price in cents, implied probability read off the
  book, resting book depth. That is `DEMO.md` step 2.
- The pre-write health strip: market state Trading, the collateral decimals read
  off the token, the reactivity subscription. `DEMO.md` step 3.
- The queue strip (`QueueStrip`, `components/standing-plan-console.tsx:907`),
  naming the next market ids the vault will enter with the lifecycle state
  market discovery read for each. `DEMO.md` step 7.

**Narrator says:** "That was the last click. The plan is on chain now, the money
is in the vault, and the next three windows are already queued. Nothing here is
waiting on me."

**Must not be on screen:** any wallet dialog. Take your hands off the keyboard at
second 40 and show the wallet has nothing pending.

---

## 45 to 75 seconds, the roll, and this is the whole submission

**Route:** `/console`, the vault card and then the roll ledger below it.

**On screen:**

- The countdown reaching zero with no hand on the keyboard.
- The card turning over by itself: the position is redeemed, the streak moves,
  the balance updates, and the next window off the queue is entered.
  `DEMO.md` step 4.
- The new row landing in the roll ledger, carrying its "validator call" badge and
  its link out to the Shannon transaction. `DEMO.md` step 5.
- The explorer tab, opened on that transaction, showing the sender is a validator
  in the settlement block rather than the owner's wallet.

**Narrator says:** "Nobody clicked. The validator ran the vault's handler in the
settlement block itself, and this is the transaction. There is no server in
between and no keeper process."

**Must not be on screen:** a wallet dialog, at any point in this band. If one
opens, the take is dead and you start again. This is the band the whole
submission rests on.

---

## 75 to 90 seconds, the stop rule and the close

**Route:** `/console`, Vault 03.

**On screen:**

- Two consecutive losses in Vault 03's roll ledger.
- The status badge reading the halt reason, and the balance sitting in the vault.
  `DEMO.md` step 6.

**Narrator says:** "This one stopped on its own after two losses in a row. The
balance is sitting in the vault waiting to be withdrawn. Nobody clicked, nobody
stopped it, the rule was inside the contract."

**Must not be on screen:** the landing page. `DEMO.md` step 8 is the closing
frame for a longer cut, and at 90 seconds there is no room for it.

---

## Before you hit record

Work down this list once. It takes about five minutes and it is what makes the
take repeatable.

1. **Pick the path.** Chain path or fixture path. Decide before you open the
   browser, because the two have different opening bands.
2. **Which vault is selected.** Vault 01 for band 1 (it must be empty, status
   IDLE). Vault 03 for band 4 (it must be STOPPED on consecutive losses).
   `npm run demo:reset` re-verifies both invariants against `fixtures/*.json`.
3. **Which `.env.local` keys are filled**, for the chain path:
   `ADAPTER_MODE=real`, `NEXT_PUBLIC_CONTRACT_ADDRESS`,
   `NEXT_PUBLIC_BINARY_MARKETS_MODULE`, and
   `NEXT_PUBLIC_SUBSCRIPTION_FUNDING_STT` if the default 0.05 is not enough to
   open the subscription. `.env.example` says where each value comes from.
4. **Read `GET /api/health` once**, and read it in a tab you close before
   recording. `adapterMode` must be what you meant to run, `vaultAddressSet` must
   be `true` on the chain path, `rollLedgerSource` says whether the ledger is
   coming from `RollSettled` logs, and `marketDiscovery.via` says which level of
   `lib/markets.ts` answered. If those four do not read the way you expect, fix
   that before recording, not on camera.
5. **Fund the owner wallet** before the run, not during it. STT on chain 50312
   for gas plus the subscription funding, and tUSDC through `faucet(10000)`.
   `HANDOFF.md` section 9 has the faucet links.
6. **Close everything else.** One browser window, two tabs at most (the console
   and the explorer). No notifications, no other project open.
7. **Rehearse twice.** The wow moment happens once per window boundary and you
   get one take per boundary.

### The fallback take

If the chain path is not up, record the fixture path instead. It is a real take,
not a mock: the settlement mirror in `lib/vault.ts` is the same logic the
contract runs, and every band above still happens on screen.

- Leave `ADAPTER_MODE` unset and leave `NEXT_PUBLIC_CONTRACT_ADDRESS` empty. The
  console falls back to `fixtures/*.json` on its own.
- Set `NEXT_PUBLIC_MARKET_DISCOVERY=seed` to pin the window list to fixtures, so
  the take does not depend on a network call.
- The header badge will read "Seed data, no vault address set". Leave it in
  frame and say so out loud in band 1: "this is the fixture path, the chain path
  is the same screen with an address filled in." Do not crop the badge out.
- Band 1 has no wallet dialog on this path, so the plan writes with no signature.
  Say that too. The claim in the video has to match the badge on screen.
- Band 3 still rolls, and the ledger row still carries its "validator call"
  badge, but the transaction hash is synthetic (`syntheticTxHash()` in
  `lib/vault.ts`). Do not open the explorer on it, and do not claim it is a real
  transaction. Skip the explorer beat and say the roll is the mirror.

### If the roll is late

A roll can be deferred. The Somnia reactivity docs warn that a low
`priorityFeePerGas` can defer a handler run, so a late roll is a fee condition
and not a broken vault. Do not stop the take and do not reach for the keyboard.
Say this, and keep the camera on the card:

> "The handler is queued behind the fee. That is the reactivity subscription
> deciding when it can afford to run, and it is exactly the state the vault is
> designed to sit in. The position is still held, the plan is still on chain, and
> nothing here needs me."

Then wait. If it has not rolled by second 75, close on Vault 03 anyway (band 4
does not depend on the roll) and record the roll as a second take against the
next window boundary.
