// The Shannon client and the one retry loop.
//
// Phase 2 put both of these at the top of lib/dreamdex.ts. Phase 4 added a
// second server module that makes outbound calls (lib/markets.ts, market
// discovery), and lib/dreamdex.ts imports that module, so leaving the client
// where it was would have meant either a circular import between the two or a
// second retry loop. Neither is acceptable, so the client and the wrapper moved
// down here and both modules import them from one place.
//
// The rule Phase 2 set is unchanged and still true: there is exactly one retry
// loop on the core path, it is withTimeoutAndRetry() below, and the worst case
// latency of any single read is still a product of constants in lib/config.ts,
// now RPC_TIMEOUT_MS * RPC_URLS.length * (RPC_RETRY_COUNT + 1) plus the backoff.
// In the default single endpoint deployment that is the same number it always
// was. lib/dreamdex.ts re-exports both names, so every importer written before
// this phase keeps resolving them from there.
//
// This file also holds the short lived read cache (remember / recentValue). It
// is not a performance cache: its whole job is that a read the endpoint refuses
// does not blank a screen that had live numbers a moment ago. Callers store only
// responses they are willing to show again.
//
// Server only: this file imports viem. Nothing under app/ or components/ may
// import it, directly or transitively.

import { createPublicClient, defineChain, fallback, http } from "viem";
import {
  CHAIN_CACHE_TTL_MS,
  CHAIN_ID,
  EXPLORER_URL,
  RPC_RETRY_BACKOFF_MS,
  RPC_RETRY_COUNT,
  RPC_TIMEOUT_MS,
  RPC_URLS,
} from "./config";

export const somniaShannon = defineChain({
  id: CHAIN_ID,
  name: "Somnia Shannon Testnet",
  nativeCurrency: { name: "Somnia Test Token", symbol: "STT", decimals: 18 },
  rpcUrls: { default: { http: [...RPC_URLS] } },
  blockExplorers: {
    default: { name: "Shannon Explorer", url: EXPLORER_URL },
  },
});

/**
 * One transport over every endpoint in RPC_URLS, primary first. viem's fallback
 * moves to the next entry when the one it is on errors, so a standby endpoint
 * configured through NEXT_PUBLIC_SOMNIA_RPC_FALLBACK_URLS is picked up without
 * any caller knowing. With that key unset the list has one entry and this is the
 * plain http transport the app shipped with.
 *
 * `retryCount: 0` on both levels is deliberate and is what keeps the promise made
 * at the top of this file: viem's http transport retries three times by default,
 * which would be a second and a third retry loop underneath ours. The one retry
 * loop is withTimeoutAndRetry() below and there is still no other.
 *
 * `timeout` is set per endpoint as well as raced below, because the race can only
 * stop waiting on a request, it cannot abort the socket. Handing viem the same
 * budget means an endpoint that has stopped answering releases its connection
 * instead of being left running behind an abandoned promise.
 */
const transport = fallback(
  RPC_URLS.map((url) => http(url, { retryCount: 0, timeout: RPC_TIMEOUT_MS })),
  { retryCount: 0 }
);

// Built once. A client per call re-created the transport, and with a fallback
// list that also threw away which endpoint was answering.
const client = createPublicClient({ chain: somniaShannon, transport });

export function publicClient() {
  return client;
}

/**
 * The budget one call gets across the whole endpoint list. Identical to
 * RPC_TIMEOUT_MS in the default single endpoint deployment; it only grows when
 * an operator has actually configured standbys, and it stays bounded either way.
 */
const CALL_BUDGET_MS = RPC_TIMEOUT_MS * RPC_URLS.length;

/**
 * The single outbound call wrapper for the whole core path. Every chain read in
 * lib/dreamdex.ts and every discovery call in lib/markets.ts goes through it and
 * no other retry loop exists, so the worst case latency of any one read is
 * bounded at CALL_BUDGET_MS * (RPC_RETRY_COUNT + 1) plus the backoff, and can be
 * reasoned about from lib/config.ts alone. With one endpoint configured, which
 * is the default, CALL_BUDGET_MS is RPC_TIMEOUT_MS and that is the same bound
 * this wrapper has always had.
 *
 * A timeout is surfaced as an Error named TimeoutError so lib/errors.ts can
 * classify it without reading the message text.
 */
export async function withTimeoutAndRetry<T>(run: () => Promise<T>): Promise<T> {
  let lastError: unknown = new Error("rpc call never ran");

  for (let attempt = 0; attempt <= RPC_RETRY_COUNT; attempt += 1) {
    // Backoff before the retry, never before the first attempt, so the happy
    // path costs nothing. An endpoint shedding load with a 429 or a 503 needs a
    // gap more than it needs the same request again immediately.
    if (attempt > 0) await sleep(RPC_RETRY_BACKOFF_MS * attempt);

    try {
      return await raceTimeout(run());
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function raceTimeout<T>(work: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const timeout = new Error("rpc call exceeded the core timeout");
      timeout.name = "TimeoutError";
      reject(timeout);
    }, CALL_BUDGET_MS);

    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

// --- the short lived read cache -----------------------------------------

interface Entry {
  value: unknown;
  at: number;
}

// Module scope, so on a serverless runtime it lives as long as the warm instance
// and no longer. That is the right lifetime for this: it is a bridge over one
// refused call, not a store, and a cold instance simply has nothing to offer.
const entries = new Map<string, Entry>();

/**
 * Keep a successful read and hand it straight back, so a call site can write
 * `return remember("vaults", response)` without a second statement.
 *
 * Only store something you would be happy to render again a few seconds later.
 * In practice that means chain responses and never a fallback response, because
 * remembering a fixture answer would make the note describing it outlive the
 * failure that produced it.
 */
export function remember<T>(key: string, value: T): T {
  entries.set(key, { value, at: Date.now() });
  return value;
}

/**
 * The last good value for a key, if one was stored inside CHAIN_CACHE_TTL_MS.
 * Undefined once it ages out, which is the caller's signal that it really does
 * have to fall back to the fixtures and say so.
 */
export function recentValue<T>(key: string): T | undefined {
  const entry = entries.get(key);
  if (!entry) return undefined;

  if (Date.now() - entry.at > CHAIN_CACHE_TTL_MS) {
    entries.delete(key);
    return undefined;
  }
  return entry.value as T;
}
