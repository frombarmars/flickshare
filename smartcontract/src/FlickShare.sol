// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ISignatureTransfer} from "@periphery/lib/permit2/src/interfaces/ISignatureTransfer.sol";
import {IWorldID} from "./interface/IWorldID.sol";
import {ByteHasher} from "./helper/ByteHasher.sol";

contract FlickShare is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ByteHasher for bytes;

    // FlickShare variables
    IERC20 public immutable token;
    address public devAddress;
    ISignatureTransfer public immutable permit2;
    IWorldID immutable worldId =
        IWorldID(0x17B354dD2595411ff79041f930e491A4Df39A278);
    uint256 public reviewCounter;
    uint256 public totalDevEarnings;

    struct Review {
        uint256 reviewId;
        address reviewer;
        uint256 movieId;
        string reviewText;
        uint8 rating;
        uint256 totalSupport;
        uint256 likeCount;
        uint256 timestamp;
    }

    struct Contribution {
        address supporter;
        uint256 amount;
        uint256 timestamp;
        uint256 reviewId;
    }

    mapping(uint256 => Review) public reviews;
    mapping(uint256 => address[]) public reviewSupporters;
    mapping(uint256 => mapping(address => Contribution)) public supporters;
    mapping(uint256 => mapping(address => bool)) public hasLiked;
    mapping(address => uint256) public checkinCount;

    event Supported(
        uint256 indexed reviewId,
        address indexed supporter,
        uint256 amount,
        uint256 feePercent,
        uint256 devFee,
        uint256 reviewerAmount
    );

    event DevWithdrawn(address indexed dev, uint256 amount);
    event ReviewLiked(
        uint256 indexed reviewId,
        address indexed liker,
        uint256 newLikeCount
    );
    event ReviewAdded(
        address indexed reviewer,
        uint256 indexed movieId,
        uint256 indexed reviewId,
        string reviewText,
        uint256 timestamp,
        uint8 rating
    );
    event CheckinSuccessful(address indexed user);

    constructor(address _token, address _devAddress) Ownable(msg.sender) {
        require(_token != address(0), "token=0");
        require(_devAddress != address(0), "dev=0");
        token = IERC20(_token);
        devAddress = _devAddress;
        permit2 = ISignatureTransfer(
            0x000000000022D473030F116dDEE9F6B43aC78BA3
        );
    }

    function _verifyWorldId(
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof,
        string calldata appId,
        string calldata actionId,
        address signal
    ) internal view {
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
    }

    // FlickShare functions
    function createReview(
        uint256 _movieId,
        string calldata _reviewText,
        uint8 _rating,
        uint256 root,
        address signal,
        uint256 nullifierHash,
        string calldata _appId,
        string calldata _actionId,
        uint256[8] calldata proof
    ) external returns (uint256) {
        require(_rating >= 1 && _rating <= 5, "rating 1-5");
        _verifyWorldId(root, nullifierHash, proof, _appId, _actionId, signal);

        reviewCounter += 1;
        uint256 id = reviewCounter;

        reviews[id] = Review({
            reviewId: id,
            reviewer: msg.sender,
            movieId: _movieId,
            reviewText: _reviewText,
            rating: _rating,
            totalSupport: 0,
            likeCount: 0,
            timestamp: block.timestamp
        });

        emit ReviewAdded(
            msg.sender,
            _movieId,
            id,
            _reviewText,
            block.timestamp,
            _rating
        );

        return id;
    }

    function supportReviewWithPermit(
        uint256 _reviewId,
        uint256 _amount,
        uint256 _feeBps,
        ISignatureTransfer.PermitTransferFrom calldata permit,
        bytes calldata signature
    ) external nonReentrant {
        require(_amount > 0, "amount=0");
        require(_feeBps >= 500 && _feeBps <= 2000, "fee 5%-20%");

        Review storage r = reviews[_reviewId];
        require(r.reviewer != address(0), "review not found");
        require(permit.permitted.token == address(token), "wrong token");
        require(permit.permitted.amount >= _amount, "amount mismatch");

        permit2.permitTransferFrom(
            permit,
            ISignatureTransfer.SignatureTransferDetails({
                to: address(this),
                requestedAmount: _amount
            }),
            msg.sender,
            signature
        );

        uint256 devCut = (_amount * _feeBps) / 10_000;
        uint256 reviewerCut = _amount - devCut;

        Contribution storage c = supporters[_reviewId][msg.sender];
        if (c.amount == 0) {
            reviewSupporters[_reviewId].push(msg.sender);
            c.reviewId = _reviewId;
        }
        c.amount += _amount;
        c.timestamp = block.timestamp;
        c.supporter = msg.sender;

        r.totalSupport += _amount;
        totalDevEarnings += devCut;

        token.safeTransfer(r.reviewer, reviewerCut);

        emit Supported(
            _reviewId,
            msg.sender,
            _amount,
            _feeBps,
            devCut,
            reviewerCut
        );
    }

    function withdrawDev(uint256 _amount) external {
        require(
            msg.sender == devAddress || msg.sender == owner(),
            "not authorized"
        );
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "no earnings");
        require(_amount <= balance, "Insufficient balance");

        token.safeTransfer(devAddress, _amount);
        emit DevWithdrawn(devAddress, _amount);
    }

    function likeReview(
        uint256 _reviewId,
        uint256 root,
        address signal,
        uint256 nullifierHash,
        string calldata _appId,
        string calldata _actionId,
        uint256[8] calldata proof
    ) external {
        _verifyWorldId(root, nullifierHash, proof, _appId, _actionId, signal);
        Review storage r = reviews[_reviewId];
        require(r.reviewer != address(0), "review not found");
        require(!hasLiked[_reviewId][msg.sender], "already liked");

        hasLiked[_reviewId][msg.sender] = true;
        r.likeCount += 1;

        emit ReviewLiked(_reviewId, msg.sender, r.likeCount);
    }

    function checkDaily(
        uint256 root,
        address signal,
        uint256 nullifierHash,
        string calldata _appId,
        string calldata _actionId,
        uint256[8] calldata proof
    ) external {
        _verifyWorldId(root, nullifierHash, proof, _appId, _actionId, signal);
        address user = msg.sender;
        checkinCount[user] += 1;
        emit CheckinSuccessful(user);
    }
}
