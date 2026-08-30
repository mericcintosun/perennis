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

    Every case below is reachable without cheatcodes:
      - deposit and withdraw touch only the vault and the mock token
      - a plan with stakePerWindow == 0 reverts with BadPlan before the
        reactivity precompile at 0x0100 is ever called
      - a non owner caller is a second contract declared in this file, so
        testing onlyOwner needs no vm.prank
      - an oversized armNext array reverts before any external call

    The fuzz case bounds its own inputs with a modulo rather than vm.assume,
    for the same reason: there is no cheatcode available to reject a run.

    Phase 5 added the security cases, and one thing had to be solved to write
    them. A successful startPlan calls the reactivity precompile at 0x0100,
    which has no code inside forge, so a high level call to it reverts and no
    test can ever drive the vault into an Active plan through the front door.
    The answer is VaultHarness below: a subclass that adds test only entry
    points and overrides nothing. Every money path exercised through it is
    PerennisVault's own code, unmodified, which is why _enterNext and
    _settleAndRoll are `internal` rather than `private`. They are still absent
    from the ABI and _onEvent is still the only path to them on chain.
*/

import {PerennisVault} from "../src/PerennisVault.sol";

/// Minimal ERC20. Mints the full supply to its deployer, 6 decimals like tUSDC.
///
/// Two test only additions on top of the Phase 1 mock: `mint`, so a mock module
/// can be given collateral to pay out with, and `approveReturnsFalse`, which
/// turns this into one of the tokens that answers false instead of reverting.
/// Both are off by default, so the Phase 1 cases see the token they always saw.
contract MockERC20 {
    string public constant name = "Mock tUSDC";
    string public constant symbol = "tUSDC";
    uint8 public constant decimals = 6;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    bool public approveReturnsFalse;

    constructor(uint256 supply) {
        balanceOf[msg.sender] = supply;
    }

    function setApproveReturnsFalse(bool value) external {
        approveReturnsFalse = value;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        if (approveReturnsFalse) return false;
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
///
/// Three knobs the Phase 5 cases need. `spendBps` is how much of maxCost buy()
/// actually pulls, defaulting to all of it. `redeemReported` and
/// `redeemTransferred` are what redeem() claims to have paid and what it really
/// sends, which the measured delta case sets apart from each other on purpose.
contract MockMarkets {
    MockERC20 public token;
    uint256 public spendBps = 10_000;
    uint256 public redeemReported;
    uint256 public redeemTransferred;

    function setToken(MockERC20 token_) external {
        token = token_;
    }

    function setSpendBps(uint256 bps) external {
        spendBps = bps;
    }

    function setRedeem(uint256 reported, uint256 transferred) external {
        redeemReported = reported;
        redeemTransferred = transferred;
    }

    function marketState(bytes32) external pure returns (uint8) {
        return 1;
    }

    function buy(bytes32, uint8, uint256 maxCost) external returns (uint256) {
        uint256 spend = (maxCost * spendBps) / 10_000;
        if (spend > 0 && address(token) != address(0)) {
            require(token.transferFrom(msg.sender, address(this), spend), "pull failed");
        }
        return spend;
    }

    function redeem(bytes32) external returns (uint256) {
        if (redeemTransferred > 0 && address(token) != address(0)) {
            require(token.transfer(msg.sender, redeemTransferred), "pay failed");
        }
        return redeemReported;
    }
}

/**
 * The vault, plus three doors that exist only so the settlement path can be
 * driven without a reactivity precompile. Nothing here is overridden and no
 * state is added: primePlan writes the same two fields startPlan writes, and
 * the other two are one line calls into the contract's own code.
 */
contract VaultHarness is PerennisVault {
    constructor(address collateral_, address markets_)
        PerennisVault(collateral_, markets_)
    {}

    /// Puts the vault into an Active plan without touching 0x0100.
    function primePlan(Plan calldata p) external {
        plan = p;
        status = Status.Active;
    }

    function setOpenMarket(bytes32 marketId) external {
        openMarketId = marketId;
    }

    function enterNext() external {
        _enterNext();
    }

    function settle(bytes32 marketId, uint8 winningSide) external {
        _settleAndRoll(marketId, winningSide);
    }
}

/// Any address that is not the vault owner. Deployed by the test, so it is a
/// different msg.sender without a cheatcode.
contract NonOwnerCaller {
    function callWithdraw(PerennisVault vault, uint256 amount) external {
        vault.withdraw(amount);
    }
}

contract PerennisVaultTest {
    MockERC20 internal token;
    MockMarkets internal markets;
    VaultHarness internal vault;

    uint256 internal constant ONE = 1e6;
    uint256 internal constant SUPPLY = 1_000_000 * ONE;

    function setUp() public {
        token = new MockERC20(SUPPLY);
        markets = new MockMarkets();
        markets.setToken(token);
        // This contract deploys the vault, so this contract is the owner.
        vault = new VaultHarness(address(token), address(markets));
    }

    /// The plan every security case below runs on. One window of stake, stops
    /// set far enough out that they never fire by accident mid test.
    function _plan(uint256 stake) internal pure returns (PerennisVault.Plan memory) {
        return PerennisVault.Plan({
            direction: 0,
            stakePerWindow: stake,
            windows: 8,
            maxConsecutiveLosses: 2,
            floorBalance: 1 * ONE,
            takeProfit: 10_000 * ONE
        });
    }

    function _oneWindow(bytes32 id) internal pure returns (bytes32[] memory ids) {
        ids = new bytes32[](1);
        ids[0] = id;
    }

    // --- Phase 1 cases, unchanged -----------------------------------------

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

    /**
     * The money path, fuzzed. Whatever pair of numbers comes in, two invariants
     * have to hold after the attempt: the vault's own accounting never goes
     * below zero (an underflow would revert the run), and the token balance the
     * vault actually holds agrees with the balance it thinks it holds.
     *
     * Inputs are bounded by modulo rather than vm.assume, because there is no
     * cheatcode to reject a run here. uint96 is wide enough to cover the whole
     * mock supply and narrow enough that the modulo stays cheap.
     */
    function testFuzz_DepositThenWithdrawNeverExceedsBalance(uint96 deposit_, uint96 withdraw_)
        public
    {
        setUp();

        uint256 amountIn = uint256(deposit_) % (SUPPLY + 1);
        uint256 amountOut = uint256(withdraw_) % (SUPPLY + 1);

        token.approve(address(vault), amountIn);
        vault.deposit(amountIn);
        require(vault.balance() == amountIn, "deposit did not credit the full delta");

        if (amountOut > amountIn) {
            try vault.withdraw(amountOut) {
                require(false, "withdraw paid out more than the balance");
            } catch (bytes memory reason) {
                require(
                    bytes4(reason) == PerennisVault.InsufficientBalance.selector,
                    "withdraw reverted for the wrong reason"
                );
            }
            require(vault.balance() == amountIn, "a rejected withdraw moved the balance");
        } else {
            vault.withdraw(amountOut);
            require(vault.balance() == amountIn - amountOut, "withdraw debited the wrong amount");
        }

        require(
            token.balanceOf(address(vault)) == vault.balance(),
            "token balance and vault balance disagree"
        );
    }

    /// withdraw is onlyOwner. A second contract calling it gets NotOwner.
    function test_WithdrawRejectsNonOwner() public {
        setUp();

        token.approve(address(vault), 200 * ONE);
        vault.deposit(200 * ONE);

        NonOwnerCaller stranger = new NonOwnerCaller();

        try stranger.callWithdraw(vault, 50 * ONE) {
            require(false, "withdraw accepted a caller that is not the owner");
        } catch (bytes memory reason) {
            require(
                bytes4(reason) == PerennisVault.NotOwner.selector,
                "withdraw reverted for the wrong reason"
            );
        }

        require(vault.balance() == 200 * ONE, "a rejected withdraw moved the balance");
    }

    /// armNext is permissionless, so its array is capped. Nine ids is one too many.
    function test_ArmNextRejectsOversizedQueue() public {
        setUp();

        bytes32[] memory windowIds = new bytes32[](9);
        for (uint256 i = 0; i < windowIds.length; i++) {
            windowIds[i] = bytes32(uint256(i + 1));
        }

        try vault.armNext(windowIds) {
            require(false, "armNext accepted an array longer than MAX_QUEUE_ADD");
        } catch (bytes memory reason) {
            require(
                bytes4(reason) == PerennisVault.QueueFull.selector,
                "armNext reverted for the wrong reason"
            );
        }

        require(vault.pendingWindows() == 0, "a rejected armNext still pushed windows");
    }

    // --- Phase 5 security cases, one per finding fixed ---------------------

    /**
     * Finding A, unchecked approve returns. A token that answers false instead
     * of reverting used to leave this vault believing it was approved, and the
     * buy would then fail for a reason nobody could read off the chain. The
     * checked helper turns that into a revert, and a reverted entry opens no
     * position and moves no money.
     */
    function test_ApproveFailureDoesNotOpenAPosition() public {
        setUp();

        token.approve(address(vault), 200 * ONE);
        vault.deposit(200 * ONE);
        vault.armNext(_oneWindow(bytes32(uint256(7))));
        vault.primePlan(_plan(100 * ONE));

        token.setApproveReturnsFalse(true);

        try vault.enterNext() {
            require(false, "the entry went through on an approve that answered false");
        } catch {
            // The revert is the fix. What matters is the state after it.
        }

        require(
            vault.openMarketId() == bytes32(0),
            "a failed approve still recorded an open position"
        );
        require(vault.balance() == 200 * ONE, "a failed approve moved the balance");
        require(vault.pendingWindows() == 1, "a failed approve consumed the queued window");
    }

    /**
     * Finding B, unspent stake is stranded. The stake is a maxCost, so a module
     * that spends half of it leaves the rest sitting as surplus this vault does
     * not count. Every window would leak a little more of it.
     */
    function test_UnspentStakeIsCreditedBack() public {
        setUp();

        markets.setSpendBps(5_000); // spend half of maxCost

        token.approve(address(vault), 200 * ONE);
        vault.deposit(200 * ONE);
        vault.armNext(_oneWindow(bytes32(uint256(7))));
        vault.primePlan(_plan(100 * ONE));

        vault.enterNext();

        require(
            vault.openMarketId() == bytes32(uint256(7)),
            "the entry did not open the queued window"
        );
        // 200 in, 100 taken for the stake, 50 actually spent, 50 credited back.
        require(vault.balance() == 150 * ONE, "the unspent half of the stake was not credited back");
        require(
            token.balanceOf(address(vault)) == vault.balance(),
            "token balance and vault balance disagree after a partial spend"
        );
        require(
            token.allowance(address(vault), address(markets)) == 0,
            "the entry left a standing approval behind"
        );
    }

    /**
     * Finding C, redeem proceeds were trusted rather than measured. The module
     * here reports 500 and transfers 60. Only the 60 that arrived may be
     * credited, otherwise the stop rules fire against a balance the vault does
     * not have.
     */
    function test_RedeemCreditsMeasuredDelta() public {
        setUp();

        token.approve(address(vault), 100 * ONE);
        vault.deposit(100 * ONE);

        token.mint(address(markets), 60 * ONE);
        markets.setRedeem(500 * ONE, 60 * ONE);

        vault.primePlan(_plan(10 * ONE));
        vault.setOpenMarket(bytes32(uint256(9)));

        vault.settle(bytes32(uint256(9)), 0);

        require(
            vault.balance() == 160 * ONE,
            "the roll credited the reported payout instead of the measured one"
        );
        require(
            token.balanceOf(address(vault)) == vault.balance(),
            "token balance and vault balance disagree after a roll"
        );
        require(vault.rollCount() == 1, "the roll was not recorded");
    }

    /**
     * Finding D, startPlan over an open position. It used to reset the queue
     * and enter a new window on top of a live one, which overwrites
     * openMarketId and strands the previous window's outcome tokens: _onEvent
     * only settles the id it is still holding.
     */
    function test_StartPlanRejectsAnActivePlan() public {
        setUp();

        token.approve(address(vault), 200 * ONE);
        vault.deposit(200 * ONE);

        PerennisVault.Plan memory p = _plan(25 * ONE);
        vault.primePlan(p);
        vault.setOpenMarket(bytes32(uint256(3)));

        try vault.startPlan(p, _oneWindow(bytes32(uint256(4)))) {
            require(false, "startPlan overwrote a plan that was still active");
        } catch (bytes memory reason) {
            require(
                bytes4(reason) == PerennisVault.PlanActive.selector,
                "startPlan reverted for the wrong reason"
            );
        }

        require(
            vault.openMarketId() == bytes32(uint256(3)),
            "the rejected startPlan still moved the open position"
        );
        require(uint8(vault.status()) == 1, "the rejected startPlan changed the status");
    }

    /**
     * The escape hatch may only take what the vault is not accounting for. 50
     * of stray collateral goes to the owner, the 200 that `balance` tracks does
     * not move, so an open position stays funded.
     */
    function test_RescueLeavesTrackedBalanceAlone() public {
        setUp();

        token.approve(address(vault), 200 * ONE);
        vault.deposit(200 * ONE);

        token.mint(address(vault), 50 * ONE); // surplus the vault never credited
        uint256 ownerHeld = token.balanceOf(address(this));

        vault.rescue();

        require(vault.balance() == 200 * ONE, "rescue moved the tracked balance");
        require(
            token.balanceOf(address(vault)) == 200 * ONE,
            "rescue took collateral the vault was accounting for"
        );
        require(
            token.balanceOf(address(this)) == ownerHeld + 50 * ONE,
            "rescue did not send the surplus to the owner"
        );
    }

    /// armNext is permissionless, and bytes32(0) is the id _enterNext uses to
    /// mean "queue empty". A zero pushed into the queue is never a market.
    function test_ArmNextRejectsZeroId() public {
        setUp();

        bytes32[] memory windowIds = new bytes32[](2);
        windowIds[0] = bytes32(uint256(1));
        windowIds[1] = bytes32(0);

        try vault.armNext(windowIds) {
            require(false, "armNext accepted a zero market id");
        } catch (bytes memory reason) {
            require(
                bytes4(reason) == PerennisVault.ZeroWindowId.selector,
                "armNext reverted for the wrong reason"
            );
        }

        require(vault.pendingWindows() == 0, "a rejected armNext still pushed windows");
    }
}
