// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./Verification.sol";

// This demo is an NFT that can only be minted by verified wallets.
// Minted NFTs are initially reserved and unreserved on verification.
contract DemoNFT is ERC721, Ownable, Verification {
    using Counters for Counters.Counter;
    Counters.Counter private tokenIds;

    string private baseURI;

    uint public price = 5000000000000000; // 5 dollar in wei

    constructor(string memory _name, string memory _symbol) ERC721(_name, _symbol) { }

    mapping(address => uint256) private mintedPerWallet;
    mapping(uint256 => address) private reserved;
    mapping(address => uint256[]) private reservedForOwner;
    mapping(uint256 => bool) private mintedToken;

    // When a token is minted verify it using the IdentityProvider.
    // The token is reserved until verification is complete.
    function mint(uint256 id) public payable returns (uint256) {

        require(mintedToken[id] == false, "The token has already been minted.");
        require(reserved[id] == address(0), "The token has already been reserved.");
        require(mintedPerWallet[msg.sender] < 1, "You can only mint one NFT per person.");
        require(price <= msg.value, "Insufficient funds.");

        if (isApproved(msg.sender)) {
            _safeMint(msg.sender, id);
            mintedPerWallet[msg.sender] += 1;
            mintedToken[id] = true;
        } else {
            verify(msg.sender);
            _reserve(msg.sender, id);

        }
        return id;
    }

    // Lock a token. reserved tokens can't be transferred.
    function _reserve(address _owner, uint256 _id) internal {
        reserved[_id] = _owner;
        reservedForOwner[_owner].push(_id);
    }

    function isAvailable(uint256 _id) public view returns (bool) {
        return !_exists(_id) && reserved[_id] != address(0);
    }

    function reservedFor(uint256 _id) external view returns (address) {
        return reserved[_id];
    }

    // Hook from approved verification: unlock the tokens
    function onApproved(address _owner) internal override {
        for (uint256 i = 0; i < reservedForOwner[_owner].length; i++) {
            uint256 id = reservedForOwner[_owner][i];
            delete reserved[id];
            _safeMint(_owner, id);
            mintedPerWallet[_owner] += 1;
            mintedToken[id] = true;
        }

        delete reservedForOwner[_owner];
    }

    function cancelReservation(uint256 _id) public {
        address owner = reserved[_id];
        delete reserved[_id];

        if (reservedForOwner[owner].length == 1) {
            if (reservedForOwner[owner][0] == _id) {
                delete reservedForOwner[owner];
            }
        } else {
            for (uint256 i = 0; i < reservedForOwner[owner].length; i++){
                if (reservedForOwner[owner][i] == _id) {
                    reservedForOwner[owner][i] = reservedForOwner[owner][reservedForOwner[owner].length - 1];
                    reservedForOwner[owner].pop();
                    break;
                }
            }
        }

    }

    // Hook from denied verification
    function onDenied(address _owner) internal override {
        for (uint256 i = 0; i < reservedForOwner[_owner].length; i++) {
            uint256 id = reservedForOwner[_owner][i];
            delete reserved[id];
        }
        delete reservedForOwner[_owner];
    }

    // Don't allow transfer of reserved tokens.
    function _beforeTokenTransfer(address, address, uint256 tokenId) internal override {
        require(reserved[tokenId] == address(0), "Token is lock, please get verified");
    }

    // Display reserved NFT as disabled
    function tokenURI(uint256 _id) public view virtual override returns (string memory uri) {
        uri = super.tokenURI(_id);

        if (reserved[_id] != address(0)) {
            uri = string(abi.encodePacked(uri, ".reserved"));
        }
    }

    // Set the location for the NFT images
    function setBaseURI(string calldata _uri) public onlyOwner {
        baseURI = _uri;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    function setPrice(uint256 _price) external onlyOwner {
        price = _price;
    }
}
