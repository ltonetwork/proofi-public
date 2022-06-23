// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./Verification.sol";

// This demo is an NFT that can only be minted by verified wallets.
// Minted NFTs are initially locked and unlocked on verification.
contract DemoNFT is ERC721, Ownable, Verification {
    using Counters for Counters.Counter;
    Counters.Counter private tokenIds;

    string private baseURI;

    constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) { }

    mapping(uint256 => bool) private locked;
    mapping(address => uint256[]) private lockedForOwner;

    // When a token is minted verify it using the IdentityProvider.
    // The token is locked until verification is complete.
    function mint() public returns (uint256) {
        tokenIds.increment();
        uint256 id = tokenIds.current();

        _safeMint(msg.sender, id);

        if (!isApproved(msg.sender)) {
            verify(msg.sender);
            _lock(id);
        }

        return id;
    }

    // Lock a token. Locked tokens can't be transferred.
    function _lock(uint256 _id) internal {
        locked[_id] = true;
        lockedForOwner[ownerOf(_id)].push(_id);
    }

    // Unlock all tokens of the address.
    function _unlock(address _addr) internal {
        require(lockedForOwner[_addr].length > 0, "No locked tokens");

        if (isApproved(msg.sender)) {
            onApproved(_addr);
        } else {
            _resetVerificationStatus(_addr);
            verify(_addr);
        }
    }

    function unlock() public {
        _unlock(msg.sender);
    }

    function unlockFor(address _addr) public onlyOwner {
        _unlock(_addr);
    }

    function isLocked(uint256 _id) external view returns (bool) {
        return locked[_id];
    }

    // Hook from approved verification: unlock the tokens
    function onApproved(address _owner) internal override {
        for (uint256 i = 0; i < lockedForOwner[_owner].length; i++) {
            uint256 id = lockedForOwner[_owner][i];
            delete locked[id];
        }

        delete lockedForOwner[_owner];
    }

    // Hook from denied verification
    function onDenied(address _owner) internal override {
    }

    // Don't allow transfer of locked tokens.
    function _beforeTokenTransfer(address, address, uint256 tokenId) internal override {
        require(!locked[tokenId], "Token is lock, please get verified");
    }

    // Display locked NFT as disabled
    function tokenURI(uint256 _id) public view virtual override returns (string memory uri) {
        uri = super.tokenURI(_id);

        if (locked[_id]) {
            uri = string(abi.encodePacked(uri, ".locked"));
        }
    }

    // Set the location for the NFT images
    function setBaseURI(string calldata _uri) public onlyOwner {
        baseURI = _uri;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }
}
