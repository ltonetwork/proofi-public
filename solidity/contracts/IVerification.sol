// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVerification {
    event Verify(address indexed wallet);

    function isPendingVerification(address _addr) external view returns (bool);
    function isDeclined(address _addr) external view returns (bool);
    function isApproved(address _addr) external view returns (bool);
}
