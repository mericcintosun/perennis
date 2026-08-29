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
// latency of any single read is RPC_TIMEOUT_MS * (RPC_RETRY_COUNT + 1), both
// read from lib/config.ts. lib/dreamdex.ts re-exports both names, so every
// importer written before this phase keeps resolving them from there.
//
// Server only: this file imports viem. Nothing under app/ or components/ may
// import it, directly or transitively.

import { createPublicClient, defineChain, http } from "viem";
import {
  CHAIN_ID,
  EXPLORER_URL,
  RPC_RETRY_COUNT,
  RPC_TIMEOUT_MS,
  RPC_URL,
} from "./config";

export const somniaShannon = defineChain({
  id: CHAIN_ID,
  name: "Somnia Shannon Testnet",
  nativeCurrency: { name: "Somnia Test Token", symbol: "STT", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: {
    default: { name: "Shannon Explorer", url: EXPLORER_URL },
  },
});

export function publicClient() {
  return createPublicClient({ chain: somniaShannon, transport: http() });
}

/**
 * The single outbound call wrapper for the whole core path. Every chain read in
 * lib/dreamdex.ts and every discovery call in lib/markets.ts goes through it and
 * no other retry loop exists, so the worst case latency of any one read is
 * bounded at RPC_TIMEOUT_MS * (RPC_RETRY_COUNT + 1) and can be reasoned about
 * from lib/config.ts alone.
 *
 * A timeout is surfaced as an Error named TimeoutError so lib/errors.ts can
 * classify it without reading the message text.
 */
export async function withTimeoutAndRetry<T>(run: () => Promise<T>): Promise<T> {
  let lastError: unknown = new Error("rpc call never ran");

  for (let attempt = 0; attempt <= RPC_RETRY_COUNT; attempt += 1) {
    try {
      return await raceTimeout(run());
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function raceTimeout<T>(work: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const timeout = new Error("rpc call exceeded the core timeout");
      timeout.name = "TimeoutError";
      reject(timeout);
    }, RPC_TIMEOUT_MS);

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
