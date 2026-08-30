# Security

Four sections: what is deployed and where, every wallet permission this dapp
asks for, what it approves and to whom, and where the source is. Nothing here is
aspirational. If a value is not filled in, it says so.

Testnet software. The contract has not been audited and has no upgrade path.

---

## 1. Contracts and chain

Chain: Somnia Shannon, chain id `50312`. RPC
`https://dream-rpc.somnia.network`, explorer
`https://shannon-explorer.somnia.network`. All three are defaults in
`lib/config.ts` and overridable through `.env.local`.

| What | Address | Source of truth |
| --- | --- | --- |
| `PerennisVault` | see `EVIDENCE.md` row 1 | `EVIDENCE.md` is the single source. The console reads it from `NEXT_PUBLIC_CONTRACT_ADDRESS` through `VAULT_ADDRESS` in `lib/config.ts`. |
| Collateral, tUSDC | `0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E` | The value `.env.example` ships for `NEXT_PUBLIC_COLLATERAL_TOKEN`, read as `COLLATERAL_TOKEN` in `lib/config.ts`. Decimals are read off the contract, never assumed. |
| DreamDEX BinaryMarketsModule | see `EVIDENCE.md` row 7 | `.env.example` ships `NEXT_PUBLIC_BINARY_MARKETS_MODULE` empty, so a deployment fills it. |
| Somnia reactivity precompile | `0x0000000000000000000000000000000000000100` | Fixed by the protocol. A constant in `lib/config.ts` (`REACTIVITY_PRECOMPILE`) and hardcoded in `contracts/src/PerennisVault.sol`. The two must agree. |

**The vault address changed in Phase 5.** The security pass edited
`contracts/src/PerennisVault.sol`, so every address recorded by an earlier
deploy, including anything under `contracts/broadcast/`, is stale from that
commit onward. Do not read a vault address out of the broadcast folder. Read it
out of `EVIDENCE.md` row 1, which is filled in from the redeploy.

### The one open trust boundary

`armNext(bytes32[])` is permissionless, and that is a product decision rather
than an oversight: the next window's market may not exist when the plan is
written, so a friend, a cron or the frontend has to be able to top the queue
back up. The honest consequence is that **a stranger chooses which market ids
the vault may enter next.**

What bounds it:

- the spend per window is `plan.stakePerWindow` and nothing else,
- `_enterNext` refuses any market whose `marketState` is not 1 (Trading),
- the stop rules still halt the plan on the owner's terms,
- the queue is capped at `MAX_QUEUE_ADD` (8) per call and `MAX_PENDING` (32)
  in total, so nobody can push storage into the contract without limit,
- `bytes32(0)` is rejected, so the "queue empty" sentinel cannot be forged.

What is not bounded: a griefer can push the vault into markets the owner did not
pick. **Severity: medium on testnet, high for anything holding real money.** The
shortest fix is an owner allowlist on the queue, or an owner-only `armNext` with
a separate permissionless refill that only accepts ids the owner has already
signed over. Neither shipped in Phase 5, because both change the demo's
"anyone can refill a dry queue" story and the fence for that phase was security
fixes only. Until then: a vault with money in it should be halted rather than
left with an open queue.

---

## 2. Wallet permissions

Every method this dapp ever sends to an injected wallet. The complete list, and
there is nothing else:

| Method | Where | When |
| --- | --- | --- |
| `eth_requestAccounts` | `connectWallet()` in `lib/tx.ts` | Only from the Connect button's click handler. Never on page load. |
| `eth_accounts` | `firstConnectedAddress()` in `lib/tx.ts` | The silent "already approved?" check. Opens no dialog. |
| `eth_chainId` | `currentChainId()` in `lib/tx.ts` | Read only, before every send. |
| `wallet_switchEthereumChain` | `ensureChain()` in `lib/tx.ts` | Only from the "Switch network" button. Targets chain id 50312. |
| `wallet_addEthereumChain` | `ensureChain()` in `lib/tx.ts` | Only after the switch answers 4902 (unrecognised chain). |
| `eth_sendTransaction` | `sendVaultTx()` through viem's `sendTransaction` in `lib/tx.ts` | Only from a click on a write control. |

**This app never asks for `eth_sign` and never asks for `personal_sign`.**
Neither string appears anywhere in the repository. There is no sign-in-with-
Ethereum flow, no off chain signature, and no message signing of any kind.

**No wallet dialog opens on page load.** `eth_requestAccounts` appears exactly
once in the repo, inside `connectWallet()`, which is reached only from
`handleConnect()` in `components/standing-plan-console.tsx`, which is a click
handler. It is in no `useEffect`, so a judge opening the live URL cold sees the
page and no popup.

**Connecting is never followed automatically by an approval.** `handleConnect()`
sets wallet state and does nothing else. The approve call is built in
`depositCalls()` and only sent from inside `writePlan()`, behind a separate
click on the plan button.

---

## 3. Approvals

One approval exists in this app and it has one spender.

- **Built by:** `depositCalls()` in `lib/tx.ts`.
- **Spender:** `VAULT_ADDRESS`, the deployed `PerennisVault` contract. Never an
  EOA, never the markets module, never a relayer.
- **Amount:** exactly `parseUnits(amount, decimals)`, the deposit being made,
  with `decimals` read off the token contract. There is no unlimited approval
  anywhere: no `maxUint256`, no `type(uint256).max`, no `ffff...` literal on any
  approval path.
- **Skipped when unnecessary:** the standing allowance is read first, and the
  approve is only added when it does not already cover the deposit.
- **Shown before it is signed:** the exact amount and the spender render in the
  "What the next click sends" block in `components/standing-plan-console.tsx`,
  above the write controls, before any wallet popup can open.

Inside the contract, `_enterNext` approves the markets module for exactly
`plan.stakePerWindow` and clears the approval back to zero on both the success
and the failure branch, so no standing allowance survives between windows. Both
calls go through `_approveExact` and `_clearApproval`, which check the returned
boolean rather than dropping it.

**Forms.** The plan builder posts nowhere. Every input in
`components/standing-plan-console.tsx` is local `useState` validated by
`parsePlanForm()` in `lib/schemas.ts`. The only network calls this app makes are
to its own `/api/*` routes and to the Shannon RPC. There is no analytics
endpoint, no third party form handler, and no outbound POST.

**Secrets.** No key-like string is reachable from the client. The deployer key
lives behind `FARM_EVM_PRIVATE_KEY`, is used by forge on the command line, and
is read by no file under `app/`, `components/` or `lib/`. `.gitignore` covers
`.env*` (except `.env.example`), plus `contracts/cache/` and `contracts/out/`.
`contracts/broadcast/` stays tracked because it is deploy evidence: it holds
transaction hashes, addresses, calldata and nonces, and no key material.

---

## 4. Source

`https://github.com/mericcintosun/perennis`

Report anything you find as a GitHub issue on that repository. This is a
hackathon project on a testnet, so there is no bounty and no disclosure window,
and the honest response to a real finding is that the contract gets redeployed.
