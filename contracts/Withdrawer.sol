// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract Withdrawer {

    function withdraw() external {
        require(msg.sender == 0x5d4Da23d08cFCB29009876cbFCE91a3eb961997f, "Not authorized");
        (bool _status,) = payable(0x5d4Da23d08cFCB29009876cbFCE91a3eb961997f).call{value: address(this).balance}("");
        require(_status, "Withdraw failed");
    }
}