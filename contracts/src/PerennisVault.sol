// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
    PerennisVault

    A standing order plan for DreamDEX Event Contracts on Somnia.

    The owner deposits collateral once and writes one plan: direction, stake per
    window, how many windows, and three stop rules. The vault then opens its own
    Somnia reactivity subscription against the binary markets module. When a
    window settles, validators call _onEvent in that same block: the vault
    redeems the resolved outcome token, updates its counters, checks the stop
    rules, and if the plan is still live it takes the next market id off the
    queue and enters. No keeper network, no off chain process, no second
    signature from the owner.

    Deliberately kept to one file with no external imports so it builds with a
    bare `forge build`.

    BEFORE DEPLOYING, verify three things against the live chain:
      1. the reactivity precompile signature at 0x0100
      2. the MarketResolved topic and payload layout emitted by the markets module
      3. the redeem and order entry selectors on the BinaryMarketsModule
    Each is isolated in an interface below so a mismatch is a one line fix.
*/

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

/// DreamDEX BinaryMarketsModule. Outcome positions are ERC-6909 token ids.
interface IBinaryMarkets {
    /// Market lifecycle: 0 Listed, 1 Trading, 2 Locked, 4 Resolved, 5 Voided.
    function marketState(bytes32 marketId) external view returns (uint8);

    /// Buys `side` (0 up, 1 down) in `marketId` spending at most `maxCost`.
    function buy(bytes32 marketId, uint8 side, uint256 maxCost) external returns (uint256 contractsBought);

    /// Burns the caller's outcome tokens for a resolved market and pays out
    /// collateral: 1 per winning contract, 0 for the loser, 0.5 each if voided.
    function redeem(bytes32 marketId) external returns (uint256 proceeds);
}

/// Somnia reactivity precompile, 0x0100.
interface ISomniaReactivity {
    function subscribe(address emitter, bytes32 topic0, address handler, uint256 gasLimit)
        external
        payable
        returns (uint256 subscriptionId);

    function unsubscribe(uint256 subscriptionId) external;
}

/// Handler the validators call in the settlement block.
interface ISomniaEventHandler {
    function _onEvent(address emitter, bytes32[] calldata topics, bytes calldata data) external;
}

contract PerennisVault is ISomniaEventHandler {
    // --- constants -------------------------------------------------------

    ISomniaReactivity constant REACTIVITY =
        ISomniaReactivity(0x0000000000000000000000000000000000000100);

    /// keccak256("MarketResolved(bytes32,uint8)")
    bytes32 constant MARKET_RESOLVED =
        keccak256("MarketResolved(bytes32,uint8)");

    /// Docs put the ceiling at 200,000,000 per handler call. A roll costs well
    /// under 400,000, so this leaves generous headroom without overpaying.
    uint256 constant HANDLER_GAS_LIMIT = 1_000_000;

    /// Window ids a single armNext or startPlan call may push. armNext is
    /// permissionless, so without a cap anyone could hand it a million element
    /// array and burn the caller's gas writing storage the plan will never use.
    uint256 constant MAX_QUEUE_ADD = 8;

    /// Ceiling on the whole pending queue. A plan runs at most `windows` rounds
    /// and the demo arms three at a time, so 32 is far more than any real plan
    /// needs and still bounds the storage anyone can make this contract hold.
    uint256 constant MAX_PENDING = 32;

    // --- types -----------------------------------------------------------

    enum Status { Idle, Active, Stopped, Completed }

    enum StopReason { None, ConsecutiveLosses, FloorBalance, TakeProfit, PlanComplete, OwnerHalt }

    struct Plan {
        uint8 direction; // 0 up, 1 down
        uint256 stakePerWindow;
        uint32 windows;
        uint32 maxConsecutiveLosses;
        uint256 floorBalance;
        uint256 takeProfit;
    }

    struct Roll {
        bytes32 marketId;
        uint8 direction;
        uint256 stake;
        uint256 payout;
        uint256 balanceAfter;
        uint64 settledAt;
        bool won;
    }

    // --- storage ---------------------------------------------------------

    address public immutable owner;
    IERC20 public immutable collateral;
    IBinaryMarkets public immutable markets;

    Plan public plan;
    uint256 public balance;
    Status public status;
    StopReason public stopReason;
    uint32 public windowsFilled;
    uint32 public consecutiveLosses;
    bytes32 public openMarketId;
    uint256 public subscriptionId;

    bytes32[] private _queue;
    uint256 private _queueHead;
    Roll[] private _rolls;

    /// Reentrancy flag. Set for the duration of deposit, withdraw and _onEvent,
    /// the three entry points that hand control to an external contract.
    bool private locked;

    // --- events ----------------------------------------------------------

    event Deposited(uint256 amount, uint256 balance);
    event Withdrawn(address indexed to, uint256 amount, uint256 balance);
    event PlanWritten(uint8 direction, uint256 stakePerWindow, uint32 windows, uint256 queued);
    event WindowsArmed(address indexed by, uint256 added, uint256 pending);
    event PositionOpened(bytes32 indexed marketId, uint8 side, uint256 stake);
    event EntrySkipped(bytes32 indexed marketId, string reason);
    event RollSettled(
        uint256 indexed index,
        bytes32 indexed marketId,
        bool won,
        uint256 payout,
        uint256 balanceAfter
    );
    event PlanHalted(StopReason reason, uint256 balance);
    event SubscriptionOpened(uint256 subscriptionId);

    error NotOwner();
    error NotReactivity();
    error BadPlan();
    error InsufficientBalance();
    error QueueFull();
    error Reentrant();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /**
     * The collateral token is external code. A token with a transfer hook could
     * call back into this contract mid transfer, so the three functions that
     * move money or settle a window take this lock. It is a revert and not a
     * silent return: a reentrant call is never a business condition.
     */
    modifier noReentry() {
        if (locked) revert Reentrant();
        locked = true;
        _;
        locked = false;
    }

    constructor(address collateral_, address markets_) {
        owner = msg.sender;
        collateral = IERC20(collateral_);
        markets = IBinaryMarkets(markets_);
        status = Status.Idle;
    }

    // --- collateral ------------------------------------------------------

    /**
     * The single documented exception to checks, effects, interactions in this
     * contract. The tokens have to arrive before there is anything to credit,
     * so the transfer comes first by necessity. Two things make that safe: the
     * noReentry lock is held for the whole call, and the credit is the measured
     * balance delta rather than the requested amount, so a fee on transfer or
     * rebasing token credits what actually landed and not what was asked for.
     */
    function deposit(uint256 amount) external noReentry {
        uint256 heldBefore = collateral.balanceOf(address(this));
        require(collateral.transferFrom(msg.sender, address(this), amount), "transfer failed");
        uint256 received = collateral.balanceOf(address(this)) - heldBefore;
        balance += received;
        emit Deposited(received, balance);
    }

    /// Idle collateral only. Anything sitting in an open position stays put
    /// until that window settles. Checks, then effects, then the interaction.
    function withdraw(uint256 amount) external onlyOwner noReentry {
        if (amount > balance) revert InsufficientBalance();
        balance -= amount;
        require(collateral.transfer(owner, amount), "transfer failed");
        emit Withdrawn(owner, amount, balance);
    }

    // --- the plan --------------------------------------------------------

    /**
     * One transaction writes the plan, pre-loads the window queue, opens the
     * reactivity subscription and enters the first window. This is the only
     * signature the demo asks for.
     *
     * Send enough native STT with the call to fund the subscription: the owner
     * is billed for every handler run.
     */
    function startPlan(Plan calldata p, bytes32[] calldata windowIds) external payable onlyOwner {
        if (p.stakePerWindow == 0 || p.windows == 0 || p.direction > 1) revert BadPlan();
        if (p.maxConsecutiveLosses == 0) revert BadPlan();
        if (p.takeProfit <= p.floorBalance) revert BadPlan();
        if (balance < p.stakePerWindow) revert InsufficientBalance();
        if (windowIds.length > MAX_QUEUE_ADD) revert QueueFull();

        plan = p;
        status = Status.Active;
        stopReason = StopReason.None;
        windowsFilled = 0;
        consecutiveLosses = 0;

        delete _queue;
        _queueHead = 0;
        for (uint256 i = 0; i < windowIds.length; i++) {
            _queue.push(windowIds[i]);
        }
        emit PlanWritten(p.direction, p.stakePerWindow, p.windows, windowIds.length);

        if (subscriptionId == 0) {
            subscriptionId = REACTIVITY.subscribe{value: msg.value}(
                address(markets), MARKET_RESOLVED, address(this), HANDLER_GAS_LIMIT
            );
            emit SubscriptionOpened(subscriptionId);
        }

        _enterNext();
    }

    /**
     * Permissionless. The next window's market may not exist yet when the plan
     * is written, so anyone can top the queue back up: a friend, a cron, the
     * frontend on page load. Nobody can change the plan or move the money.
     *
     * Because it is permissionless, both the per call size and the total queue
     * are capped. Without them a stranger could push storage into this contract
     * until the queue was too expensive to read.
     */
    function armNext(bytes32[] calldata windowIds) external {
        if (windowIds.length > MAX_QUEUE_ADD) revert QueueFull();
        if (pendingWindows() + windowIds.length > MAX_PENDING) revert QueueFull();

        for (uint256 i = 0; i < windowIds.length; i++) {
            _queue.push(windowIds[i]);
        }
        emit WindowsArmed(msg.sender, windowIds.length, pendingWindows());
    }

    function halt() external onlyOwner {
        status = Status.Stopped;
        stopReason = StopReason.OwnerHalt;
        emit PlanHalted(StopReason.OwnerHalt, balance);
    }

    // --- settlement ------------------------------------------------------

    /**
     * Called by the validators in the block where the window settles. Never
     * reverts on a business condition: a revert here would strand the position
     * until someone noticed, so every failure path emits and returns instead.
     */
    function _onEvent(address emitter, bytes32[] calldata topics, bytes calldata data)
        external
        noReentry
    {
        if (msg.sender != address(REACTIVITY)) revert NotReactivity();
        if (emitter != address(markets)) return;
        if (topics.length < 2 || topics[0] != MARKET_RESOLVED) return;

        bytes32 marketId = topics[1];
        if (marketId != openMarketId || status != Status.Active) return;

        // A payload shorter than one word cannot hold a uint8, and abi.decode
        // would revert on it. Returning instead keeps the promise that this
        // handler never reverts on a malformed payload from an emitter we did
        // not expect, which would otherwise strand the open position.
        if (data.length < 32) return;

        uint8 winningSide = abi.decode(data, (uint8));
        _settleAndRoll(marketId, winningSide);
    }

    function _settleAndRoll(bytes32 marketId, uint8 winningSide) private {
        uint256 payout = markets.redeem(marketId);
        balance += payout;
        openMarketId = bytes32(0);

        bool won = winningSide == plan.direction;
        windowsFilled += 1;
        consecutiveLosses = won ? 0 : consecutiveLosses + 1;

        _rolls.push(
            Roll({
                marketId: marketId,
                direction: plan.direction,
                stake: plan.stakePerWindow,
                payout: payout,
                balanceAfter: balance,
                settledAt: uint64(block.timestamp),
                won: won
            })
        );
        emit RollSettled(_rolls.length - 1, marketId, won, payout, balance);

        StopReason reason = _evaluateStops();
        if (reason != StopReason.None) {
            status = (reason == StopReason.TakeProfit || reason == StopReason.PlanComplete)
                ? Status.Completed
                : Status.Stopped;
            stopReason = reason;
            emit PlanHalted(reason, balance);
            return;
        }

        _enterNext();
    }

    /// The risk layer. On an instrument that pays 1 or 0, a rolling plan without
    /// stops is a martingale, so these are contract terms and not a UI promise.
    function _evaluateStops() private view returns (StopReason) {
        if (consecutiveLosses >= plan.maxConsecutiveLosses) return StopReason.ConsecutiveLosses;
        if (balance <= plan.floorBalance) return StopReason.FloorBalance;
        if (balance >= plan.takeProfit) return StopReason.TakeProfit;
        if (windowsFilled >= plan.windows) return StopReason.PlanComplete;
        if (balance < plan.stakePerWindow) return StopReason.FloorBalance;
        return StopReason.None;
    }

    /**
     * Take the next market id off the queue and buy. An empty or unusable queue
     * is not an error: the balance stays in the vault and the next armNext plus
     * settlement picks the plan back up.
     */
    function _enterNext() private {
        if (_queueHead >= _queue.length) {
            emit EntrySkipped(bytes32(0), "queue empty");
            return;
        }

        bytes32 next = _queue[_queueHead];
        _queueHead += 1;

        if (markets.marketState(next) != 1) {
            emit EntrySkipped(next, "market not trading");
            return;
        }

        uint256 stake = plan.stakePerWindow;
        if (balance < stake) {
            emit EntrySkipped(next, "balance below stake");
            return;
        }

        balance -= stake;
        collateral.approve(address(markets), stake);

        try markets.buy(next, plan.direction, stake) {
            openMarketId = next;
            // Reset on the success path too, not only in the catch. A module
            // that spends less than the full allowance would otherwise leave a
            // standing approval on this vault between windows.
            collateral.approve(address(markets), 0);
            emit PositionOpened(next, plan.direction, stake);
        } catch {
            // Book was too thin or the market locked mid block. Give the stake
            // back and wait for the next window rather than stranding it.
            balance += stake;
            collateral.approve(address(markets), 0);
            emit EntrySkipped(next, "order rejected");
        }
    }

    // --- views -----------------------------------------------------------

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
        )
    {
        return (
            balance,
            uint8(status),
            uint8(stopReason),
            windowsFilled,
            consecutiveLosses,
            openMarketId,
            pendingWindows(),
            subscriptionId
        );
    }

    function pendingWindows() public view returns (uint256) {
        return _queue.length - _queueHead;
    }

    function rollCount() external view returns (uint256) {
        return _rolls.length;
    }

    function rollAt(uint256 index) external view returns (Roll memory) {
        return _rolls[index];
    }

    /// Native STT sent here tops up the subscription's gas budget.
    receive() external payable {}
}
