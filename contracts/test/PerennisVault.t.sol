// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    PerennisVault tests.

    forge-std is NOT vendored in this repo: contracts/lib does not exist, so any
    import of forge-std breaks `forge build`. These tests therefore use plain
    `require` assertions and no cheatcodes, and the ERC20 and markets module are
    mocked in this same file.

    The one import below is the vault itself. Solidity cannot reference a
    contract declared in another file without it, so a test file with literally
    zero imports could not deploy the thing it tests.

    Both cases below are reachable without cheatcodes:
      - deposit and withdraw touch only the vault and the mock token
      - a plan with stakePerWindow == 0 reverts with BadPlan before the
        reactivity precompile at 0x0100 is ever called
*/

import {PerennisVault} from "../src/PerennisVault.sol";

/// Minimal ERC20. Mints the full supply to its deployer, 6 decimals like tUSDC.
contract MockERC20 {
    string public constant name = "Mock tUSDC";
    string public constant symbol = "tUSDC";
    uint8 public constant decimals = 6;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(uint256 supply) {
        balanceOf[msg.sender] = supply;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "balance");
        require(allowance[from][msg.sender] >= amount, "allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

/// Minimal BinaryMarketsModule. Every market reports lifecycle state 1 (Trading).
contract MockMarkets {
    function marketState(bytes32) external pure returns (uint8) {
        return 1;
    }

    function buy(bytes32, uint8, uint256 maxCost) external pure returns (uint256) {
        return maxCost;
    }

    function redeem(bytes32) external pure returns (uint256) {
        return 0;
    }
}

contract PerennisVaultTest {
    MockERC20 internal token;
    MockMarkets internal markets;
    PerennisVault internal vault;

    uint256 internal constant ONE = 1e6;

    function setUp() public {
        token = new MockERC20(1_000_000 * ONE);
        markets = new MockMarkets();
        // This contract deploys the vault, so this contract is the owner.
        vault = new PerennisVault(address(token), address(markets));
    }

    /// Deposit 200, withdraw 50, the vault holds 150.
    function test_DepositAndWithdraw() public {
        setUp();

        token.approve(address(vault), 200 * ONE);
        vault.deposit(200 * ONE);
        require(vault.balance() == 200 * ONE, "deposit did not credit the balance");

        vault.withdraw(50 * ONE);
        require(vault.balance() == 150 * ONE, "withdraw did not debit the balance");
        require(
            token.balanceOf(address(vault)) == 150 * ONE,
            "token balance and vault balance disagree"
        );
    }

    /// A zero stake is not a plan. BadPlan fires before any external call.
    function test_StartPlanRejectsZeroStake() public {
        setUp();

        token.approve(address(vault), 200 * ONE);
        vault.deposit(200 * ONE);

        PerennisVault.Plan memory p = PerennisVault.Plan({
            direction: 0,
            stakePerWindow: 0,
            windows: 8,
            maxConsecutiveLosses: 2,
            floorBalance: 100 * ONE,
            takeProfit: 320 * ONE
        });
        bytes32[] memory windowIds = new bytes32[](1);
        windowIds[0] = bytes32(uint256(1));

        try vault.startPlan(p, windowIds) {
            require(false, "startPlan accepted a zero stake");
        } catch (bytes memory reason) {
            require(
                bytes4(reason) == PerennisVault.BadPlan.selector,
                "startPlan reverted for the wrong reason"
            );
        }

        require(uint8(vault.status()) == 0, "vault left Idle status after a bad plan");
    }
}
