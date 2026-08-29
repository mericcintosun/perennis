# PerennisVault (Foundry)

One contract, `src/PerennisVault.sol`, with no external imports so it builds with
a bare toolchain. It holds the owner's collateral, the standing plan, the queue of
upcoming market ids, and the settlement handler the Somnia validators call.

## Verify before you deploy

Three things are read from documentation rather than from the chain, and each one
is isolated in its own interface at the top of the file so a mismatch is a one
line fix:

1. `ISomniaReactivity.subscribe` at precompile `0x0000...0100`. Check the
   signature and the 32 SOMI (STT on Shannon) owner balance requirement against
   docs.somnia.network/developer/reactivity/reactivity-onchain.
2. `MARKET_RESOLVED`, currently `keccak256("MarketResolved(bytes32,uint8)")`.
   Pull a real settlement receipt with `cast receipt` and compare topic 0.
3. `IBinaryMarkets.buy`, `.redeem` and `.marketState` on the DreamDEX
   BinaryMarketsModule. Confirm the selectors on the contracts and addresses page
   of docs.dreamdex.io.

## Build

```bash
cd contracts
forge build
```

## Deploy to Shannon testnet

```bash
export RPC_URL=https://dream-rpc.somnia.network
export COLLATERAL_TOKEN=0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E
export BINARY_MARKETS_MODULE=<BinaryMarketsModule address>
export FARM_EVM_PRIVATE_KEY=<testnet key>

forge script script/Deploy.s.sol \
  --rpc-url $RPC_URL \
  --private-key $FARM_EVM_PRIVATE_KEY \
  --broadcast
```

`run()` returns the vault address, which forge prints as the script output. Put it
in `.env.local` as `NEXT_PUBLIC_CONTRACT_ADDRESS` and the console switches from
seed data to live reads with no code change.

## First run on testnet

```bash
# 1. get collateral
cast send $COLLATERAL_TOKEN "faucet(uint256)" 10000000000 \
  --rpc-url $RPC_URL --private-key $FARM_EVM_PRIVATE_KEY

# 2. approve and deposit 200 tUSDC (6 decimals)
cast send $COLLATERAL_TOKEN "approve(address,uint256)" $VAULT 200000000 \
  --rpc-url $RPC_URL --private-key $FARM_EVM_PRIVATE_KEY
cast send $VAULT "deposit(uint256)" 200000000 \
  --rpc-url $RPC_URL --private-key $FARM_EVM_PRIVATE_KEY

# 3. write the plan and fund the subscription in the same call.
#    Plan tuple: (direction, stakePerWindow, windows, maxConsecutiveLosses,
#                 floorBalance, takeProfit)
cast send $VAULT \
  "startPlan((uint8,uint256,uint32,uint32,uint256,uint256),bytes32[])" \
  "(0,25000000,8,2,100000000,320000000)" \
  "[$MARKET_1,$MARKET_2,$MARKET_3]" \
  --value 0.5ether \
  --rpc-url $RPC_URL --private-key $FARM_EVM_PRIVATE_KEY

# 4. read the state back
cast call $VAULT "snapshot()" --rpc-url $RPC_URL
```

Watch the next settlement block on
https://shannon-explorer.somnia.network and confirm the roll transaction was
produced by a validator rather than sent from your wallet. That is the demo.

TESTNET ONLY. The vault has no upgrade path, no pause beyond `halt()`, and has
not been audited.
