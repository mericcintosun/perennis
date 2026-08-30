# On chain evidence

One place for the artefacts a judge needs to check that this is a deployed
product and not a repository. Every slot below is empty until a human fills it
in. Nothing here is invented: an empty row says `NOT YET FILLED` rather than
carrying a plausible looking hash.

Read this together with `GET /api/health` on the deployed URL. The probe says
which path the app is actually on, and the table says what exists on chain.

Explorer base: `https://shannon-explorer.somnia.network` (chain 50312). It is
`EXPLORER_URL` in `lib/config.ts` and is overridable with
`NEXT_PUBLIC_EXPLORER_URL`.

---

## The artefacts

| # | Artefact | Value | Explorer link shape | How to produce it |
| --- | --- | --- | --- | --- |
| 1 | `PerennisVault` address on Shannon | `NOT YET FILLED` | `https://shannon-explorer.somnia.network/address/<address>` | `forge script script/Deploy.s.sol --rpc-url $RPC_URL --private-key $FARM_EVM_PRIVATE_KEY --broadcast`. `run()` returns the address and forge prints it. See `contracts/README.md`, "Deploy to Shannon testnet". |
| 2 | Deploy transaction | `NOT YET FILLED` | `https://shannon-explorer.somnia.network/tx/<hash>` | The same forge script prints the broadcast hash in its output. Copy it from there. |
| 3 | `startPlan` transaction | `NOT YET FILLED` | `https://shannon-explorer.somnia.network/tx/<hash>` | Either the console's plan button with a wallet connected on chain 50312, or the `cast send $VAULT "startPlan((uint8,uint256,uint32,uint32,uint256,uint256),bytes32[])" ...` call in `contracts/README.md`, "First run on testnet", step 3. This one transaction writes the plan, queues the windows, funds the reactivity subscription out of `msg.value` and enters the first window. |
| 4 | One `RollSettled` transaction produced by a validator | `NOT YET FILLED` | `https://shannon-explorer.somnia.network/tx/<hash>` | Do not send it. Wait for the settlement block after step 3 and copy the hash out of the roll ledger row on `/console`, or read the logs directly. This is the artefact the whole submission rests on. |
| 5 | Block number of that roll | `NOT YET FILLED` | read it off row 4's transaction page | The block the transaction in row 4 landed in. It must be the settlement block for the market, not a later one. |
| 6 | tUSDC collateral address | `0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E` | `https://shannon-explorer.somnia.network/address/0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E` | Already known. It is `COLLATERAL_TOKEN` in `contracts/README.md` and the value `.env.example` ships for `NEXT_PUBLIC_COLLATERAL_TOKEN`. Get balance with `cast send $COLLATERAL_TOKEN "faucet(uint256)" 10000000000`. |
| 7 | DreamDEX BinaryMarketsModule address | `NOT YET FILLED` | `https://shannon-explorer.somnia.network/address/<address>` | From the sponsor's own contracts and addresses page. It goes into `.env.local` as `NEXT_PUBLIC_BINARY_MARKETS_MODULE` and into the deploy script's `BINARY_MARKETS_MODULE`. |
| 8 | Reactivity subscription id | `NOT YET FILLED` | not an address, read it off the `SubscriptionOpened` event on row 3's receipt | Returned by the precompile at `0x0000000000000000000000000000000000000100` inside `startPlan`. `HANDOFF.md` section 3A calls this the single highest risk item in the project. |
| 9 | Smoke script deposit transaction | `NOT YET FILLED` | `https://shannon-explorer.somnia.network/tx/<hash>` | `forge script script/Smoke.s.sol --rpc-url $RPC_URL --private-key $FARM_EVM_PRIVATE_KEY --broadcast`, with `DEPLOYED_CONTRACT` and `COLLATERAL_TOKEN` exported. One broadcast: the tUSDC faucet, an approve for exactly that amount, then `deposit`. It never writes a plan and never withdraws, so it is safe to run before the recording. `run()` returns the vault balance and forge prints it. |

**The contract changed in Phase 5.** The security pass edited
`contracts/src/PerennisVault.sol` (checked approvals, measured redeem and buy
deltas, a guard on `startPlan`, `rescue()` and `stopSubscription()`), so rows 1
and 2 must be regenerated from a fresh deploy. Any address under
`contracts/broadcast/` predates that edit and is stale. This table is the single
source for the live vault address, and `SECURITY.md` points at row 1 rather than
carrying its own copy.

Rows 1 to 5 are the ones a judge will actually click. Rows 6 to 9 are what makes
rows 1 to 5 reproducible.

---

## Two reset recipes, so the numbers above can be regenerated

`npm run demo:reset` re-verifies `fixtures/*.json` and then prints the chain half
as commands rather than sending anything. It holds no key and sends no
transaction. What it prints:

```bash
cast send $VAULT "halt()" --rpc-url $RPC --private-key $FARM_EVM_PRIVATE_KEY
cast call $VAULT "balance()(uint256)" --rpc-url $RPC
cast send $VAULT "withdraw(uint256)" <balance> --rpc-url $RPC --private-key $FARM_EVM_PRIVATE_KEY
```

To read the vault state back without a browser, `contracts/README.md` step 4:

```bash
cast call $VAULT "snapshot()" --rpc-url $RPC_URL
```

---

## How to verify this in 60 seconds

For a judge, or for the human doing the last pass before submitting.

1. **Open `GET /api/health`** on the deployed URL and read four fields:
   - `adapterMode`, which says whether the app is on the chain path (`real`) or
     the fixture path.
   - `vaultAddressSet`, which says whether a deployed vault is configured at all.
   - `rollLedgerSource`, which reads `chain` once the ledger is being built from
     `RollSettled` logs and `seed` while it is still fixtures.
   - `marketDiscovery.via`, which says which level of `lib/markets.ts` produced
     the window list: `sdk`, `market-ids` or `seed`.
2. **Open row 4's transaction** on the explorer and check the sender. It must not
   be `owner()` on the vault in row 1. The vault's owner is the address that
   deployed it, and a roll sent from that address would be a manual call rather
   than a validator running the handler. The console derives its "validator call"
   badge from exactly this comparison, in `fetchRollLedger()` in `lib/dreamdex.ts`.
3. **Check row 5 is the settlement block** for the market, not a block after it.
   That is what "in the settlement block itself" means, and it is the difference
   between reactivity and a keeper.

If step 1 says `seed` on every field, the deployment is on fixtures and rows 1 to
5 cannot be verified against it. That is a real state this repo supports on
purpose (the console renders with an empty `.env.local`), and it is not the state
to submit.
