# The 2:20 cut

Target length 2:20, inside the 2 to 3 minutes the DoraHacks form asks for. This
file is the shot list, so nothing has to be invented while the recorder is
running. Every band below names the route, what is on screen, what the narrator
says, and what must not be on screen.

**The four numbered bands below are unchanged.** The panel asked for a silent
open and for the wow moment before 1:00, and both still hold: the recorded
console take runs 0:08 to 1:38 on the finished timeline and the roll lands at
0:53. What Phase 9 added is an 8 second cold open before it and two closing bands
after it, which is what takes a 90 second take to a 2:20 cut.

The band clocks written into the four headings below are the clock of the console
take itself, starting from the moment recording begins on `/console`. Add 8
seconds to each to get its position in the finished cut. Both numbers are in the
timeline table.

The bands come straight out of two files already in this repo. The wow moment is
`HANDOFF.md` section 3 ("the countdown hits zero, nobody clicks, no wallet dialog
opens, and the card redeems and re-enters itself"), and the beats are `DEMO.md`
steps 1 to 9 in order. If a band here disagrees with `DEMO.md`, `DEMO.md` wins.

The first jury panel asked for four things on screen in the opening: the console
mode badge, the plan transaction signed in the wallet, real market ids plus the
countdown in the queue strip, and the new roll ledger row. Fifteen seconds cannot
hold all four, because two of them do not exist until a plan has been written.
So the badge and the signature are band 1, the queue strip and the countdown are
band 2, and the ledger row is band 3. All four are on camera inside 75 seconds
of the console take, which is 83 seconds into the finished cut.

## The timeline

| Cut position | Band | Route | Screenshot fallback |
| --- | --- | --- | --- |
| 0:00 to 0:08 | Cold open, the landing scene | `/` | `docs/step-8.png` |
| 0:08 to 0:23 | The silent open | `/console` | `docs/step-1.png` |
| 0:23 to 0:53 | The position is open | `/console` | `docs/step-2.png`, `docs/step-3.png`, `docs/step-7.png` |
| 0:53 to 1:23 | The roll, the wow moment | `/console` | `docs/step-4.png`, `docs/step-5.png` |
| 1:23 to 1:38 | The stop rule | `/console` | `docs/step-6.png` |
| 1:38 to 2:00 | The landing stepper and the tiles | `/` | `docs/step-8.png` |
| 2:00 to 2:20 | The proof panel and the probe | `/#proof` | `docs/step-9.png` |

The screenshot column is a fallback, not decoration. If a band cannot be
recorded on the day (the chain is down, a roll never lands, a take is spoiled),
hold the named still on screen for that band's duration and narrate over it
rather than dropping the beat. `docs/SCREENSHOTS.md` is the capture list for
those files and says what must be in frame for each.

---

## Cold open, 0:00 to 0:08 of the finished cut

**Route:** `/`, at the top, nothing scrolled.

**On screen:**

- The hero: the headline, the mono stat strip reading 1 signature, 0 keepers,
  the 20 second demo clock and the reactivity precompile `0x…0100`, and the
  console preview card beside it.
- No scrolling and no clicking. Eight seconds of one still frame.

**Narrator says:** "Event Contracts settle every 15 minutes. Holding a view for
one afternoon means coming back sixteen times to redeem and re-enter. This is
the plan you write instead."

**Must not be on screen:** the console. Cut to `/console` on the last word, and
the recorded console take starts from its own frame one.

Eight seconds, not more. The wow moment has to land before 1:00 of the finished
cut, and at 0:53 it does with five seconds to spare.

---

## 0 to 15 seconds of the console take, the silent open

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

## 15 to 45 seconds of the console take, the position is open and the vault is holding it

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

## 45 to 75 seconds of the console take, the roll, and this is the whole submission

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

## 75 to 90 seconds of the console take, the stop rule

**Route:** `/console`, Vault 03.

**On screen:**

- Two consecutive losses in Vault 03's roll ledger.
- The status badge reading the halt reason, and the balance sitting in the vault.
  `DEMO.md` step 6.

**Narrator says:** "This one stopped on its own after two losses in a row. The
balance is sitting in the vault waiting to be withdrawn. Nobody clicked, nobody
stopped it, the rule was inside the contract."

**Must not be on screen:** a wallet dialog. Vault 03 halted itself and nothing
about this band is signed.

The console take ends here. Everything below is recorded separately on `/`, and
it can be recorded before the chain is up because neither band fetches anything.

---

## 1:38 to 2:00 of the finished cut, the landing stepper and the tiles

**Route:** `/`, scrolled to `#how`. This is `DEMO.md` step 8.

**On screen:**

- The three tab stepper under "How it works". Click 01 Write, then 02 Roll, then
  03 Halt, letting each panel's mono trace line sit on screen long enough to
  read: `startPlan(plan, [...]) -> WindowsArmed(3)`, then
  `_onEvent(MarketResolved) -> RollSettled(...)`, then
  `_evaluateStops(streak: 2) -> PlanHalted(ConsecutiveLosses)`.
- Scroll on to the three stat tiles: 3 levels of market discovery, 11 contract
  tests, 0 keeper transactions.

**Narrator says:** "Three steps, and only the first one is yours. Write, roll,
halt, and each one is a call in the contract rather than a diagram. The numbers
underneath are the ones you can check in the repository: three fallback levels
for market discovery, eleven tests on the vault, and zero keeper transactions."

**Must not be on screen:** the folded block opened. Leave the details element
closed. It is there for a reader, not for the video, and opening it on camera
puts a wall of text in frame.

**Note for the editor:** scroll slowly. The lower sections fade in on their first
intersection, so a fast scroll can put a section on screen a beat before it is at
full opacity.

---

## 2:00 to 2:20 of the finished cut, the proof panel and the probe

**Route:** `/#proof`, and a second tab on `GET /api/health`. This is `DEMO.md`
step 9.

**On screen:**

- The proof panel: PerennisVault, the tUSDC collateral token and the DreamDEX
  BinaryMarketsModule, each a link to the Shannon explorer.
- The copy chip on the `GET /api/health` row. Click it once and let the "Copied"
  label be readable before it reverts.
- Switch to the second tab, already open on `/api/health`, showing
  `adapterMode`, `rollLedgerSource` and `marketDiscovery.via`.

**Narrator says:** "Every claim in this video is checkable from this panel.
These are the deployed addresses, this is the readiness probe, and it says
whether the screen you just watched was reading Shannon or the fixture set.
Nobody clicked, nobody stopped it, the rule was inside the contract."

**Must not be on screen:** a row reading "not configured in this deployment", if
you are presenting the chain path. If any row reads that, you are on the fixture
path and the narration above has to say so instead of claiming Shannon.

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
8. **Capture `docs/step-*.png` on the same run.** `docs/SCREENSHOTS.md` is the
   list. Steps 4 and 5 happen at a window boundary and cannot be re-staged, so
   have the capture tool ready before the countdown reaches zero.

### The dry run

**Do one silent dry run of the whole 2:20, recorder off, stopwatch on, and write
the finish time here before the real take.** If it comes in over 2:40 or under
1:50, cut or pad the cold open and the two closing bands, never the console take
between 0:08 and 1:38.

| Slot | Fill in |
| --- | --- |
| Dry run finish time | `NOT YET FILLED` |
| Which path was rehearsed | `NOT YET FILLED` (chain or fixture) |

### Recording log

One row per take. A row here is what stops a second person re-recording a band
that is already good.

| Take | Date | Path | Length | Where it is | Keep or re-record |
| --- | --- | --- | --- | --- | --- |
| 1 | `NOT YET FILLED` | `NOT YET FILLED` | `NOT YET FILLED` | `NOT YET FILLED` | `NOT YET FILLED` |
| 2 | `NOT YET FILLED` | `NOT YET FILLED` | `NOT YET FILLED` | `NOT YET FILLED` | `NOT YET FILLED` |

**Re-record slot.** If exactly one band is bad, re-record that band alone against
the next window boundary and cut it in. Only bands 0:53 to 1:23 (the roll) and
0:08 to 0:23 (the signature) depend on a live boundary. The cold open, the
stepper band and the proof band can be re-shot at any time, on any path, with
nothing funded.

| Band re-recorded | Reason | Date |
| --- | --- | --- |
| `NOT YET FILLED` | `NOT YET FILLED` | `NOT YET FILLED` |

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
