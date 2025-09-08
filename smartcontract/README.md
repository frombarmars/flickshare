# 🎬 FlickShare Ecosystem

FlickShare is a **community-driven movie-review + NFT ecosystem** that leverages  
**World ID** for proof-of-personhood, **Permit2** for gasless payments, and **World Chain** for scalability.  

It consists of two core contracts:  

- **FlickShare** → ERC20-powered movie-review platform with anti-Sybil protections.  
- **FlickShareNFT** → World ID–gated NFT contract for unique, one-per-human collectibles.  
- **Reward System (Coming Soon)** 

---

## 🌍 Why World Chain?

FlickShare is **built for World Chain**, the L2 blockchain optimized for **human-first dApps**.  

- ✅ **Low Fees** → reviews, likes, and NFT mints cost near-zero gas.  
- ✅ **Proof-of-Personhood Native** → World ID verification is seamless.  
- ✅ **Scalable & Fair** → prevents spam/Sybil attacks while rewarding real users.  

---

# 📖 FlickShare (Reviews + Contributions)

A **community movie-review smart contract** with token support, anti-spam checks, and future reward integration.  

## 🚀 Features

- ✅ **WorldID Verification** – ensures only verified humans can review, like, or check-in.  
- ✅ **Permit2 Transfers** – supports signature-based token transfers for gasless payments.  
- ✅ **Developer Revenue** – configurable dev fee on all contributions.  
- ✅ **Like System** – each user can like a review once (WorldID enforced).  
- ✅ **Daily Check-In** – anti-Sybil via WorldID nullifiers.  
- ✅ **Safe & Secure** – built with OpenZeppelin libraries.  
- 🟣 **World Chain Native** – designed for low-cost, human-verified transactions on World Chain.  
- ⏳ **Upcoming Reward System** – contributors and reviewers will start earning token rewards (ETA: 2–3 months).  

---

## 📦 Contract Overview

- **Contract Name**: `FlickShare`  
- **Token Standard**: ERC20 (e.g., WLD)  
- **Frameworks Used**: OpenZeppelin (`Ownable`, `ReentrancyGuard`, `SafeERC20`)  
- **Verification Layer**: WorldID (`IWorldID`, `ByteHasher`)  
- **Signature Transfer**: Permit2 (`ISignatureTransfer`)  

---

## 🔑 Key Variables

| Variable               | Description |
|------------------------|-------------|
| `token`                | ERC20 token used for utility. |
| `devAddress`           | Developer payout address. |
| `permit2`              | Permit2 contract for signature-based transfers. |
| `worldId`              | WorldID contract for proof-of-personhood checks. |
| `reviewCounter`        | Tracks total number of reviews. |
| `totalDevEarnings`     | Tracks accumulated dev fees. |
| `MIN_FEE_BPS` / `MAX_FEE_BPS` | Min/max dev fee (e.g., 5%-20%). |
| `reviews`              | Mapping of reviewId → Review struct. |
| `supporters`           | Tracks contributions per supporter. |
| `hasLiked`             | Tracks if a user has liked a review. |
| `checkinCount`         | Tracks user daily check-ins. |

---

# 🎨 FlickShareNFT (World ID–Gated NFTs)

A **World ID–gated ERC-721 NFT collection** where each verified human (1000) can mint **one randomized NFT**.  

## 🚀 Features

- ✅ **World ID Integration** – each mint requires proof of personhood.  
- ✅ **One Mint per Human** – prevents multiple mints per user.  
- ✅ **Randomized Token Assignment** – Fisher–Yates shuffle for fair distribution.  
- ✅ **Immutable Max Supply** – supply is fixed forever at deployment.  
- ✅ **Metadata Support** – configurable `baseTokenURI`.  
- ✅ **Owner Controls** – update `baseTokenURI` if needed.  
- 🟣 **World Chain First-Class** – NFTs are deployed and minted on World Chain for scalability.  
- ⏳ **Host Watch Parties:** Get the ability to host your own mini movie watch parties directly within the app.
- ⏳ **Pioneer Status:** Receive recognition and a badge as a distinguished early supporter of the platform.

---

## 📦 Contract Overview

- **Contract Name**: `FlickShareNFT`  
- **Base Standard**: ERC-721  
- **Frameworks Used**: OpenZeppelin (`Ownable`, `ERC721`, `ReentrancyGuard`)  
- **Verification Layer**: WorldID (`IWorldID`, `ByteHasher`)  

---

## 🔑 Key Variables

| Variable          | Description |
|-------------------|-------------|
| `maxSupply`       | Maximum number of NFTs (immutable). |
| `baseTokenURI`    | Metadata URI prefix. |
| `totalMinted`     | Counter for minted NFTs. |
| `worldId`         | World ID verifier contract reference. |
| `hasMinted`       | Maps address → minted token ID. |
| `tokenToMetadata` | Maps token IDs to metadata IDs. |
| `nullifierUsed`   | Prevents reusing Worldcoin proof. |

---

# 🔮 Upcoming Reward System (ETA: 2–3 Months)

The **Reward System** will introduce new incentives for active community members:  

- 🎁 **On-Chain Distribution** → Earn points for posting reviews, supporting reviews or daily check-ins.  
- 🎁 **Off-Chain Distribution** → Earn points for inviting friends , join us on Social Media.
- 🌍 **World Chain Powered** → Optimized for low fees and verified human-only interactions.  

---

# 🛠 Deployment Example

### FlickShareNFT Deployment (Foundry)

```bash
forge create src/FlickShareNFT.sol:FlickShareNFT \
  --constructor-args "FlickShare Early Pass" "FSP" "ipfs://Qm.../" 1000 0xWorldIDContractAddress \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL
