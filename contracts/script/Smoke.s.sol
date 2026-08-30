// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    One safe real interaction with a deployed PerennisVault, so the runner has
    proof transactions to put in EVIDENCE.md without touching the plan.

    What it does, in one broadcast: pull collateral from the tUSDC faucet,
    approve exactly that amount for the vault, deposit it, then read the vault
    balance back out of snapshot() and return it so forge prints it.

    What it deliberately does NOT do: startPlan, withdraw, halt, rescue,
    stopSubscription. A smoke test that can write a plan is a smoke test that
    can spend the demo's collateral into a window nobody is watching.

    Same bare Vm interface pattern as Deploy.s.sol: forge-std is not vendored
    here, so the return value of run() is how a number gets printed.

    Run it with:
      export DEPLOYED_CONTRACT=<the redeployed vault>
      export COLLATERAL_TOKEN=0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E
      forge script script/Smoke.s.sol --rpc-url $RPC_URL \
        --private-key $FARM_EVM_PRIVATE_KEY --broadcast
*/

interface Vm {
    function startBroadcast() external;
    function stopBroadcast() external;
    function envAddress(string calldata name) external view returns (address);
}

/// The slice of the vault this script calls. Deposit is permissionless, so this
/// runs from any funded wallet and not only from the owner.
interface IVault {
    function deposit(uint256 amount) external;

    function snapshot()
        external
        view
        returns (
            uint256 balance_,
            uint8 status_,
            uint8 stopReason_,
            uint32 windowsFilled_,
            uint32 consecutiveLosses_,
            bytes32 openMarketId_,
            uint256 queueLength_,
            uint256 subscriptionId_
        );
}

/// tUSDC on Shannon, which ships a public faucet.
interface IFaucetToken {
    function decimals() external view returns (uint8);
    function approve(address spender, uint256 amount) external returns (bool);
    function faucet(uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

contract Smoke {
    Vm constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    /// Whole units of collateral to move. Small on purpose: this is a proof of
    /// life, not a funding run.
    uint256 constant UNITS = 10;

    function run() external returns (uint256 vaultBalance) {
        address vaultAddress = vm.envAddress("DEPLOYED_CONTRACT");
        address tokenAddress = vm.envAddress("COLLATERAL_TOKEN");

        IVault vault = IVault(vaultAddress);
        IFaucetToken token = IFaucetToken(tokenAddress);

        // Read the scale off the token. tUSDC is 6 decimals on this testnet and
        // 18 on mainnet, and a constant that is right on one is wrong on the
        // other, so nothing here hardcodes either.
        uint256 amount = UNITS * (10 ** uint256(token.decimals()));

        vm.startBroadcast();
        token.faucet(amount);
        require(token.approve(vaultAddress, amount), "approve failed");
        vault.deposit(amount);
        vm.stopBroadcast();

        (vaultBalance,,,,,,,) = vault.snapshot();
    }
}
