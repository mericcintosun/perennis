# Delivery, what to submit and where

The Event Contracts Hackathon published no sponsor bounties. There are two rows
to win and one submission that enters both: a cash pool, and a showcase
placement awarded off the same judging. Do not go looking for a third form.

Headings below are byte identical to the names on the hackathon page.

---

## $5,000 USDso Prize Pool

- **entryMode:** automatic
- **action:** submit the BUIDL on DoraHacks at
  https://dorahacks.io/hackathon/event-contracts. The GitHub link and the demo
  video are both mandatory fields on the form.
- **deadline:** 8 September 2026, 18:00 UTC. Upload the video at least 12 hours
  before that, so a failed encode is recoverable.
- **watch:** DEMO step 4. The countdown hits zero, the card redeems and
  re-enters itself, the ledger gains a row, and no wallet dialog opens. That is
  the step the whole submission rests on.
- **qualification:** the project must use DreamDEX Event Contracts meaningfully,
  and it must be a working consumer facing product rather than a proof of
  concept. Judging is Innovation and Originality 20%, Technical Implementation
  25%, User Experience and Design 20%, Business and Ecosystem Impact 20%,
  Presentation and Demo 15%.

## Featured placement in the Somnia Discord showcase series

- **entryMode:** automatic
- **action:** none. It is awarded off the main judging, with no second form and
  no separate submission.
- **watch:** DEMO step 7. The queue strip names the next windows the vault will
  enter, with the lifecycle state read through the markets SDK for each id, and
  it moves with no click and no signature. That is the frame that reads well in
  a Discord clip.
- **qualification:** the same judging as the row above. Nothing extra to do
  beyond making the demo watchable.

---

## Before submitting

A human runs this list. None of it is code.

1. Paste the live Vercel URL into the DoraHacks form. It has to be the
   production deployment, not a preview URL.
2. Confirm the GitHub repository is public. The form takes the link and a judge
   will open it.
3. Confirm the demo video is 2 to 3 minutes, uploaded, and that the link plays
   in a private browser window.
4. Open `GET /api/health` on the live URL and read three fields:
   `adapterMode` is what you meant to deploy, `rollLedgerSource` says where the
   ledger came from, and `marketDiscovery.via` says which level of
   `lib/markets.ts` answered (`sdk`, `market-ids` or `seed`). Whatever it says,
   it should be what you intend a judge to see.
5. Walk all eight `DEMO.md` steps in a private window at 360px and at 1280px.
6. Nothing on the form selects a track. The prize split per placement was never
   published, so there is no track choice to get wrong and no reason to hold the
   submission back waiting for one.
