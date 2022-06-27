pragma solidity ^0.8.0;

interface IVerification {
    event Verify(address indexed wallet);

    function isPendingVerification(address _addr) public view returns (bool);
    function isDeclined(address _addr) public view returns (bool);
    function isApproved(address _addr) public view returns (bool);
}
