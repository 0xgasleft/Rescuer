// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;


import "./Withdrawer.sol";

contract Saver {
    bytes public constant SAVER = "0xgasleft()";
    address public withdrawer;

    function createWithdrawer() external {
        require(msg.sender == 0x5d4Da23d08cFCB29009876cbFCE91a3eb961997f, "Not authorized");
        withdrawer = address(new Withdrawer());
    }
}