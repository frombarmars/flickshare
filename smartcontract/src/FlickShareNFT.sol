// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IWorldID} from "./IWorldID.sol";
import {ByteHasher} from "./helper/ByteHasher.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract FlickShareNFT is Ownable, ReentrancyGuard, ERC721 {
    using Strings for uint256;
    using ByteHasher for bytes;
    // TestNFT variables
    uint256 public immutable maxSupply;
    string internal baseTokenURI;
    uint256 public totalMinted;
    IWorldID immutable worldId =
        IWorldID(0x17B354dD2595411ff79041f930e491A4Df39A278);

    mapping(address => uint256) public hasMinted;
    mapping(uint256 => uint256) private _matrix;
    mapping(uint256 => uint256) public tokenToMetadata;
    mapping(uint256 => bool) public nullifierUsed;

    event BaseURISet(string newBaseURI);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        uint256 maxSupply_
    ) ERC721(name_, symbol_) Ownable(msg.sender) {
        require(maxSupply_ > 0, "maxSupply=0");
        maxSupply = maxSupply_;
        baseTokenURI = baseURI_;
    }

    function _verifyWorldId(
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof,
        string calldata appId,
        string calldata actionId,
        address signal
    ) internal {
        require(!nullifierUsed[nullifierHash], "nullifier used");
        worldId.verifyProof(
            root,
            1,
            abi.encodePacked(signal).hashToField(),
            nullifierHash,
            abi
                .encodePacked(abi.encodePacked(appId).hashToField(), actionId)
                .hashToField(),
            proof
        );

        nullifierUsed[nullifierHash] = true;
    }

    function mint(
        uint256 root,
        address signal,
        uint256 nullifierHash,
        string calldata _appId,
        string calldata _actionId,
        uint256[8] calldata proof
    ) external {
        _verifyWorldId(root, nullifierHash, proof, _appId, _actionId, signal);

        require(totalMinted < maxSupply, "it is only for first 1000 users");
        require(hasMinted[msg.sender]==0, "already minted");

        uint256 remaining = maxSupply - totalMinted;

        uint256 rand = uint256(
            keccak256(
                abi.encodePacked(
                    msg.sender,
                    block.prevrandao,
                    block.timestamp,
                    remaining
                )
            )
        );
        uint256 idx = rand % remaining;
        uint256 tokenId = _matrixValue(idx);
        hasMinted[msg.sender] = tokenId;
        uint256 lastVal = _matrixValue(remaining - 1);

        _matrix[idx] = lastVal;
        if (_matrix[remaining - 1] != 0) delete _matrix[remaining - 1];

        totalMinted++;
        tokenToMetadata[tokenId] = tokenId;
        _safeMint(msg.sender, tokenId);
    }

    // In your FlickShareWithNFT contract, update the tokenURI function:
    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "nonexistent token");
        uint256 metadataId = tokenToMetadata[tokenId];
        if (metadataId == 0) metadataId = tokenId;
        return
            string(
                abi.encodePacked(baseTokenURI, metadataId.toString(), ".json")
            );
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    function _matrixValue(uint256 i) internal view returns (uint256 v) {
        v = _matrix[i];
        if (v == 0) v = i;
        v = v + 1;
    }

    // NFT functions
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        baseTokenURI = newBaseURI;
        emit BaseURISet(newBaseURI);
    }
}
