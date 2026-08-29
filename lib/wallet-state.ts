// The wallet state machine, as data.
//
// Eight members and no more. Every screen that touches the write path renders
// one of these and nothing else, so there is no second place where "connecting"
// is a boolean and no third place where a pending transaction is a timeout.
//
// Two rules the union enforces by shape rather than by convention:
//
//   1. `hint` is one sentence written by us. A provider message never reaches
//      it. Those strings carry RPC URLs and sometimes request bodies, the same
//      reason lib/errors.ts classifies by shape and not by text.
//   2. A hash exists only where a transaction was actually broadcast, so a
//      branch cannot link to an explorer page for something that was never sent.
//
// This file imports nothing. It is reachable from a client component and has to
// stay that cheap.

/** A 20 byte EVM address. Declared locally so this file needs no viem import. */
export type EvmAddress = `0x${string}`;

/** A 32 byte transaction hash. */
export type TxHash = `0x${string}`;

export type WalletState =
  /** No injected provider, or the user has not connected one yet. */
  | { kind: "disconnected"; hint?: string }
  /** eth_requestAccounts is open. The wallet is showing its own dialog. */
  | { kind: "connecting" }
  /** Connected, but on the wrong chain. Carries what the wallet reported. */
  | { kind: "wrong-network"; address: EvmAddress; chainId: number }
  /** Connected, right chain, nothing in flight. The normal resting state. */
  | { kind: "idle"; address: EvmAddress }
  /** Broadcast, waiting for TX_CONFIRMATIONS. */
  | { kind: "tx-pending"; address: EvmAddress; hash: TxHash; label: string }
  /** Confirmed. The console reads the chain back from here. */
  | { kind: "tx-confirmed"; address: EvmAddress; hash: TxHash; label: string }
  /** The user closed the wallet. Nothing was sent, so there is no hash. */
  | { kind: "tx-rejected"; address: EvmAddress; hint: string }
  /** Sent and reverted, or the node never answered. */
  | { kind: "tx-failed"; address: EvmAddress; hint: string };

export type WalletStateKind = WalletState["kind"];

/**
 * True while the wallet is doing something the user must not be able to start a
 * second transaction on top of. Every submit control on the write path binds its
 * `disabled` to this, never to a timer.
 */
export function isBusy(state: WalletState): boolean {
  return state.kind === "connecting" || state.kind === "tx-pending";
}

/** True when a transaction can actually be sent right now. */
export function canSend(state: WalletState): state is Extract<
  WalletState,
  { kind: "idle" | "tx-confirmed" | "tx-rejected" | "tx-failed" }
> {
  return (
    state.kind === "idle" ||
    state.kind === "tx-confirmed" ||
    state.kind === "tx-rejected" ||
    state.kind === "tx-failed"
  );
}

/** The connected address, where the state carries one. */
export function walletAddress(state: WalletState): EvmAddress | null {
  return "address" in state ? state.address : null;
}

/** Short label for the state, used in badges and aria copy. */
export function walletStateLabel(state: WalletState): string {
  switch (state.kind) {
    case "disconnected":
      return "Wallet not connected";
    case "connecting":
      return "Waiting on the wallet";
    case "wrong-network":
      return "Wrong network";
    case "idle":
      return "Wallet ready";
    case "tx-pending":
      return "Transaction pending";
    case "tx-confirmed":
      return "Transaction confirmed";
    case "tx-rejected":
      return "You closed the wallet";
    case "tx-failed":
      return "Transaction failed";
  }
}
