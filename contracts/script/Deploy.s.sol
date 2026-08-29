// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {PerennisVault} from "../src/PerennisVault.sol";

interface Vm {
    function startBroadcast() external;
    function stopBroadcast() external;
    function envAddress(string calldata name) external view returns (address);
}

// forge-std is not vendored here, so the deployed address is returned from run()
// rather than logged. `forge script` prints the return value.
contract Deploy {
    Vm constant vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);

    /// Reads COLLATERAL_TOKEN and BINARY_MARKETS_MODULE from the environment and
    /// returns the deployed vault address, which forge prints as the run output.
    function run() external returns (PerennisVault vault) {
        address collateral = vm.envAddress("COLLATERAL_TOKEN");
        address markets = vm.envAddress("BINARY_MARKETS_MODULE");

        vm.startBroadcast();
        vault = new PerennisVault(collateral, markets);
        vm.stopBroadcast();
    }
}
