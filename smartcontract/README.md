# FlickShare 

`FlickShare` is a **community movie-review smart contract** with support via ERC20 tokens and anti-spam proof-of-personhood checks using **WorldID**.  
It leverages **Permit2** for signature-based gasless transfers and ensures secure handling of contributions.

---

## 🚀 Features

- ✅ **WorldID Verification** – ensures only unique humans can post reviews, like, or check-in.  
- ✅ **Permit2 Tipping** – supports signature-based token transfers for gasless payments.  
- ✅ **Developer Revenue** – configurable dev fee on all support contributions.  
- ✅ **Like System** – users can like reviews once, verified via WorldID.  
- ✅ **Daily Check-In** – prevents Sybil spam with WorldID nullifiers.  
- ✅ **Safe and Secure** – uses `SafeERC20` and `ReentrancyGuard`.

---

## 📦 Contract Overview

- **Contract Name**: `FlickShare`  
- **Token Standard**: ERC20 tipping token (e.g., WLD)  
- **Frameworks Used**: OpenZeppelin (`Ownable`, `ReentrancyGuard`, `SafeERC20`)  
- **Verification Layer**: WorldID (`IWorldID`, `ByteHasher`)  
- **Signature Transfer**: Permit2 (`ISignatureTransfer`)  

---

## 🔑 Key Variables

| Variable               | Description |
|------------------------|-------------|
| `token`                | ERC20 token used for tipping. |
| `devAddress`           | Developer payout address. |
| `permit2`              | Permit2 contract for signature-based transfers. |
| `worldId`              | WorldID contract for proof-of-personhood checks. |
| `reviewCounter`        | Tracks total number of reviews. |
| `totalDevEarnings`     | Tracks accumulated dev fees. |
| `MIN_FEE_BPS` / `MAX_FEE_BPS` | Min/max dev fee (in basis points, e.g., 5%-20%). |
| `reviews`              | Mapping of reviewId → Review struct. |
| `supporters`           | Tracks contributions to reviews per supporter. |
| `hasLiked`             | Tracks if a user has liked a review. |
| `checkinCount`         | Tracks user daily check-ins. |

---

## 📝 Review Struct

```solidity
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
```



# FlickShareNFT

`FlickShareNFT` is a **World ID–gated ERC-721 NFT smart contract** with randomized token assignment and single mint per verified human.  
It ensures that each eligible wallet can only mint **one unique NFT**, verified through **Worldcoin proof of personhood**.

---

## 🚀 Features

- ✅ **World ID Integration** – users must prove they are a verified human via Worldcoin.
- ✅ **One Mint per User** – each address can mint only once.
- ✅ **Randomized Token IDs** – Fisher–Yates shuffle ensures randomness in token distribution.
- ✅ **Immutable Max Supply** – fixed total supply defined at deployment.
- ✅ **Metadata Support** – configurable `baseTokenURI` for on-chain metadata management.
- ✅ **Owner Controls** – owner can update baseURI if needed.

---

## 📦 Contract Overview

- **Contract Name**: `FlickShareNFT`
- **Base Standard**: ERC-721
- **Frameworks Used**: OpenZeppelin (`Ownable`, `ERC721`, `ReentrancyGuard`)
- **Verification Layer**: Worldcoin (`IWorldID`, `ByteHasher`)

---

## 🔑 Key Variables

| Variable        | Description |
|-----------------|-------------|
| `maxSupply`     | Maximum number of NFTs available (set at deployment, immutable). |
| `baseTokenURI`  | Metadata URI prefix for all NFTs. |
| `totalMinted`   | Counter for how many NFTs have been minted so far. |
| `worldId`       | Reference to the World ID verifier contract. |
| `hasMinted`     | Maps an address to the token ID it minted (if any). |
| `tokenToMetadata` | Maps token IDs to metadata IDs. |
| `nullifierUsed` | Prevents reusing the same Worldcoin proof. |

---

## 🛠 Deployment

Example deployment using **Foundry**:

```bash
forge create src/FlickShareNFT.sol:FlickShareNFT \
  --constructor-args "FlickShare Early Pass" "FSP" "ipfs://Qm.../" 1000 0xWorldIDContractAddress \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL