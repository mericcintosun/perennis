// Reset the demo to its opening frame.
//
// There is no database, no KV store and no server side session. The demo's
// mutable state lives in exactly two places:
//
//   1. on chain, in the deployed PerennisVault (balance, plan, queue, rolls)
//   2. in fixtures/*.json, which is what the console serves when no vault
//      address is set
//
// This script owns the second one and documents the first. It cannot own the
// first: resetting a contract means sending transactions, and a node script
// holding a private key is a key this repo has no reason to hold. So the chain
// half is printed as the exact commands to run, and the human runs them.
//
// The fixture half is a no-op in the ordinary case, and that is the point. The
// fixtures are checked into git and nothing at runtime writes to them, so a
// reset is a proof that they still satisfy the invariants the demo depends on,
// followed by rewriting the manifest that records the proof. If the file has
// been edited by hand mid rehearsal, this is where it is caught.
//
// Deterministic, the same as scripts/seed.mjs: no Date.now(), no Math.random(),
// no network, no child process. The manifest it writes is byte identical to the
// one `npm run seed` writes, so running either leaves the tree in the same
// state.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = join(root, "fixtures");

function read(name) {
  return JSON.parse(readFileSync(join(fixtures, name), "utf8"));
}

const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

const windows = read("event-windows.json");
const vaults = read("vaults.json");

// --- the invariants the demo walk depends on -----------------------------

check(Array.isArray(windows), "event-windows.json must be an array");
check(Array.isArray(vaults), "vaults.json must be an array");
check(windows.length === 12, `expected 12 event windows, found ${windows.length}`);
check(vaults.length === 3, `expected 3 vaults, found ${vaults.length}`);

const knownWindowIds = new Set(windows.map((w) => w.marketId));
for (const v of vaults) {
  for (const id of v.queue) {
    check(
      knownWindowIds.has(id),
      `vault ${v.id} queues a market id that is not in event-windows.json: ${id}`
    );
  }
  for (const entry of v.ledger) {
    check(
      knownWindowIds.has(entry.marketId),
      `vault ${v.id} ledger row ${entry.index} references an unknown market id`
    );
  }
}

// Step 1 opens on an empty Vault 01 and step 6 closes on a halted Vault 03. If
// either has drifted, the walk breaks on camera and not before.
const vault01 = vaults.find((v) => v.id === "vault-01");
const vault02 = vaults.find((v) => v.id === "vault-02");
const vault03 = vaults.find((v) => v.id === "vault-03");

check(Boolean(vault01), "vault-01 is missing, DEMO.md step 1 has nothing to open on");
check(Boolean(vault02), "vault-02 is missing, DEMO.md steps 2 to 5 have no running vault");
check(Boolean(vault03), "vault-03 is missing, DEMO.md step 6 has nothing to close on");
check(
  vault01 !== undefined && vault01.status === "IDLE",
  "vault-01 must be IDLE so the demo can write a plan into it"
);
check(
  vault01 !== undefined && vault01.ledger.length === 0,
  "vault-01 must have an empty ledger so the empty state shows"
);
check(
  vault02 !== undefined && vault02.status === "ACTIVE",
  "vault-02 must be ACTIVE so the countdown runs on camera"
);
check(
  vault02 !== undefined && Boolean(vault02.openMarketId),
  "vault-02 must hold an open position so the roll has something to settle"
);
check(
  vault03 !== undefined && vault03.status === "STOPPED",
  "vault-03 must be STOPPED"
);
check(
  vault03 !== undefined && vault03.stopReason === "consecutive-losses",
  "vault-03 must be halted on consecutive-losses"
);
check(
  vault03 !== undefined && vault03.consecutiveLosses >= 2,
  "vault-03 must show at least two losses in a row"
);

if (failures.length > 0) {
  for (const message of failures) {
    console.error(`demo-reset: ${message}`);
  }
  console.error(
    "demo-reset: the fixtures no longer match the demo walk. Restore them with `git checkout fixtures/` and run this again."
  );
  process.exit(1);
}

// --- rewrite the manifest ------------------------------------------------

// Same shape and same ordering as scripts/seed.mjs, so the two agree byte for
// byte. This is the only write this script performs and it lands inside
// fixtures/, never anywhere else and never at request time.
const manifest = {
  fixtures: ["event-windows.json", "vaults.json"],
  counts: {
    eventWindows: windows.length,
    vaults: vaults.length,
    ledgerEntries: vaults.reduce((total, v) => total + v.ledger.length, 0),
  },
  marketIds: [...windows.map((w) => w.marketId)].sort(),
  vaultIds: [...vaults.map((v) => v.id)].sort(),
};

writeFileSync(
  join(fixtures, "seed-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8"
);

// --- the chain half, printed rather than run -----------------------------

console.log(
  `demo-reset: fixtures verified, ${manifest.counts.eventWindows} windows and ${manifest.counts.vaults} vaults, manifest rewritten`
);
console.log("");
console.log("The fixture path is now at its opening frame.");
console.log("");
console.log("The chain path is not, and this script will not send transactions.");
console.log("Run these yourself with the owner wallet, in this order:");
console.log("");
console.log("  export VAULT=$NEXT_PUBLIC_CONTRACT_ADDRESS");
console.log("  export RPC=https://dream-rpc.somnia.network");
console.log("");
console.log("  # 1. stop the plan, so nothing rolls while you reset");
console.log('  cast send $VAULT "halt()" --rpc-url $RPC --private-key $FARM_EVM_PRIVATE_KEY');
console.log("");
console.log("  # 2. read the idle balance, then pull all of it out");
console.log('  cast call $VAULT "balance()(uint256)" --rpc-url $RPC');
console.log('  cast send $VAULT "withdraw(uint256)" <balance> --rpc-url $RPC --private-key $FARM_EVM_PRIVATE_KEY');
console.log("");
console.log("  # 3. or start from a clean contract, which is the safer rehearsal");
console.log("  cd contracts && forge script script/Deploy.s.sol --rpc-url $RPC --broadcast");
console.log("");
console.log("A redeploy needs the new address written back into .env.local as");
console.log("NEXT_PUBLIC_CONTRACT_ADDRESS, and a fresh tUSDC faucet(10000) call.");
console.log("Check GET /api/health afterwards: vaultAddressSet must read true.");
