"use client";

// The write client.
//
// This and lib/abi.ts are the only two client reachable modules allowed to
// import viem (the Phase 3 fence lift, recorded in CLAUDE.md). lib/dreamdex.ts
// stays server only and nothing under components/ imports it.
//
// Five rules this module holds to:
//
//   1. Nothing throws out of it. Every exported function returns a WalletState,
//      a call list or null. A rejected wallet dialog is a state, not an
//      exception, because it is the most ordinary thing a user can do.
//   2. Provider strings are never passed through. Error code 4001 becomes
//      "you closed the wallet"; everything else goes through classify() in
//      lib/errors.ts and gets a sentence written by us. Same rule Phase 2 set
//      for the read path.
//   3. Decimals are read off the chain and passed in. There is no hardcoded 6
//      and no hardcoded 18 anywhere below. A constant that happens to be right
//      on testnet misprices every order on mainnet.
//   4. Every transaction goes out through withIdempotency(), so a double click
//      or a re-render cannot broadcast the same call twice.
//   5. The console decides whether to call any of this. When VAULT_ADDRESS is
//      empty the screen stays on its local path and says so.

import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  encodeFunctionData,
  http,
  parseEther,
  parseUnits,
} from "viem";
import {
  erc20Abi,
  perennisVaultWriteAbi,
} from "@/lib/abi";
import {
  CHAIN_ID,
  COLLATERAL_TOKEN,
  EXPLORER_URL,
  MAX_QUEUE_ADD,
  RPC_URL,
  SUBSCRIPTION_FUNDING_STT,
  TX_CONFIRMATIONS,
  VAULT_ADDRESS,
} from "@/lib/config";
import { classify } from "@/lib/errors";
import type { EvmAddress, TxHash, WalletState } from "@/lib/wallet-state";

// --- the injected provider ----------------------------------------------

/**
 * The slice of EIP-1193 this app uses. Written out rather than pulled from a
 * wallet library, because adding one would be a new dependency and this is four
 * methods.
 */
interface Eip1193Provider {
  request(args: {
    method: string;
    params?: readonly unknown[];
  }): Promise<unknown>;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

function provider(): Eip1193Provider | null {
  if (typeof window === "undefined") return null;
  return window.ethereum ?? null;
}

/**
 * The chain object the wallet client is built against. Defined here rather than
 * imported from lib/dreamdex.ts, which is server only: importing it would pull
 * the fixtures and the whole read layer into the browser bundle. The values come
 * from lib/config.ts, so the two definitions cannot drift.
 */
const shannon = defineChain({
  id: CHAIN_ID,
  name: "Somnia Shannon Testnet",
  nativeCurrency: { name: "Somnia Test Token", symbol: "STT", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: { default: { name: "Shannon Explorer", url: EXPLORER_URL } },
});

/** True when the write path has somewhere to send a transaction. */
export function isWriteConfigured(): boolean {
  return Boolean(VAULT_ADDRESS);
}

// --- calls ---------------------------------------------------------------

/**
 * Every transaction this app can send, as a closed union. A union rather than a
 * loose `{ abi, functionName, args }` bag so the encoder is exhaustively typed:
 * a wrong argument order is a compile error and not a revert on camera.
 */
export type VaultCall =
  | { kind: "approve"; spender: EvmAddress; amount: bigint }
  | { kind: "deposit"; amount: bigint }
  | {
      kind: "startPlan";
      plan: PlanTuple;
      windowIds: readonly TxHash[];
      value: bigint;
    }
  | { kind: "armNext"; windowIds: readonly TxHash[] }
  | { kind: "halt" }
  | { kind: "withdraw"; amount: bigint };

/** The Plan struct, in the contract's field order. */
export interface PlanTuple {
  direction: number;
  stakePerWindow: bigint;
  windows: number;
  maxConsecutiveLosses: number;
  floorBalance: bigint;
  takeProfit: bigint;
}

/** The plan builder fields lib/schemas.ts parses before any of this runs. */
export interface PlanFormValues {
  deposit: number;
  stakePerWindow: number;
  windows: number;
  maxConsecutiveLosses: number;
  floorBalance: number;
  takeProfit: number;
  direction: "UP" | "DOWN";
}

interface EncodedCall {
  to: EvmAddress;
  data: TxHash;
  value: bigint;
  /** Function name, used in the idempotency key and in the pending label. */
  functionName: string;
}

/** Human label for a call, shown while it is pending. */
export function callLabel(call: VaultCall): string {
  switch (call.kind) {
    case "approve":
      return "Approving collateral";
    case "deposit":
      return "Depositing collateral";
    case "startPlan":
      return "Writing the plan";
    case "armNext":
      return "Arming windows";
    case "halt":
      return "Halting the plan";
    case "withdraw":
      return "Withdrawing the balance";
  }
}

function encodeCall(call: VaultCall): EncodedCall | null {
  if (call.kind === "approve") {
    if (!COLLATERAL_TOKEN) return null;
    return {
      to: COLLATERAL_TOKEN,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "approve",
        args: [call.spender, call.amount],
      }),
      value: 0n,
      functionName: "approve",
    };
  }

  if (!VAULT_ADDRESS) return null;
  const to = VAULT_ADDRESS;

  switch (call.kind) {
    case "deposit":
      return {
        to,
        data: encodeFunctionData({
          abi: perennisVaultWriteAbi,
          functionName: "deposit",
          args: [call.amount],
        }),
        value: 0n,
        functionName: "deposit",
      };
    case "withdraw":
      return {
        to,
        data: encodeFunctionData({
          abi: perennisVaultWriteAbi,
          functionName: "withdraw",
          args: [call.amount],
        }),
        value: 0n,
        functionName: "withdraw",
      };
    case "halt":
      return {
        to,
        data: encodeFunctionData({
          abi: perennisVaultWriteAbi,
          functionName: "halt",
          args: [],
        }),
        value: 0n,
        functionName: "halt",
      };
    case "armNext":
      return {
        to,
        data: encodeFunctionData({
          abi: perennisVaultWriteAbi,
          functionName: "armNext",
          args: [call.windowIds],
        }),
        value: 0n,
        functionName: "armNext",
      };
    case "startPlan":
      return {
        to,
        data: encodeFunctionData({
          abi: perennisVaultWriteAbi,
          functionName: "startPlan",
          args: [call.plan, call.windowIds],
        }),
        // startPlan is payable and this is what funds the reactivity
        // subscription. A zero here opens a subscription that cannot pay for a
        // roll, which is the one failure the demo cannot recover from on camera.
        value: call.value,
        functionName: "startPlan",
      };
  }
}

// --- connect and network -------------------------------------------------

/**
 * Ask the injected wallet for accounts. No provider is a state, not a throw: a
 * judge opening the deployed URL in a browser with no wallet gets a sentence and
 * a console that still works on its local path.
 */
export async function connectWallet(): Promise<WalletState> {
  const eth = provider();
  if (!eth) {
    return {
      kind: "disconnected",
      hint: "No browser wallet was found. Install one, then reload this page to send transactions.",
    };
  }

  try {
    const accounts = await eth.request({ method: "eth_requestAccounts" });
    const address = firstAddress(accounts);
    if (!address) {
      return {
        kind: "disconnected",
        hint: "The wallet answered without an account. Unlock it and try again.",
      };
    }

    const chainId = await currentChainId(eth);
    if (chainId !== CHAIN_ID) {
      return { kind: "wrong-network", address, chainId };
    }
    return { kind: "idle", address };
  } catch (error) {
    if (isUserRejection(error)) {
      return {
        kind: "disconnected",
        hint: "You closed the wallet, nothing was sent.",
      };
    }
    return {
      kind: "disconnected",
      hint: "The wallet did not answer the connection request. Try again.",
    };
  }
}

/**
 * Move the wallet onto Shannon. A wallet that does not know the chain answers
 * 4902 to the switch, so the add call carries the RPC and explorer from
 * lib/config.ts and the switch is retried through it.
 */
export async function ensureChain(): Promise<WalletState> {
  const eth = provider();
  if (!eth) {
    return {
      kind: "disconnected",
      hint: "No browser wallet was found. Install one, then reload this page to send transactions.",
    };
  }

  const address = await firstConnectedAddress(eth);
  if (!address) {
    return {
      kind: "disconnected",
      hint: "The wallet is locked or has no account connected to this site.",
    };
  }

  const hexChainId = `0x${CHAIN_ID.toString(16)}`;

  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexChainId }],
    });
  } catch (error) {
    // 4902 is "unrecognised chain". Anything else means the user said no, or
    // the wallet refused, and both land back on wrong-network below.
    if (isUnknownChain(error)) {
      try {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: hexChainId,
              chainName: shannon.name,
              nativeCurrency: shannon.nativeCurrency,
              rpcUrls: [RPC_URL],
              blockExplorerUrls: [EXPLORER_URL],
            },
          ],
        });
      } catch {
        return { kind: "wrong-network", address, chainId: await currentChainId(eth) };
      }
    } else {
      return { kind: "wrong-network", address, chainId: await currentChainId(eth) };
    }
  }

  const chainId = await currentChainId(eth);
  if (chainId !== CHAIN_ID) {
    return { kind: "wrong-network", address, chainId };
  }
  return { kind: "idle", address };
}

// --- sending -------------------------------------------------------------

/**
 * Encode, send, wait, and answer with a WalletState. This is the only function
 * in the repo that broadcasts a transaction.
 *
 * The receipt is read through an http client against RPC_URL rather than through
 * the wallet, because an injected provider's polling is not something we can
 * bound and TX_CONFIRMATIONS has to mean the same thing on every wallet.
 *
 * `onPending` fires once, with the tx-pending state, the moment the hash exists.
 * Without it a caller could only show a spinner: the hash is what turns the
 * pending strip into an explorer link while the block is still being built.
 */
export async function sendVaultTx(
  call: VaultCall,
  onPending?: (state: WalletState) => void
): Promise<WalletState> {
  const eth = provider();
  if (!eth) {
    return {
      kind: "disconnected",
      hint: "No browser wallet was found. Install one, then reload this page to send transactions.",
    };
  }

  const address = await firstConnectedAddress(eth);
  if (!address) {
    return {
      kind: "disconnected",
      hint: "The wallet is locked or has no account connected to this site.",
    };
  }

  const chainId = await currentChainId(eth);
  if (chainId !== CHAIN_ID) {
    return { kind: "wrong-network", address, chainId };
  }

  const encoded = encodeCall(call);
  if (!encoded) {
    return {
      kind: "tx-failed",
      address,
      hint: "No contract address is configured for this call, so nothing was sent.",
    };
  }

  const label = callLabel(call);
  const key = `${encoded.to}:${encoded.functionName}:${hashArgs(encoded.data + encoded.value.toString())}`;

  return withIdempotency(key, async () => {
    let hash: TxHash;

    try {
      const wallet = createWalletClient({
        account: address,
        chain: shannon,
        transport: custom(eth),
      });
      hash = await wallet.sendTransaction({
        account: address,
        chain: shannon,
        to: encoded.to,
        data: encoded.data,
        value: encoded.value,
      });
    } catch (error) {
      if (isUserRejection(error)) {
        return {
          kind: "tx-rejected",
          address,
          hint: "You closed the wallet, nothing was sent.",
        };
      }
      return {
        kind: "tx-failed",
        address,
        hint: failedHint(error),
      };
    }

    onPending?.({ kind: "tx-pending", address, hash, label });

    try {
      const reader = createPublicClient({
        chain: shannon,
        transport: http(RPC_URL),
      });
      const receipt = await reader.waitForTransactionReceipt({
        hash,
        confirmations: TX_CONFIRMATIONS,
      });
      if (receipt.status !== "success") {
        return {
          kind: "tx-failed",
          address,
          hint: "The transaction was sent but reverted or the node did not answer.",
        };
      }
      return { kind: "tx-confirmed", address, hash, label };
    } catch (error) {
      return { kind: "tx-failed", address, hint: failedHint(error) };
    }
  });
}

/**
 * The duplicate guard. There is no server side write anywhere on the demo path,
 * so an API route level idempotency key would guard nothing: this Map plus the
 * chain nonce is the whole mechanism. A second call arriving while the first is
 * still in flight gets the first promise back and no second transaction is
 * broadcast.
 *
 * Keyed on `${vaultAddress}:${functionName}:${argsHash}`, so two different
 * withdrawals are two transactions and the same withdrawal clicked twice is one.
 * The entry is cleared when the promise settles, so a retry after a failure
 * works normally.
 */
const inFlight = new Map<string, Promise<WalletState>>();

export function withIdempotency(
  key: string,
  run: () => Promise<WalletState>
): Promise<WalletState> {
  const live = inFlight.get(key);
  if (live) return live;

  const started = run().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, started);
  return started;
}

// --- call builders -------------------------------------------------------

/**
 * The vault pulls collateral with transferFrom, so a deposit is one transaction
 * when the standing allowance already covers it and two when it does not. The
 * allowance is read, never assumed: re-approving on every deposit costs the demo
 * a wallet dialog it does not need.
 *
 * `decimals` comes from the token contract through the adapter. Nothing here
 * hardcodes a scale.
 */
export async function depositCalls(
  amount: number,
  decimals: number
): Promise<VaultCall[]> {
  if (!VAULT_ADDRESS || !COLLATERAL_TOKEN) return [];

  // Bound to locals first, the same pattern lib/dreamdex.ts uses: the guard
  // above narrows the imports, but that narrowing does not survive into a
  // callback and viem would see them as possibly undefined.
  const vault = VAULT_ADDRESS;
  const token = COLLATERAL_TOKEN;

  const units = parseUnits(amount.toString(), decimals);
  const calls: VaultCall[] = [];
  const owner = await connectedAddress();

  if (owner) {
    try {
      const reader = createPublicClient({
        chain: shannon,
        transport: http(RPC_URL),
      });
      const allowance = await reader.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "allowance",
        args: [owner, vault],
      });
      if (allowance < units) {
        calls.push({ kind: "approve", spender: vault, amount: units });
      }
    } catch {
      // The allowance read failed, so we cannot prove it is sufficient. Approve
      // rather than send a deposit that reverts on transferFrom.
      calls.push({ kind: "approve", spender: vault, amount: units });
    }
  }

  calls.push({ kind: "deposit", amount: units });
  return calls;
}

/**
 * The one signature DEMO.md step 1 is about. Writes the plan, queues the windows
 * and opens the subscription in a single transaction, with the subscription
 * funding carried as msg.value.
 *
 * The queue is capped at MAX_QUEUE_ADD, which mirrors the constant in
 * PerennisVault.sol: a longer array reverts with QueueFull() rather than being
 * silently truncated on chain.
 */
export function startPlanCall(
  form: PlanFormValues,
  queue: readonly string[],
  decimals: number
): VaultCall | null {
  if (!VAULT_ADDRESS) return null;

  const windowIds = queue.slice(0, MAX_QUEUE_ADD).map(toBytes32);

  return {
    kind: "startPlan",
    plan: {
      direction: form.direction === "UP" ? 0 : 1,
      stakePerWindow: parseUnits(form.stakePerWindow.toString(), decimals),
      windows: form.windows,
      maxConsecutiveLosses: form.maxConsecutiveLosses,
      floorBalance: parseUnits(form.floorBalance.toString(), decimals),
      takeProfit: parseUnits(form.takeProfit.toString(), decimals),
    },
    windowIds,
    value: parseEther(SUBSCRIPTION_FUNDING_STT),
  };
}

/** Refill the queue. Permissionless on the contract, so any wallet can send it. */
export function armNextCall(queue: readonly string[]): VaultCall | null {
  if (!VAULT_ADDRESS) return null;
  return {
    kind: "armNext",
    windowIds: queue.slice(0, MAX_QUEUE_ADD).map(toBytes32),
  };
}

export function haltCall(): VaultCall | null {
  return VAULT_ADDRESS ? { kind: "halt" } : null;
}

export function withdrawCall(
  amount: number,
  decimals: number
): VaultCall | null {
  if (!VAULT_ADDRESS) return null;
  return { kind: "withdraw", amount: parseUnits(amount.toString(), decimals) };
}

// --- helpers -------------------------------------------------------------

/**
 * Seed market ids are written in the shortened form the DreamDEX UI displays.
 * Right padding gets them to a well formed bytes32. Same rule as the read path
 * in lib/dreamdex.ts, duplicated rather than imported because that module is
 * server only.
 */
function toBytes32(id: string): TxHash {
  return `0x${id.replace(/^0x/, "").padEnd(64, "0").slice(0, 64)}` as TxHash;
}

/** FNV-1a over the encoded calldata. Short, stable, and never sent anywhere. */
function hashArgs(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

async function currentChainId(eth: Eip1193Provider): Promise<number> {
  try {
    const raw = await eth.request({ method: "eth_chainId" });
    return typeof raw === "string" ? Number.parseInt(raw, 16) : Number(raw);
  } catch {
    return 0;
  }
}

async function firstConnectedAddress(
  eth: Eip1193Provider
): Promise<EvmAddress | null> {
  try {
    return firstAddress(await eth.request({ method: "eth_accounts" }));
  } catch {
    return null;
  }
}

/** The connected account, when there is one, without opening a wallet dialog. */
export async function connectedAddress(): Promise<EvmAddress | null> {
  const eth = provider();
  if (!eth) return null;
  return firstConnectedAddress(eth);
}

function firstAddress(value: unknown): EvmAddress | null {
  if (!Array.isArray(value)) return null;
  const first = value[0];
  if (typeof first !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(first)) {
    return null;
  }
  return first as EvmAddress;
}

/**
 * EIP-1193 error codes come back on a `code` field. viem wraps the provider
 * error in one or two of its own, so the chain is walked rather than read at the
 * top level. Read by shape and never by message text, the same rule
 * lib/errors.ts holds to.
 */
function errorCode(error: unknown): number | null {
  let node: unknown = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (typeof node !== "object" || node === null) return null;
    const candidate = node as { code?: unknown; cause?: unknown };
    if (typeof candidate.code === "number") return candidate.code;
    node = candidate.cause;
  }
  return null;
}

/** The class name viem gives a rejection, checked alongside the numeric code. */
function hasRejectionName(error: unknown): boolean {
  let node: unknown = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (typeof node !== "object" || node === null) return false;
    const candidate = node as { name?: unknown; cause?: unknown };
    if (candidate.name === "UserRejectedRequestError") return true;
    node = candidate.cause;
  }
  return false;
}

/** 4001: the user closed the wallet. The one code with its own copy. */
function isUserRejection(error: unknown): boolean {
  return errorCode(error) === 4001 || hasRejectionName(error);
}

/** 4902: the wallet has never heard of this chain, so it has to be added. */
function isUnknownChain(error: unknown): boolean {
  return errorCode(error) === 4902;
}

/**
 * Everything that is not a rejection. Classified through the same taxonomy the
 * read path uses, and answered with a sentence written here. The provider's own
 * message is never shown: it carries RPC URLs and sometimes the request body.
 */
function failedHint(error: unknown): string {
  return classify(error) === "upstream-timeout"
    ? "The Shannon RPC did not answer in time, so the result is unknown. Check the explorer before sending it again."
    : "The transaction was sent but reverted or the node did not answer.";
}

/** Explorer link for a hash, so a branch never builds the URL by hand. */
export function txUrl(hash: TxHash): string {
  return `${EXPLORER_URL}/tx/${hash}`;
}
