// Fixture check and manifest writer.
//
// There is no database. "Seeding" here means proving that fixtures/*.json still
// satisfies the invariants the console and the demo script depend on, then
// writing a manifest that records what was checked.
//
// Deterministic on purpose: no Date.now(), no Math.random(), no network. Two
// runs on a clean checkout produce a byte identical fixtures/seed-manifest.json,
// so a diff in that file always means a fixture actually changed.

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

function unique(values) {
  return new Set(values).size === values.length;
}

const windows = read("event-windows.json");
const vaults = read("vaults.json");

// --- window invariants ---------------------------------------------------

check(Array.isArray(windows), "event-windows.json must be an array");
check(
  windows.length === 12,
  `expected 12 event windows, found ${windows.length}`
);
check(
  unique(windows.map((w) => w.marketId)),
  "event window market ids must be unique"
);
for (const w of windows) {
  check(
    /^0x[0-9a-f]{32}$/.test(w.marketId),
    `market id is not a 32 character hex string: ${w.marketId}`
  );
  check(
    w.asset === "BTC" || w.asset === "ETH",
    `unknown asset on ${w.marketId}: ${w.asset}`
  );
  check(
    w.upAskCents >= 1 && w.upAskCents <= 99,
    `up ask out of the 1 to 99 cent range on ${w.marketId}`
  );
  check(
    w.downAskCents >= 1 && w.downAskCents <= 99,
    `down ask out of the 1 to 99 cent range on ${w.marketId}`
  );
  check(
    ["Listed", "Trading", "Locked", "Resolved", "Voided"].includes(w.state),
    `unknown market state on ${w.marketId}: ${w.state}`
  );
}

// --- vault invariants ----------------------------------------------------

check(Array.isArray(vaults), "vaults.json must be an array");
check(vaults.length === 3, `expected 3 vaults, found ${vaults.length}`);
check(unique(vaults.map((v) => v.id)), "vault ids must be unique");

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

// The demo closes on Vault 03, so this one is not a style preference.
const vault01 = vaults.find((v) => v.id === "vault-01");
const vault03 = vaults.find((v) => v.id === "vault-03");
check(Boolean(vault01), "vault-01 is missing");
check(Boolean(vault03), "vault-03 is missing");
check(
  vault01 !== undefined && vault01.status === "IDLE",
  "vault-01 must be IDLE so the demo can write a plan into it"
);
check(
  vault01 !== undefined && vault01.ledger.length === 0,
  "vault-01 must have an empty ledger so the empty state shows"
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

// --- report --------------------------------------------------------------

if (failures.length > 0) {
  for (const message of failures) {
    console.error(`seed: ${message}`);
  }
  process.exit(1);
}

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

console.log(
  `seed: ${manifest.counts.eventWindows} windows, ${manifest.counts.vaults} vaults, ${manifest.counts.ledgerEntries} ledger rows checked`
);
