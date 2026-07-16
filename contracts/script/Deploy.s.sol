// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TitheJar} from "../src/TitheJar.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        TitheJar jar = new TitheJar();
        vm.stopBroadcast();
        console.log("TitheJar deployed at:", address(jar));
    }
}
