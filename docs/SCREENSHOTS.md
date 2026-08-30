# Screenshot capture list

Nine files, one per `DEMO.md` step, captured by a human. Nothing in this repo
generates them and no build step depends on them: `README.md` and `VIDEO.md`
reference them as text links (`docs/step-4.png`) rather than as `![]()` embeds,
so a file that was never captured shows as a dead link rather than a broken
image in the middle of the README.

Names are exact. A judge or a reviewer following a link from `README.md` gets a
404 if the name drifts by one character.

## The two widths

Capture every shot twice, at these viewport widths:

| Width | File | Why |
| --- | --- | --- |
| 1280 | `docs/step-<n>.png` | The reviewed width. This is the file `README.md` links. |
| 360 | `docs/step-<n>-360.png` | The mobile check. `DELIVERY.md` "Before submitting" asks for the whole walk at 360, and this is the record of it. |

Use a device pixel ratio of 2 if the tool offers it. PNG, not JPEG: these are
screens of text and a JPEG will smear the mono type in the trace lines.

**Scroll before you capture.** The lower sections of `/` are wrapped in
`components/reveal.tsx`, which adds a class on first intersection. A full page
capture taken without scrolling shows those sections at opacity 0. That is the
capture tool, not a bug in the page. Scroll each section into view, let it fade
in, then capture.

## The nine shots

| File | Route | What must be in frame |
| --- | --- | --- |
| `docs/step-1.png` | `/console` | Vault 01 empty, the plan builder filled in with Up, 25 per window, 8 windows, 2 losses, floor 100, take profit 320, and the source badge in the console header. |
| `docs/step-2.png` | `/console` | The vault card with the countdown ring running, the entry price in cents, the implied probability and the resting book depth. |
| `docs/step-3.png` | `/console` | The pre-write health strip: market state Trading, the collateral decimals read off the token, the reactivity subscription with its remaining gas and priority fee. |
| `docs/step-4.png` | `/console` | The moment after the roll. The balance and streak have moved, the next window is open, a new ledger row exists, and no wallet dialog is on screen. This is the one shot the submission rests on. |
| `docs/step-5.png` | `/console` | The new ledger row with its "validator call" badge and its link out to the Shannon explorer. Capture the explorer tab beside it if the window allows. |
| `docs/step-6.png` | `/console` | Vault 03: two consecutive losses in its ledger, the halt reason on the status badge, and the balance sitting in the vault. |
| `docs/step-7.png` | `/console` | The queue strip under the pre-write checks, naming the next market ids with the lifecycle state discovery read for each. |
| `docs/step-8.png` | `/` | The landing hero: the headline, the mono stat strip (1, 0, 20s, `0x…0100`) and the console preview card beside it. Then a second frame of the tab stepper with step 02 selected and its trace line readable, and the three stat tiles. |
| `docs/step-9.png` | `/#proof` | The proof panel with all three addresses, the copy chip on the `GET /api/health` row, and the health JSON open in a second tab if the window allows. |

## Order to capture in

Run `DEMO.md` once, top to bottom, and capture as you go. Steps 4 and 5 happen
at a window boundary and cannot be re-staged on demand, so have the capture tool
ready before the countdown reaches zero. Steps 8 and 9 are static and can be
captured at any time, including before the chain is up.

## What must not be in frame, in any shot

A terminal, a code editor, devtools, a `.env.local` file with any value visible,
a wallet with a seed phrase or private key on screen, or a second project's
window. Same list as `VIDEO.md`.
