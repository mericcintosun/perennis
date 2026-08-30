// Market discovery. The one module that answers "which Event Contracts windows
// exist right now, and what state is each one in".
//
// Server only. It imports the Shannon client in lib/rpc.ts and is reached
// through lib/dreamdex.ts, which no file under app/ or components/ imports.
//
// Three levels, tried in this order, and the level that answered leaves this
// module as a MarketDiscoveryPath so GET /api/health can say which one ran:
//
//   1. "sdk"         @somnia-chain/markets-sdk loadMarkets() filtered by
//                    isBinaryMarket(). Real ids, real lifecycle state, real book.
//   2. "market-ids"  the Phase 2 per id getMarket(bytes32) overlay on the
//                    fixture ids. Real lifecycle state, fixture metadata.
//   3. "seed"        fixtures/event-windows.json exactly as it is on disk.
//
// Why the SDK sits in optionalDependencies and why the import below is dynamic
// and guarded: the DreamDEX docs pin 0.28.0 or above, because under that version
// the decimal conversion produces 0.050000000000000003 and orders come back as
// InvalidPrice. A package that cannot be fetched (a renamed package, a private
// registry, a network failure during install) has to degrade this one read
// rather than kill `npm install` for the whole app. optionalDependencies lets
// the install pass without it, and the import runs behind a variable specifier
// with a webpackIgnore comment inside try/catch, so a missing package is a
// caught runtime condition and never a bundler resolution failure.
//
// Nothing here throws. Every level that does not answer records a note written
// by us through coreFailure(), and a provider message is never passed through.

import type { SdkBinaryMarket } from "@somnia-chain/markets-sdk";
import { binaryMarketsAbi } from "@/lib/abi";
import {
  BINARY_MARKETS_MODULE,
  CHAIN_ID,
  MARKET_DISCOVERY,
  RPC_URL,
} from "./config";
import { eventWindows } from "./data/seed";
import { classify, coreFailure, failureNote } from "./errors";
import { logCore, logCoreWarn } from "./log";
import { publicClient, withTimeoutAndRetry } from "./rpc";
import type {
  ApiResponse,
  Asset,
  EventWindow,
  MarketDiscoveryPath,
  MarketState,
} from "./types";

/** The package name, in one place. Also the specifier the dynamic import uses. */
const SDK_PACKAGE = "@somnia-chain/markets-sdk";

/** Lifecycle codes from the DreamDEX docs: only state 1 accepts orders. */
const marketStateByCode: Record<number, MarketState> = {
  0: "Listed",
  1: "Trading",
  2: "Locked",
  4: "Resolved",
  5: "Voided",
};

/** The two functions this app calls on the SDK, and nothing else. */
interface MarketsSdkModule {
  loadMarkets: (options?: {
    chainId?: number;
    rpcUrl?: string;
    address?: string;
  }) => Promise<unknown>;
  isBinaryMarket: (market: unknown) => boolean;
}

export interface DiscoveryResult {
  response: ApiResponse<EventWindow[]>;
  via: MarketDiscoveryPath;
  /** True when the SDK package loaded and exposed both functions this app calls. */
  sdkResolved: boolean;
}

/**
 * The window list, and how it was found.
 *
 * fetchEventWindows() in lib/dreamdex.ts is a thin wrapper over the `response`
 * field, and getMarketDiscovery() on the chain adapter reports `via` and
 * `sdkResolved` to the health probe. Deleting this file breaks DEMO.md step 2
 * (the open window on the vault card) and DEMO.md step 7 (every id in the queue
 * strip), which is the depth test for the integration.
 */
export async function discoverEventWindows(): Promise<DiscoveryResult> {
  if (MARKET_DISCOVERY === "seed") {
    return {
      response: {
        source: "seed",
        data: eventWindows,
        note: failureNote(
          coreFailure(
            "not-configured",
            "Market discovery is pinned to seed by NEXT_PUBLIC_MARKET_DISCOVERY, so these windows come from the fixtures."
          )
        ),
      },
      via: "seed",
      sdkResolved: false,
    };
  }

  let sdkResolved = false;
  let sdkNote: string | undefined;

  if (MARKET_DISCOVERY === "sdk") {
    const sdk = await loadSdk();
    sdkResolved = sdk !== null;

    if (!sdk) {
      sdkNote = failureNote(
        coreFailure(
          "not-configured",
          `${SDK_PACKAGE} did not load, so discovery dropped to the per id market read. Install the package to put this back on the SDK.`
        )
      );
    } else {
      const fromSdk = await windowsFromSdk(sdk);
      if (fromSdk.length > 0) {
        logCore("market discovery", { via: "sdk", windows: fromSdk.length });
        return {
          response: { source: "chain", data: fromSdk },
          via: "sdk",
          sdkResolved,
        };
      }
      sdkNote = failureNote(
        coreFailure(
          "upstream-error",
          "The markets SDK answered with no binary window this app can queue, so discovery dropped to the per id market read."
        )
      );
    }
  }

  // Level two: the Phase 2 overlay. Real lifecycle state read one market id at a
  // time, laid over the fixture metadata.
  const overlay = await windowsFromMarketIds();
  if (overlay) {
    logCore("market discovery", { via: "market-ids", windows: overlay.length });
    return {
      response: {
        source: "chain",
        data: overlay,
        ...(sdkNote ? { note: sdkNote } : {}),
      },
      via: "market-ids",
      sdkResolved,
    };
  }

  return {
    response: {
      source: "seed",
      data: eventWindows,
      note:
        sdkNote ??
        failureNote(
          coreFailure(
            "not-configured",
            "No binary markets module address is set, so window states come from the fixtures."
          )
        ),
    },
    via: "seed",
    sdkResolved,
  };
}

// --- level one, the sponsor SDK -----------------------------------------

/**
 * Load the SDK, or return null.
 *
 * The specifier is held in a variable and carries a webpackIgnore comment, so
 * the bundler leaves the expression alone instead of trying to resolve a package
 * that may not be installed. Both the namespace and its default export are
 * checked, because a package published as CommonJS lands under `default` when it
 * is imported from an ES module.
 */
async function loadSdk(): Promise<MarketsSdkModule | null> {
  try {
    const specifier: string = SDK_PACKAGE;
    const loaded = await import(/* webpackIgnore: true */ specifier);
    const candidates = [loaded, loaded?.default];

    for (const candidate of candidates) {
      if (
        candidate &&
        typeof candidate.loadMarkets === "function" &&
        typeof candidate.isBinaryMarket === "function"
      ) {
        return candidate as MarketsSdkModule;
      }
    }
    return null;
  } catch {
    // Not installed, or installed and unloadable. Either way this is the
    // fallback's job and not an error the page should ever see.
    logCoreWarn("markets sdk unavailable", { package: SDK_PACKAGE });
    return null;
  }
}

/**
 * Ask the SDK for every market, keep the binary ones, and map each onto the
 * EventWindow shape in lib/types.ts.
 *
 * Every field is read through a candidate key list and validated, because this
 * shape has not been verified against a live response from inside this repo. A
 * market that cannot be mapped is dropped rather than guessed at, and if that
 * leaves nothing the caller falls through to the per id read.
 */
async function windowsFromSdk(sdk: MarketsSdkModule): Promise<EventWindow[]> {
  try {
    const raw = await withTimeoutAndRetry(() =>
      Promise.resolve(
        sdk.loadMarkets({
          chainId: CHAIN_ID,
          rpcUrl: RPC_URL,
          ...(BINARY_MARKETS_MODULE ? { address: BINARY_MARKETS_MODULE } : {}),
        })
      )
    );

    if (!Array.isArray(raw)) return [];

    const binary = raw.filter((market) => {
      try {
        return sdk.isBinaryMarket(market);
      } catch {
        return false;
      }
    });

    const mapped: EventWindow[] = [];
    for (const market of binary) {
      const window = toEventWindow(market as SdkBinaryMarket);
      if (window) mapped.push(window);
    }

    logCore("markets sdk read", {
      returned: raw.length,
      binary: binary.length,
      mapped: mapped.length,
    });

    // Soonest lock first, so the plan builder queues the next windows and not
    // whatever order the module happened to answer in.
    return mapped.sort((a, b) => a.locksAt.localeCompare(b.locksAt));
  } catch (error) {
    logCoreWarn("chain read failed", {
      step: "markets sdk read",
      code: classify(error),
    });
    return [];
  }
}

type Row = Record<string, unknown>;

/**
 * One SDK market to one EventWindow, or null when a required field is missing.
 *
 * Required: a 0x market id, an asset this app can trade (BTC or ETH), a lock
 * time, and at least one side of the book. Everything else is derived from those
 * or read with a documented default.
 */
function toEventWindow(market: SdkBinaryMarket): EventWindow | null {
  const row = market as unknown as Row;

  const marketId = readString(row, ["marketId", "id", "market", "conditionId"]);
  if (!marketId || !marketId.startsWith("0x")) return null;

  const asset = readAsset(row);
  if (!asset) return null;

  const locksAtMs = readTime(row, [
    "locksAt",
    "lockTime",
    "closeTime",
    "endTime",
    "resolvesAt",
  ]);
  if (locksAtMs === undefined) return null;

  const opensAtMs = readTime(row, [
    "opensAt",
    "openTime",
    "startTime",
    "createdAt",
  ]);

  const durationMinutes = readDuration(row, opensAtMs, locksAtMs);

  // Price decimals are read off the market, never assumed. A constant that is
  // right on testnet misprices every book on mainnet.
  const priceDecimals = readNumber(row, [
    "priceDecimals",
    "decimals",
    "priceScale",
  ]);
  const nested = asRow(row.prices);

  const up = toCents(
    readNumber(row, ["upAsk", "yesPrice", "upPrice", "priceUp"]) ??
      (nested ? readNumber(nested, ["up", "yes", "ask"]) : undefined),
    priceDecimals
  );
  const down = toCents(
    readNumber(row, ["downAsk", "noPrice", "downPrice", "priceDown"]) ??
      (nested ? readNumber(nested, ["down", "no", "bid"]) : undefined),
    priceDecimals
  );
  if (up === undefined && down === undefined) return null;

  // The two sides of a binary book sum to one unit of collateral. Deriving the
  // missing leg is a property of the instrument, not an invented number.
  const upAskCents = up ?? 100 - (down as number);
  const downAskCents = down ?? 100 - (up as number);

  const collateralDecimals = readNumber(row, [
    "collateralDecimals",
    "quoteDecimals",
  ]);
  const depth = readNumber(row, [
    "bookDepthUsd",
    "depthUsd",
    "liquidityUsd",
    "liquidity",
    "openInterest",
  ]);

  const locksAt = new Date(locksAtMs).toISOString();
  const opensAt = new Date(
    opensAtMs ?? locksAtMs - durationMinutes * 60_000
  ).toISOString();

  return {
    marketId,
    asset,
    question:
      readString(row, ["question", "title", "name", "description"]) ??
      `${asset} window locking at ${locksAt.slice(11, 16)} UTC`,
    durationMinutes,
    opensAt,
    locksAt,
    state: readState(row) ?? "Listed",
    upAskCents,
    downAskCents,
    bookDepthUsd:
      depth === undefined
        ? 0
        : Math.max(
            0,
            Math.round(
              collateralDecimals === undefined
                ? depth
                : depth / 10 ** collateralDecimals
            )
          ),
  };
}

// --- level two, the per id read -----------------------------------------

/**
 * The Phase 2 overlay, moved here whole. Reads the live lifecycle state of each
 * known market id off the BinaryMarketsModule and lays it over the fixture
 * metadata. Returns null when there is no module address to read from, which is
 * the caller's signal to fall through to the fixtures.
 */
async function windowsFromMarketIds(): Promise<EventWindow[] | null> {
  if (!BINARY_MARKETS_MODULE) return null;

  try {
    const client = publicClient();
    // Bound to a local const first: the guard above narrows the import, but that
    // narrowing does not survive into the callback below, so viem would see the
    // address as possibly undefined.
    const address = BINARY_MARKETS_MODULE;
    // Shannon has no multicall3 deployment we rely on, so these go out as plain
    // eth_call batches. Twelve windows is well inside a single RPC round trip.
    const results = await Promise.allSettled(
      eventWindows.map((w) =>
        withTimeoutAndRetry(() =>
          client.readContract({
            address,
            abi: binaryMarketsAbi,
            functionName: "getMarket",
            args: [toBytes32(w.marketId)],
          })
        )
      )
    );

    return eventWindows.map((w, i) => {
      const r = results[i];
      if (r.status !== "fulfilled") return w;
      const [stateCode, lockTime] = r.value;
      return {
        ...w,
        state: marketStateByCode[Number(stateCode)] ?? w.state,
        locksAt: new Date(Number(lockTime) * 1000).toISOString(),
      };
    });
  } catch (error) {
    logCoreWarn("chain read failed", {
      step: "market states read",
      code: classify(error),
    });
    return null;
  }
}

/**
 * Seed market ids are written in the shortened form the DreamDEX UI displays.
 * Right padding gets them to a well formed bytes32 for the call. Ids arriving
 * full length from the SDK are already 64 hex characters, so padEnd does nothing
 * and they pass through unchanged.
 */
export function toBytes32(id: string): `0x${string}` {
  return `0x${id.replace(/^0x/, "").padEnd(64, "0")}` as `0x${string}`;
}

// --- defensive field readers --------------------------------------------

function asRow(value: unknown): Row | null {
  return value !== null && typeof value === "object" ? (value as Row) : null;
}

function readString(row: Row, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function readNumber(row: Row, keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "bigint") return Number(value);
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

/** Epoch milliseconds from unix seconds, unix milliseconds, or an ISO string. */
function readTime(row: Row, keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "number" || typeof value === "bigint") {
      const epoch = toEpochMs(Number(value));
      if (epoch !== undefined) return epoch;
      continue;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const trimmed = value.trim();
      if (/^\d+$/.test(trimmed)) {
        const epoch = toEpochMs(Number(trimmed));
        if (epoch !== undefined) return epoch;
        continue;
      }
      const parsed = Date.parse(trimmed);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

/** Seconds and milliseconds are told apart by magnitude, not by a config flag. */
function toEpochMs(value: number): number | undefined {
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return value < 1e12 ? value * 1000 : value;
}

function readAsset(row: Row): Asset | undefined {
  const raw =
    readString(row, ["asset", "symbol", "underlying", "base", "ticker"]) ??
    readString(row, ["question", "title", "name"]);
  if (!raw) return undefined;

  const upper = raw.toUpperCase();
  if (upper.includes("BTC")) return "BTC";
  if (upper.includes("ETH")) return "ETH";
  // Anything else is a market this plan builder cannot express, so it is
  // dropped rather than relabelled as one of the two it can.
  return undefined;
}

function readState(row: Row): MarketState | undefined {
  const code = readNumber(row, ["state", "status", "marketState", "lifecycle"]);
  if (code !== undefined) return marketStateByCode[code];

  const label = readString(row, ["state", "status", "marketState"]);
  if (!label) return undefined;
  const match = Object.values(marketStateByCode).find(
    (known) => known.toLowerCase() === label.toLowerCase()
  );
  return match;
}

/**
 * Window length in minutes. Read it if the market says it, otherwise take it
 * from the two timestamps. Event Contracts windows are 15 minutes or 1 hour, so
 * anything at or above 45 minutes is the hour window.
 */
function readDuration(
  row: Row,
  opensAtMs: number | undefined,
  locksAtMs: number
): 15 | 60 {
  const stated = readNumber(row, [
    "durationMinutes",
    "duration",
    "windowMinutes",
  ]);
  const minutes =
    stated ??
    (opensAtMs === undefined ? undefined : (locksAtMs - opensAtMs) / 60_000);

  if (minutes === undefined) return 15;
  return minutes >= 45 ? 60 : 15;
}

/**
 * A price in cents, 1 to 99, or undefined when the value cannot be trusted.
 *
 * Scaled by the decimals the market reported, never by a constant written here.
 * With no decimals reported the shape decides: a value at or under one unit is a
 * probability and multiplies to cents, a whole number in the cent range is
 * already cents. Anything outside that comes back undefined rather than wrong.
 */
function toCents(
  raw: number | undefined,
  decimals: number | undefined
): number | undefined {
  if (raw === undefined || !Number.isFinite(raw) || raw <= 0) return undefined;

  const unit = decimals === undefined ? raw : raw / 10 ** decimals;
  const cents = unit <= 1 ? unit * 100 : unit;
  const rounded = Math.round(cents);
  return rounded >= 1 && rounded <= 99 ? rounded : undefined;
}
