// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IProvider.sol";
import "./IVerification.sol";

abstract contract Verification is ChainlinkClient, Ownable, IVerification {
    using Chainlink for Chainlink.Request;

    enum VerificationStatus { NONE, PENDING, DECLINED, APPROVED }

    mapping(bytes32 => address) private verificationRequests;
    mapping(address => VerificationStatus) private verified;

    IProvider private identityProvider;
    string private chainlinkUrl;
    bytes32 private chainlinkJobId;
    uint256 private chainlinkFee;

    function setupVerification(
        address _provider,
        address _token,
        address _oracle,
        bytes32 _jobId,
        uint256 _fee
    ) public onlyOwner {
        identityProvider = IProvider(_provider);

        setChainlinkToken(_token);
        setChainlinkOracle(_oracle);

        chainlinkUrl = identityProvider.url();
        chainlinkJobId = _jobId;
        chainlinkFee = _fee;
    }

    function isPendingVerification(address _addr) public view returns (bool) {
        return verified[_addr] == VerificationStatus.PENDING;
    }

    function isDeclined(address _addr) public view returns (bool) {
        return verified[_addr] == VerificationStatus.DECLINED;
    }

    function isApproved(address _addr) public view returns (bool) {
        return verified[_addr] == VerificationStatus.APPROVED;
    }

    function _resetVerificationStatus(address _addr) internal {
        delete verified[_addr];
    }

    function verify(address _addr) internal {
        require(address(identityProvider) != address(0), "Verification not set up");

        if (verified[_addr] != VerificationStatus.NONE) {
            return;
        }

        require(identityProvider.isKnown(_addr), "unable to verify unknown wallet");

        Chainlink.Request memory request = buildChainlinkRequest(
            chainlinkJobId,
            address(this),
            this.fulfillVerification.selector
        );

        request.add("method", "GET");
        request.add("url", string(abi.encodePacked(chainlinkUrl, toHexString(_addr))));
        request.add("path", "approved");

        string[] memory headers = new string[](2);
        headers[0] = "X-Verifier";
        headers[1] = toHexString(address(this));
        request.addStringArray("headers", headers);

        bytes32 requestId = sendChainlinkRequest(request, chainlinkFee);

        verificationRequests[requestId] = _addr;
        verified[address(_addr)] = VerificationStatus.PENDING;

        emit Verify(_addr);
    }

    // ChainLink AnyApi callback
    function fulfillVerification(bytes32 _requestId, bool _approved) public recordChainlinkFulfillment(_requestId) {
        require(verificationRequests[_requestId] != address(0), "unknown request id");

        address addr = verificationRequests[_requestId];
        delete verificationRequests[_requestId];

        if (_approved) {
            verified[addr] = VerificationStatus.APPROVED;
            onApproved(addr);
        } else {
            verified[addr] = VerificationStatus.DECLINED;
            onDenied(addr);
        }
    }

    function toHexString(address addr) internal pure returns (string memory) {
        return Strings.toHexString(uint256(uint160(addr)), 20);
    }

    function onApproved(address _addr) internal virtual;
    function onDenied(address _addr) internal virtual;
}
