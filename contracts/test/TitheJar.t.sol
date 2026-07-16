// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {TitheJar} from "../src/TitheJar.sol";

contract TitheJarTest is Test {
    TitheJar jar;
    address giver = makeAddr("giver");
    address church = makeAddr("church");

    function setUp() public {
        jar = new TitheJar();
        vm.deal(giver, 100 ether);
    }

    function test_SetAside_fillsJar() public {
        vm.prank(giver);
        jar.setAside{value: 3 ether}();
        assertEq(jar.jarBalance(giver), 3 ether);
        assertEq(address(jar).balance, 3 ether);
    }

    function test_Give_fromJar_recordsAndTransfers() public {
        vm.startPrank(giver);
        jar.setAside{value: 5 ether}();
        jar.give(payable(church), 2 ether, "October tithe");
        vm.stopPrank();

        assertEq(jar.jarBalance(giver), 3 ether);
        assertEq(church.balance, 2 ether);
        assertEq(jar.totalGiven(giver), 2 ether);
        assertEq(jar.totalReceived(church), 2 ether);
        assertEq(jar.giftCount(), 1);

        TitheJar.Gift memory g = jar.getGift(0);
        assertEq(g.giver, giver);
        assertEq(g.recipient, church);
        assertEq(g.amount, 2 ether);
        assertEq(g.memo, "October tithe");
    }

    function test_GiveNow_direct() public {
        vm.prank(giver);
        jar.giveNow{value: 1 ether}(payable(church), "spontaneous");
        assertEq(church.balance, 1 ether);
        assertEq(jar.totalGiven(giver), 1 ether);
        assertEq(jar.jarBalance(giver), 0);
        assertEq(jar.giftCount(), 1);
    }

    function test_Withdraw_reclaims() public {
        vm.startPrank(giver);
        jar.setAside{value: 4 ether}();
        jar.withdraw(1 ether);
        vm.stopPrank();
        assertEq(jar.jarBalance(giver), 3 ether);
        assertEq(giver.balance, 100 ether - 3 ether); // net 3 still in jar
    }

    function test_giftsOf_and_recent() public {
        vm.startPrank(giver);
        jar.setAside{value: 10 ether}();
        jar.give(payable(church), 1 ether, "one");
        jar.give(payable(church), 2 ether, "two");
        vm.stopPrank();

        TitheJar.Gift[] memory mine = jar.giftsOf(giver);
        assertEq(mine.length, 2);
        assertEq(mine[0].memo, "one");
        assertEq(mine[1].memo, "two");

        TitheJar.Gift[] memory recent = jar.recentGifts(5);
        assertEq(recent.length, 2);
        assertEq(recent[0].memo, "two"); // newest first
    }

    function test_Give_revertsWhenExceedsJar() public {
        vm.startPrank(giver);
        jar.setAside{value: 1 ether}();
        vm.expectRevert(abi.encodeWithSelector(TitheJar.AmountExceedsJar.selector, 2 ether, 1 ether));
        jar.give(payable(church), 2 ether, "too much");
        vm.stopPrank();
    }

    function test_Give_revertsBadRecipient() public {
        vm.startPrank(giver);
        jar.setAside{value: 1 ether}();
        vm.expectRevert(TitheJar.BadRecipient.selector);
        jar.give(payable(address(0)), 1 ether, "x");
        vm.stopPrank();
    }

    function test_SetAside_revertsZero() public {
        vm.prank(giver);
        vm.expectRevert(TitheJar.NothingSent.selector);
        jar.setAside{value: 0}();
    }

    function test_Reentrancy_blocked() public {
        Reenterer bad = new Reenterer(jar);
        vm.deal(address(this), 10 ether);
        // fund the attacker's jar then have it try to reenter on receive()
        bad.fund{value: 2 ether}();
        vm.expectRevert(); // reentrant give() bubbles up as TransferFailed
        bad.attack(1 ether);
    }
}

/// tries to reenter give() from its receive() hook
contract Reenterer {
    TitheJar public jar;
    bool private hit;

    constructor(TitheJar _jar) {
        jar = _jar;
    }

    function fund() external payable {
        jar.setAside{value: msg.value}();
    }

    function attack(uint256 amount) external {
        jar.give(payable(address(this)), amount, "attack");
    }

    receive() external payable {
        if (!hit) {
            hit = true;
            jar.give(payable(address(this)), 1 wei, "reenter"); // should revert -> Reentrancy
        }
    }
}
