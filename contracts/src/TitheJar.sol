// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TitheJar
/// @notice Set aside your tithe onchain as you earn, give it to a cause when you're ready,
///         and keep a permanent, public record of every gift. The chain is the point:
///         an honest, ownerless ledger of giving that no one can quietly edit or delete.
contract TitheJar {
    struct Gift {
        address giver;
        address recipient;
        uint256 amount;
        uint64 timestamp;
        string memo; // e.g. "October tithe" or a cause name
    }

    /// @notice Global, append-only ledger of every gift ever made.
    Gift[] public gifts;

    /// @notice Funds a giver has set aside but not yet given (their "jar").
    mapping(address => uint256) public jarBalance;

    /// @notice Lifetime total a giver has actually given away.
    mapping(address => uint256) public totalGiven;

    /// @notice Lifetime total a recipient/cause has received through TitheJar.
    mapping(address => uint256) public totalReceived;

    mapping(address => uint256[]) private _giftIdsByGiver;

    uint256 private _locked = 1;

    event SetAside(address indexed giver, uint256 amount, uint256 jarBalance);
    event Withdrawn(address indexed giver, uint256 amount, uint256 jarBalance);
    event Given(
        uint256 indexed giftId,
        address indexed giver,
        address indexed recipient,
        uint256 amount,
        string memo
    );

    error NothingSent();
    error BadRecipient();
    error AmountExceedsJar(uint256 requested, uint256 available);
    error TransferFailed();
    error Reentrancy();

    modifier nonReentrant() {
        if (_locked != 1) revert Reentrancy();
        _locked = 2;
        _;
        _locked = 1;
    }

    /// @notice Add MON to your jar — set aside your tithe as you earn it.
    function setAside() external payable {
        if (msg.value == 0) revert NothingSent();
        jarBalance[msg.sender] += msg.value;
        emit SetAside(msg.sender, msg.value, jarBalance[msg.sender]);
    }

    /// @notice Give from your jar to a cause. Records the gift permanently.
    /// @param recipient the cause/church/person receiving the gift
    /// @param amount how much to give (must be <= your jar balance)
    /// @param memo a short label kept forever with the gift
    function give(address payable recipient, uint256 amount, string calldata memo)
        external
        nonReentrant
    {
        if (recipient == address(0)) revert BadRecipient();
        uint256 bal = jarBalance[msg.sender];
        if (amount == 0) revert NothingSent();
        if (amount > bal) revert AmountExceedsJar(amount, bal);

        jarBalance[msg.sender] = bal - amount;
        _record(recipient, amount, memo);

        (bool ok, ) = recipient.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    /// @notice Give directly, right now, without pre-funding your jar.
    function giveNow(address payable recipient, string calldata memo)
        external
        payable
        nonReentrant
    {
        if (recipient == address(0)) revert BadRecipient();
        if (msg.value == 0) revert NothingSent();

        _record(recipient, msg.value, memo);

        (bool ok, ) = recipient.call{value: msg.value}("");
        if (!ok) revert TransferFailed();
    }

    /// @notice Reclaim funds you set aside but haven't given yet (safety valve).
    function withdraw(uint256 amount) external nonReentrant {
        uint256 bal = jarBalance[msg.sender];
        if (amount == 0) revert NothingSent();
        if (amount > bal) revert AmountExceedsJar(amount, bal);

        jarBalance[msg.sender] = bal - amount;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(msg.sender, amount, jarBalance[msg.sender]);
    }

    function _record(address recipient, uint256 amount, string calldata memo) internal {
        uint256 giftId = gifts.length;
        gifts.push(Gift(msg.sender, recipient, amount, uint64(block.timestamp), memo));
        _giftIdsByGiver[msg.sender].push(giftId);
        totalGiven[msg.sender] += amount;
        totalReceived[recipient] += amount;
        emit Given(giftId, msg.sender, recipient, amount, memo);
    }

    // ---- views (make the frontend trivial: no indexer needed) ----

    function giftCount() external view returns (uint256) {
        return gifts.length;
    }

    function getGift(uint256 giftId) external view returns (Gift memory) {
        return gifts[giftId];
    }

    function giftIdsOf(address giver) external view returns (uint256[] memory) {
        return _giftIdsByGiver[giver];
    }

    /// @notice A giver's full history in one call.
    function giftsOf(address giver) external view returns (Gift[] memory list) {
        uint256[] storage ids = _giftIdsByGiver[giver];
        list = new Gift[](ids.length);
        for (uint256 i; i < ids.length; ++i) {
            list[i] = gifts[ids[i]];
        }
    }

    /// @notice The most recent `n` gifts across everyone (community feed).
    function recentGifts(uint256 n) external view returns (Gift[] memory list) {
        uint256 total = gifts.length;
        if (n > total) n = total;
        list = new Gift[](n);
        for (uint256 i; i < n; ++i) {
            list[i] = gifts[total - 1 - i]; // newest first
        }
    }
}
