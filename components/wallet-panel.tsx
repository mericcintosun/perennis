"use client";

// The wallet strip above the plan builder.
//
// One named branch per WalletState member, eight of them, readable as eight
// functions in this file. Nothing here decides anything: the console owns the
// state and passes the handlers in, so this component is a rendering of the
// union and cannot get out of step with it.
//
// The wrong-network branch renders a real switch action, not a warning
// sentence. A judge on the wrong chain should be one tap from the right one.
//
// Every hint shown here is written by us. A provider message never reaches this
// component, because it never leaves lib/tx.ts.

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { shortHash } from "@/lib/vault";
import {
  isBusy,
  walletStateLabel,
  type EvmAddress,
  type TxHash,
  type WalletState,
} from "@/lib/wallet-state";

interface Props {
  state: WalletState;
  /** Explorer base from lib/config.ts, so no branch builds a URL by hand. */
  explorerBase: string;
  /** False when NEXT_PUBLIC_CONTRACT_ADDRESS is empty and writes stay local. */
  writeConfigured: boolean;
  /** The chain the app expects, shown when the wallet is on another one. */
  expectedChainId: number;
  onConnect: () => void;
  onSwitchNetwork: () => void;
}

export function WalletPanel({
  state,
  explorerBase,
  writeConfigured,
  expectedChainId,
  onConnect,
  onSwitchNetwork,
}: Props) {
  return (
    <div className="mb-6 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              state.kind === "idle" || state.kind === "tx-confirmed"
                ? "bg-primary"
                : state.kind === "tx-pending"
                  ? "bg-primary pulse-dot"
                  : state.kind === "disconnected" || state.kind === "connecting"
                    ? "bg-muted-foreground"
                    : "bg-warning"
            )}
          />
          <p className="text-sm font-medium">{walletStateLabel(state)}</p>
        </div>

        {state.kind === "disconnected" ? (
          <DisconnectedBranch state={state} onConnect={onConnect} />
        ) : state.kind === "connecting" ? (
          <ConnectingBranch />
        ) : state.kind === "wrong-network" ? (
          <WrongNetworkBranch
            state={state}
            expectedChainId={expectedChainId}
            onSwitchNetwork={onSwitchNetwork}
            busy={isBusy(state)}
          />
        ) : state.kind === "idle" ? (
          <IdleBranch state={state} />
        ) : state.kind === "tx-pending" ? (
          <TxPendingBranch state={state} explorerBase={explorerBase} />
        ) : state.kind === "tx-confirmed" ? (
          <TxConfirmedBranch state={state} explorerBase={explorerBase} />
        ) : state.kind === "tx-rejected" ? (
          <TxRejectedBranch state={state} />
        ) : (
          <TxFailedBranch state={state} />
        )}
      </div>

      {writeConfigured ? null : (
        <p className="mt-3 text-xs text-muted-foreground">
          Simulated write, no vault address configured. Set
          NEXT_PUBLIC_CONTRACT_ADDRESS to send these as real transactions.
        </p>
      )}
    </div>
  );
}

// --- the eight branches --------------------------------------------------

function DisconnectedBranch({
  state,
  onConnect,
}: {
  state: Extract<WalletState, { kind: "disconnected" }>;
  onConnect: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="max-w-[42ch] text-xs text-muted-foreground">
        {state.hint ??
          "Connect a wallet to send the deposit and the plan. Reading this page needs nothing."}
      </p>
      <Button size="sm" onClick={onConnect}>
        Connect wallet
      </Button>
    </div>
  );
}

function ConnectingBranch() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-xs text-muted-foreground">
        Approve the connection in your wallet. This page is waiting.
      </p>
      <Button size="sm" disabled>
        Connecting
      </Button>
    </div>
  );
}

function WrongNetworkBranch({
  state,
  expectedChainId,
  onSwitchNetwork,
  busy,
}: {
  state: Extract<WalletState, { kind: "wrong-network" }>;
  expectedChainId: number;
  onSwitchNetwork: () => void;
  busy: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="max-w-[42ch] text-xs text-warning">
        Your wallet is on chain {state.chainId}. Perennis writes to Somnia
        Shannon, chain {expectedChainId}.
      </p>
      <Button size="sm" onClick={onSwitchNetwork} disabled={busy}>
        Switch to Shannon
      </Button>
    </div>
  );
}

function IdleBranch({
  state,
}: {
  state: Extract<WalletState, { kind: "idle" }>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-xs text-muted-foreground">
        Ready to sign. The plan is the only signature the demo asks for.
      </p>
      <AddressBadge address={state.address} />
    </div>
  );
}

function TxPendingBranch({
  state,
  explorerBase,
}: {
  state: Extract<WalletState, { kind: "tx-pending" }>;
  explorerBase: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-xs text-muted-foreground">
        {state.label}. Waiting for the block.
      </p>
      <a
        className="font-mono text-xs underline underline-offset-4 hover:text-foreground"
        href={`${explorerBase}/tx/${state.hash}`}
        target="_blank"
        rel="noreferrer"
      >
        {shortHash(state.hash)}
      </a>
      <AddressBadge address={state.address} />
    </div>
  );
}

function TxConfirmedBranch({
  state,
  explorerBase,
}: {
  state: Extract<WalletState, { kind: "tx-confirmed" }>;
  explorerBase: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-xs text-primary">
        {state.label} landed. The console re-read the vault off the chain.
      </p>
      <ExplorerLink hash={state.hash} explorerBase={explorerBase} />
      <AddressBadge address={state.address} />
    </div>
  );
}

function TxRejectedBranch({
  state,
}: {
  state: Extract<WalletState, { kind: "tx-rejected" }>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Distinct from tx-failed on purpose: nothing was broadcast, so there is
          no hash to look up and nothing to undo. */}
      <p className="max-w-[46ch] text-xs text-muted-foreground">{state.hint}</p>
      <AddressBadge address={state.address} />
    </div>
  );
}

function TxFailedBranch({
  state,
}: {
  state: Extract<WalletState, { kind: "tx-failed" }>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Distinct from tx-rejected: this one may have spent gas, so the copy
          points at the chain rather than at the wallet. */}
      <p className="max-w-[46ch] text-xs text-warning">{state.hint}</p>
      <AddressBadge address={state.address} />
    </div>
  );
}

// --- shared pieces -------------------------------------------------------

function AddressBadge({ address }: { address: EvmAddress }) {
  return (
    <Badge variant="outline" className="font-mono font-normal">
      {shortHash(address, 6)}
    </Badge>
  );
}

function ExplorerLink({
  hash,
  explorerBase,
}: {
  hash: TxHash;
  explorerBase: string;
}) {
  return (
    <a
      className="font-mono text-xs underline underline-offset-4 hover:text-foreground"
      href={`${explorerBase}/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
    >
      {shortHash(hash)}
    </a>
  );
}
