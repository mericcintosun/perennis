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

## Health checks this repo actually ships

A jury panel flagged a tool named in the submission's stack text that is not in
the file list. This is the correction, in the place a judge reads it. Four things
exist here, and they are these four:

| Check | What it is | Where it lives |
| --- | --- | --- |
| `GET /api/health` | The readiness probe. Reports `adapterMode`, `chainId`, the collateral `decimals` it actually read, `vaultAddressSet`, the reactivity precompile, `rollLedgerSource` and `marketDiscovery`. No address beyond a boolean, no key, no endpoint. | `app/api/health/route.ts` |
| `npm run seed` | Checks `fixtures/*.json` against the invariants the demo walk depends on (Vault 01 empty, Vault 03 halted on consecutive losses, unique market ids) and rewrites `fixtures/seed-manifest.json` byte identically per run. | `scripts/seed.mjs` |
| `npm run demo:reset` | Re-verifies the same fixture invariants, then prints the `cast` commands for the chain half. It sends no transaction and holds no key. | `scripts/demo-reset.mjs` |
| `npm run test:contracts` | `cd contracts && forge test`. Five `require` based tests, no `forge-std`, mocks inline. `contracts/README.md` has a table of what each one asserts. | `contracts/test/PerennisVault.t.sol` |

No DreamDEX bot kit `doctor.ts` is vendored in this repository. The bot kit ships
one of its own and it is useful to run from that kit's checkout when verifying
the testnet, but it is not a file here and it is not part of this stack. If the
BUIDL submission text lists it, that line is wrong and should be cut.

---

## Before submitting

A human runs this list. None of it is code.

The first three items are gates. A jury panel already scored this submission down
for a live link that did not answer and a video field that was a placeholder, so
none of the three goes on the form on trust.

1. **The live URL has to answer before it goes on the form.** Open it in a
   private window, on the production deployment and not a preview URL, and
   confirm `/console` renders with the header badge reading what you expect for
   the `ADAPTER_MODE` you deployed. Only then paste it into DoraHacks and into
   the Demo table at the top of `README.md`. A link that does not load costs
   points on three criteria at once.
2. **The video URL has to come from a recorded take of `VIDEO.md`.** Record the
   90 second shot list in that file, one unbroken take, and check the four bands
   are all on camera. Confirm it is 2 to 3 minutes as the form asks (the 90
   second take plus the opening and closing frames), uploaded, and that the link
   plays in a private window. Then put the URL in the Demo table in `README.md`,
   replacing the pointer to `VIDEO.md`. Also confirm the GitHub repository is
   public, because the form takes that link and a judge will open it.
3. **Every slot in `EVIDENCE.md` has to be filled.** The vault address, the
   deploy transaction, the `startPlan` transaction, one validator produced
   `RollSettled` transaction and its block, the collateral address, the markets
   module address and the subscription id. Then run that file's own "how to
   verify this in 60 seconds" list yourself, including the check that the roll's
   sender is not `owner()`. A `NOT YET FILLED` row left in that table is a row a
   judge will read as "not deployed".
4. Open `GET /api/health` on the live URL and read three fields:
   `adapterMode` is what you meant to deploy, `rollLedgerSource` says where the
   ledger came from, and `marketDiscovery.via` says which level of
   `lib/markets.ts` answered (`sdk`, `market-ids` or `seed`). Whatever it says,
   it should be what you intend a judge to see.
5. Walk all eight `DEMO.md` steps in a private window at 360px and at 1280px.
6. Nothing on the form selects a track. The prize split per placement was never
   published, so there is no track choice to get wrong and no reason to hold the
   submission back waiting for one.
