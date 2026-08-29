// The narrow surface of @somnia-chain/markets-sdk that Perennis calls.
//
// Two functions, and nothing else. lib/markets.ts loads the package through a
// guarded dynamic import, so this declaration exists to type that call site
// rather than to describe the package in full. tsconfig.json already includes
// **/*.ts, so this file needs no config change.
//
// Why declare it at all instead of taking the package's own types: the package
// sits in optionalDependencies (see the comment at the top of lib/markets.ts),
// so it may not be present in node_modules at build time. An ambient declaration
// keeps `npm run build` honest either way, and every field below is read
// defensively at runtime because none of them has been verified against a real
// response from this repo.
//
// Fields are optional on purpose. The mapper in lib/markets.ts reads each one
// through a candidate key list and drops any market it cannot map, so a shape
// that does not match this declaration degrades one window rather than the read.

declare module "@somnia-chain/markets-sdk" {
  /**
   * One market as the SDK returns it. Every field is optional because this
   * declaration is written from the DreamDEX docs, not from a verified response.
   * lib/markets.ts treats the object as untyped data and validates each field.
   */
  export interface SdkBinaryMarket {
    /** bytes32 market id. May also arrive as `marketId`. */
    id?: string;
    marketId?: string;
    /** Human readable question the window resolves. */
    question?: string;
    title?: string;
    name?: string;
    /** Underlying, "BTC" or "ETH" on the Event Contracts deployment. */
    asset?: string;
    symbol?: string;
    underlying?: string;
    /** Lifecycle code. 1 is Trading, the only state that accepts orders. */
    state?: number;
    status?: number;
    /** Unix seconds, milliseconds, or an ISO string. All three are handled. */
    opensAt?: string | number;
    openTime?: string | number;
    startTime?: string | number;
    locksAt?: string | number;
    lockTime?: string | number;
    closeTime?: string | number;
    endTime?: string | number;
    /** Best ask for each outcome token, scaled by the decimals below. */
    upAsk?: string | number;
    downAsk?: string | number;
    yesPrice?: string | number;
    noPrice?: string | number;
    prices?: { up?: string | number; down?: string | number };
    /** Price scale. Never assumed: a missing value falls back to shape, not to a constant. */
    priceDecimals?: number;
    decimals?: number;
    /** Collateral scale for the depth figure below. */
    collateralDecimals?: number;
    /** Resting depth on the book. */
    liquidity?: string | number;
    liquidityUsd?: string | number;
    depthUsd?: string | number;
    bookDepthUsd?: string | number;
    [key: string]: unknown;
  }

  export interface LoadMarketsOptions {
    chainId?: number;
    rpcUrl?: string;
    /** BinaryMarketsModule address, when the SDK does not resolve it from chainId. */
    address?: string;
  }

  /** Every market the module knows about, binary and otherwise. */
  export function loadMarkets(
    options?: LoadMarketsOptions
  ): Promise<SdkBinaryMarket[]>;

  /** True for a two outcome (up / down) market. The filter Perennis queues on. */
  export function isBinaryMarket(market: unknown): boolean;
}
