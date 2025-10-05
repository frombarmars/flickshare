"use client";
import { useState, useEffect } from "react";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import {
  Star,
  ThumbsUp,
  UserPlus,
  X,
  Instagram,
  Facebook,
  Gift,
  Coins,
  CheckCircle,
  Clipboard,
  Mail,
  MessageCircle,
  Twitter,
  XCircle,
  Loader,
  Trophy,
} from "lucide-react";
import FlickShareContractABI from "@/abi/FlickShareContract.json";
import NFTContractABI from "@/abi/NFTContract.json";
import { useWaitForTransactionReceipt } from "@worldcoin/minikit-react";
import client from "@/lib/worldClient";
import Link from "next/link";
import { Discord } from "iconoir-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ENV_VARIABLES } from "@/constants/env_variables";
import { decodeAbiParameters, parseAbiParameters } from "viem";
import {
  checkHowManyUsersMintedNFT,
  getUserMintedNFT,
  isUserMintedNFT,
} from "@/lib/contract_utility/nftUtility";
import { INFTMetadata } from "@/types/interfaces/INFTMetadata";
import Image from "next/image";

interface FormErrors {
  submit?: string;
}

export default function RewardProgram() {
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?.id || "";
  const [transactionId, setTransactionId] = useState<string>("");
  const userWalletAddress = session?.user?.walletAddress || "";
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  // NFT Claim states
  const [nftTransactionId, setNftTransactionId] = useState<string>("");
  const [nftLoading, setNftLoading] = useState(false);
  const [nftErrorMessage, setNftErrorMessage] = useState("");
  const [nftClaimed, setNftClaimed] = useState(false);
  const [nftImage, setNftImage] = useState("/placeholder-nft.png");
  const [nftMetaData, setNftMetadata] = useState<INFTMetadata | null>(null);
  const [showNFTDetails, setShowNFTDetails] = useState(false);

  const [nftTokenId, setNftTokenId] = useState<number | null>(null);
  const [totalMintedUsers, setTotalMintedUsers] = useState<number>(0);
  type CompletedTasks = Record<string, boolean>;

  const [airdropPoints, setAirdropPoints] = useState<number>(0);
  const [completedTasks, setCompletedTasks] = useState<CompletedTasks>({});

  const handleAction = async (action: string) => {
    try {
      const res = await fetch(`/api/points/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (data.ok) {
        setAirdropPoints((prev) => prev + data.points);
        setCompletedTasks((prev) => ({ ...prev, [action]: true }));
      } else {
        alert(data.error || "Failed to complete task.");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    }
  };

  useEffect(() => {
    if (!userId) return;
    const fetchSummary = async () => {
      try {
        const res = await fetch(`/api/points/summary/${userId}`);
        const data = await res.json();
        if (data.ok) {
          setAirdropPoints(data.totalPoints);
          setCompletedTasks(data.completedTasks);
        }
      } catch (err) {
        console.error("Failed to load points summary", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [userId]); // 👈 remove completedTasks and airdropPoints

  useEffect(() => {
    const fetchInviteCode = async () => {
      try {
        const response = await fetch(`/api/invite/${userId}`);
        const data = await response.json();
        if (data.code) {
          setInviteCode(data.code.code);
        }
      } catch (error) {
        console.error("Error fetching invite code:", error);
      }
    };

    if (userId) {
      fetchInviteCode();
    }
  }, [userId]);

  const inviteCodeLink = inviteCode
    ? `https://world.org/mini-app?app_id=${
        ENV_VARIABLES.WORLD_MINIAPP_ID
      }&path=${encodeURIComponent("/?invite=" + inviteCode)}`
    : "";

  // Track tx confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      client: client,
      appConfig: {
        app_id: ENV_VARIABLES.WORLD_MINIAPP_ID,
      },
      transactionId: transactionId,
    });

  const { isLoading: isNftConfirming, isSuccess: isNftConfirmed } =
    useWaitForTransactionReceipt({
      client: client,
      appConfig: {
        app_id: ENV_VARIABLES.WORLD_MINIAPP_ID,
      },
      transactionId: nftTransactionId,
    });

  const dailyCheckIn = async () => {
    setErrors({});
    setSuccessMessage("");

    try {
      setLoading(true);

      // Step 1: Precheck with DB
      const precheck = await fetch(`/api/check-in/precheck/${userId}`, {
        method: "POST",
      });
      const precheckData = await precheck.json();

      if (!precheckData.ok) {
        setErrors({
          submit: precheckData.message || "Already checked in today",
        });
        return;
      }

      // Step 2: Worldcoin Verify
      const userSignal = session?.user?.walletAddress;
      const result = await MiniKit.commandsAsync.verify({
        action: "daily-checkin",
        verification_level: VerificationLevel.Orb,
        signal: userSignal,
      });

      if (result.finalPayload.status === "error") {
        setErrors({ submit: "Verification failed, please try again." });
        return;
      }

      // Step 3: On-chain Transaction
      const proofArray = decodeAbiParameters(
        parseAbiParameters("uint256[8]"),
        result.finalPayload.proof as `0x${string}`
      )[0];

      const { commandPayload, finalPayload } =
        await MiniKit.commandsAsync.sendTransaction({
          transaction: [
            {
              address: ENV_VARIABLES.FLICKSHARE_CONTRACT_ADDRESS,
              abi: FlickShareContractABI,
              functionName: "checkDaily",
              args: [
                result.finalPayload.merkle_root,
                userSignal,
                result.finalPayload.nullifier_hash,
                ENV_VARIABLES.WORLD_MINIAPP_ID,
                "daily-checkin",
                proofArray,
              ],
            },
          ],
        });

      if (finalPayload.status === "error") {
        setErrors({ submit: "Transaction failed, please try again." });
        return;
      }

      setTransactionId(finalPayload.transaction_id);
    } catch (err) {
      console.error("Error during check-in:", err);
      setErrors({ submit: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  // Track check-in tx confirmation
  useEffect(() => {
    const confirmCheckIn = async () => {
      if (!isConfirmed || !userId) return;

      try {
        const confirmRes = await fetch(`/api/check-in/confirm/${userId}`, {
          method: "POST",
        });
        const confirmData = await confirmRes.json();
        await refreshPoints(); // 👈 update points after confirm
        if (confirmData.ok) {
          setSuccessMessage("Daily check-in confirmed!");
          setAirdropPoints(confirmData.totalPoints);
        } else {
          setErrors({ submit: confirmData.message });
        }
      } catch (err) {
        console.error("Error confirming check-in:", err);
        setErrors({ submit: "Something went wrong during confirmation." });
      }
    };

    confirmCheckIn();
  }, [isConfirmed, userId]); // <-- runs only when tx is confirmed

  useEffect(() => {
    if (isNftConfirmed) {
      setNftClaimed(true);
      setNftImage("/api/placeholder/300/400?text=Your+NFT");
    }
  }, [isNftConfirmed]);

  // Replace your dailyCheckIn function with this:

  // Replace your claimNFT function with this:
  const claimNFT = async () => {
    setNftLoading(true);
    setNftErrorMessage("");
    try {
      const result = await MiniKit.commandsAsync.verify({
        action: "claim-nft-action",
        verification_level: VerificationLevel.Orb,
        signal: userWalletAddress,
      });

      if (result.finalPayload.status === "error") {
        throw new Error("Verification failed: " + result.finalPayload.status);
      }

      const proofArray = decodeAbiParameters(
        parseAbiParameters("uint256[8]"),
        result.finalPayload.proof as `0x${string}`
      )[0];

      const { commandPayload, finalPayload } =
        await MiniKit.commandsAsync.sendTransaction({
          transaction: [
            {
              address: ENV_VARIABLES.NFT_CONTRACT_ADDRESS,
              abi: NFTContractABI,
              functionName: "mint",
              args: [
                result.finalPayload.merkle_root,
                userWalletAddress,
                result.finalPayload.nullifier_hash,
                ENV_VARIABLES.WORLD_MINIAPP_ID,
                "claim-nft-action",
                proofArray,
              ],
            },
          ],
        });

      if (finalPayload.status === "error") {
        setNftErrorMessage("NFT claim transaction failed. Please try again.");
      } else {
        setNftTransactionId(finalPayload.transaction_id);
      }
    } catch (err) {
      console.error(err);
      setNftErrorMessage("Something went wrong. Please try again.");
    } finally {
      setNftLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteCodeLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOptions = [
    {
      name: "WhatsApp",
      icon: <MessageCircle className="w-4 h-4" />,
      color: "bg-green-500 hover:bg-green-600",
      share: () => {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(
            `Join me on FlickShare! ${inviteCodeLink}`
          )}`,
          "_blank"
        );
      },
    },
    {
      name: "Telegram",
      icon: <MessageCircle className="w-4 h-4" />,
      color: "bg-blue-400 hover:bg-blue-500",
      share: () => {
        window.open(
          `https://t.me/share/url?url=${encodeURIComponent(
            inviteCodeLink
          )}&text=${encodeURIComponent("Join me on FlickShare!")}`,
          "_blank"
        );
      },
    },
    {
      name: "Twitter",
      icon: <Twitter className="w-4 h-4" />,
      color: "bg-black hover:bg-gray-800",
      share: () => {
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            `Join me on FlickShare! ${inviteCodeLink}`
          )}`,
          "_blank"
        );
      },
    },
    {
      name: "Email",
      icon: <Mail className="w-4 h-4" />,
      color: "bg-gray-600 hover:bg-gray-700",
      share: () => {
        window.open(
          `mailto:?subject=Join me on FlickShare&body=Check out this awesome app: ${inviteCodeLink}`
        );
      },
    },
  ];

  useEffect(() => {
    const checkIfUserMintedNFT = async () => {
      const tokenId: number = await isUserMintedNFT(userWalletAddress);
      if (tokenId > 0) {
        setNftClaimed(true);
        setNftTokenId(tokenId);
      }
    };

    const checkNumsOfUsersMintedNFT = async () => {
      const totalMintedUsers: number = await checkHowManyUsersMintedNFT();
      setTotalMintedUsers(totalMintedUsers);
    };

    if (userWalletAddress) {
      checkIfUserMintedNFT();
      checkNumsOfUsersMintedNFT();
    }
  }, [userWalletAddress]);

  const handleShowNFT = async () => {
    if (!nftTokenId) return;

    setNftLoading(true);
    try {
      const metadata = await getUserMintedNFT(nftTokenId);
      if (metadata) {
        setNftMetadata(metadata);
        setNftImage(metadata.image);
        setShowNFTDetails(true);
      }
    } catch (error) {
      console.error("Error fetching NFT metadata:", error);
      setNftErrorMessage("Failed to load NFT details");
    } finally {
      setNftLoading(false);
    }
  };

  const refreshPoints = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/points/summary/${userId}`);
      const data = await res.json();
      if (data.ok) {
        setAirdropPoints(data.totalPoints);
        setCompletedTasks(data.completedTasks);
      }
    } catch (err) {
      console.error("Failed to refresh points", err);
    }
  };

  return (
    <main className="!w-full !min-h-screen !bg-white !text-gray-900 !overflow-x-hidden">
      {/* Mobile Header */}
      <header className="!bg-white !border-b !border-gray-100 !px-4 !py-4 !sticky !top-0 !z-20 !safe-area-top">
        <div className="!max-w-sm !mx-auto">
          <h1 className="!text-xl !font-bold !text-black !text-center">
            Reward Program
          </h1>
          <div className="!flex !items-center !gap-2 !bg-gray-100 !px-3 !py-1 !rounded-full mt-2">
            <Coins className="!w-4 !h-4 !text-yellow-600" strokeWidth={2} />
            <span className="!font-semibold !text-black">{airdropPoints}</span>
          </div>
        </div>
      </header>

      <div className="max-w-sm mx-auto px-4">
        {/* NFT Claim Section */}
        <section className="pb-6">
          <div className="bg-white border-2 border-yellow-400 rounded-2xl p-6 shadow-lg mb-6 relative overflow-visible animate-pulse-glow">
            {/* ... Limited Edition Badge and other elements ... */}

            {!nftClaimed ? (
              <button
                onClick={claimNFT}
                disabled={nftLoading || isNftConfirming}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-4 rounded-xl hover:from-yellow-600 hover:to-orange-600 active:from-yellow-700 active:to-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-transform relative"
              >
                {nftLoading || isNftConfirming ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    {isNftConfirming ? "Confirming..." : "Claiming NFT..."}
                  </>
                ) : (
                  <>
                    <Gift className="w-5 h-5" />
                    Claim Your NFT Now
                  </>
                )}
              </button>
            ) : showNFTDetails ? (
              <div className="text-center relative z-1">
                <div className="flex justify-center mb-4">
                  <div className="w-64 h-64 max-w-full rounded-2xl overflow-hidden shadow-xl border-4 !border-yellow-400 bg-white hover:scale-105 transition-transform duration-300">
                    <Image
                      width={256}
                      height={256}
                      src={nftImage}
                      alt="NFT"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <h2 className="text-lg font-bold text-black">
                  {nftMetaData?.name || "Your NFT"}
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  {nftMetaData?.description || "Exclusive Early User NFT"}
                </p>
              </div>
            ) : (
              <div className="text-center relative z-1">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="!text-lg !font-bold !text-black">
                  NFT Already Claimed!
                </h2>
                <p className="!text-gray-600 !text-sm !mt-1">
                  Your exclusive Early User NFT is in your wallet
                </p>

                <button
                  onClick={handleShowNFT}
                  disabled={nftLoading}
                  className="!w-full !bg-gradient-to-r !from-blue-500 !to-blue-600 !text-white !p-4 !rounded-xl !hover:from-blue-600 !hover:to-blue-700 !mt-4 flex !items-center !justify-center !gap-2"
                >
                  {nftLoading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Trophy className="w-5 h-5" />
                  )}
                  Show My NFT
                </button>
              </div>
            )}

            {/* ... error message and animations ... */}
          </div>
        </section>

        {/* NFT Claim Section - Added under Airdrop card */}
        <section className="!pb-6">
          <div className="!bg-white !border-2 !border-yellow-400 !rounded-2xl !p-6 !shadow-lg !mb-6 !relative !overflow-visible !animate-pulse-glow">
            {/* Limited Edition Badge - Fixed positioning */}
            <div className="!absolute !-top-3 !-right-3 !bg-yellow-500 !text-black !text-xs font-bold px-3 py-1 rounded-full z-10 rotate-6 shadow-md">
              LIMITED EDITION
            </div>
            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-50/30 to-transparent -skew-x-12 animate-shimmer pointer-events-none"></div>

            <div className="flex items-center mb-5 relative z-1">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center mr-4 shadow-md">
                <Gift className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-black">Early User NFT</h2>
                <p className="text-yellow-700 text-sm font-medium">
                  Limited edition - Only 1,000 available
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6 relative z-1">
              <div className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-xs font-bold text-yellow-700">1</span>
                </div>
                <p className="text-gray-700 text-sm">
                  Host mini movie watch parties
                </p>
              </div>
              <div className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-xs font-bold text-yellow-700">2</span>
                </div>
                <p className="text-gray-700 text-sm">
                  Limited edition merch access
                </p>
              </div>
              <div className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-xs font-bold text-yellow-700">3</span>
                </div>
                <p className="text-gray-700 text-sm">
                  Recognition as early supporter
                </p>
              </div>
            </div>

            <div className="bg-yellow-50 p-3 rounded-lg mb-6 border border-yellow-200 relative">
              <div className="flex justify-between text-xs text-yellow-800 mb-1 font-medium">
                <span>NFTs claimed</span>
                <span>{totalMintedUsers.toString()}/1000</span>
              </div>
              <div className="w-full bg-yellow-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all duration-700"
                  style={{
                    width: `${
                      (BigInt(totalMintedUsers) / BigInt(1000)) * BigInt(100)
                    }%`,
                  }}
                ></div>
              </div>
              <p className="text-yellow-700 text-xs mt-3 font-medium">
                {(BigInt(1000) - BigInt(totalMintedUsers)).toString()}{" "}
                remaining!
              </p>
            </div>

            {!nftClaimed ? (
              <button
                onClick={claimNFT}
                disabled={nftLoading || isNftConfirming}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-4 rounded-xl hover:from-yellow-600 hover:to-orange-600 active:from-yellow-700 active:to-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-transform relative"
              >
                {nftLoading || isNftConfirming ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    {isNftConfirming ? "Confirming..." : "Claiming NFT..."}
                  </>
                ) : (
                  <>
                    <Gift className="w-5 h-5" />
                    Claim Your NFT Now
                  </>
                )}
              </button>
            ) : (
              <div className="!text-center !relative !z-1">
                <div className="!w-16 h-16 !bg-green-100 !rounded-full !flex !items-center !justify-center !mx-auto !mb-3 1shadow-md">
                  <CheckCircle className="!w-10 !h-10 !text-green-600" />
                </div>
                <h2 className="!text-lg !font-bold !text-black">
                  NFT Claimed Successfully!
                </h2>
                <p className="!text-gray-600 !text-sm !mt-1">
                  Your exclusive Early User NFT
                </p>
              </div>
            )}

            {nftErrorMessage && (
              <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-200 flex items-start relative z-1">
                <XCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" />
                <p className="text-red-600 text-sm">{nftErrorMessage}</p>
              </div>
            )}
          </div>

          {/* Animations */}
          <style>{`
                        @keyframes pulse-glow {
                            0% { box-shadow: 0 0 10px rgba(234, 179, 8, 0.3); }
                            50% { box-shadow: 0 0 20px rgba(234, 179, 8, 0.6); }
                            100% { box-shadow: 0 0 10px rgba(234, 179, 8, 0.3); }
                        }
                        @keyframes shimmer {
                            0% { transform: translateX(-100%) skewX(-12deg); }
                            100% { transform: translateX(200%) skewX(-12deg); }
                        }
                        .animate-pulse-glow {
                            animation: pulse-glow 2s ease-in-out infinite;
                        }
                        .animate-shimmer {
                            animation: shimmer 3s ease-in-out infinite;
                        }
                    `}</style>
        </section>

        {/* On-Chain Contributions */}
        <section className="pb-6">
          <h3 className="text-lg font-bold text-black mb-4">
            On-Chain Contributions
          </h3>
          <div className="space-y-3">
            {/* Review a movie */}
            <button
              onClick={() => router.push("/new")}
              className="w-full bg-white border border-gray-200 rounded-2xl p-4 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 group"
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gray-50 group-hover:bg-gray-100 rounded-xl flex items-center justify-center mr-4">
                  <Star className="w-5 h-5 text-gray-700" strokeWidth={2} />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-black text-base mb-1">
                    Review a movie
                  </h4>
                  <p className="text-gray-500 text-sm mb-2">
                    Share your thoughts on the films
                  </p>
                  <div className="flex items-center">
                    <Coins
                      className="w-4 h-4 text-gray-600 mr-1"
                      strokeWidth={2}
                    />
                    <span className="font-semibold text-gray-700 text-sm">
                      10 points
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {/* Support a review */}
            <button
              onClick={() => router.push("/home")}
              className="w-full bg-white border border-gray-200 rounded-2xl p-4 hover:bg-gray-50 active:bg-gray-100 transition-all duration-200 group"
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gray-50 group-hover:bg-gray-100 rounded-xl flex items-center justify-center mr-4">
                  <ThumbsUp className="w-5 h-5 text-gray-700" strokeWidth={2} />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-black text-base mb-1">
                    Support a review
                  </h4>
                  <p className="text-gray-500 text-sm mb-2">
                    Help promote quality content
                  </p>
                  <div className="flex items-center">
                    <Coins
                      className="w-4 h-4 text-gray-600 mr-1"
                      strokeWidth={2}
                    />
                    <span className="font-semibold text-gray-700 text-sm">
                      10 points / 1 WLD
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {/* Daily check-in - Unique style */}
            <button
              className="!w-full !bg-blue-600 !text-white !rounded-2xl !p-5 !shadow-lg !mhover:bg-blue-700 !active:bg-blue-800 !transition-colors !duration-200 !flex !items-center !disabled:opacity-50 !disabled:cursor-not-allowed"
              onClick={dailyCheckIn}
              disabled={loading || isConfirming}
            >
              <div className="!w-12 h-12 !bg-blue-500 !rounded-xl !flex !items-center !justify-center !mr-4">
                <CheckCircle
                  className="!w-6 !h-6 !text-white"
                  strokeWidth={2}
                />
              </div>
              <div className="!flex-1 !text-left">
                <h4 className="!font-semibold !text-white !text-lg !mb-1">
                  Daily Check-in
                </h4>
                <p className="!text-blue-200 !text-sm !mb-2">
                  Earn rewards by checking in daily
                </p>
                <div className="!flex !items-center">
                  <Coins
                    className="!w-5 !h-5 !text-blue-200 !mr-1"
                    strokeWidth={2}
                  />
                  <span className="!font-semibold !text-white !text-sm">
                    5 points
                  </span>
                </div>
              </div>
            </button>

            {/* Messages */}
            {errors.submit && (
              <div className="text-center p-4 bg-red-50 rounded-2xl border border-red-200">
                <p className="text-red-600 text-sm">{errors.submit}</p>
              </div>
            )}

            {successMessage && (
              <div className="text-center p-4 bg-green-50 rounded-2xl border border-green-200">
                <p className="text-green-600 text-sm font-medium">
                  {successMessage}
                </p>
              </div>
            )}
          </div>
          {/* Leaderboard */}
          <div className="mt-3 mb-6">
            <button
              onClick={() => router.push("/leaderboard")}
              className="!w-full !bg-white !border border-gray-300 text-black !py-3 rounded-xl !hover:bg-gray-50 !active:bg-gray-100 transition-all duration-200 !font-semibold !flex !items-center !justify-center !gap-2"
            >
              <Trophy className="!w-4 !h-4" strokeWidth={2} />
              View Full Leaderboard
            </button>
          </div>
        </section>

        {/* Off-Chain Contributions */}
        <section className="pb-8">
          <h3 className="text-lg font-bold text-black mb-4">
            Off-Chain Contributions
          </h3>
          <div className="space-y-3">
            {/* Enhanced Invite a friend section */}
            <div className="w-full bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-2xl p-5">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center mr-4">
                  <UserPlus className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-black text-lg mb-1">
                    Invite a friend
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Earn 50 points for each friend who joins
                  </p>
                </div>
              </div>

              {inviteCodeLink ? (
                <>
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2 font-medium">
                      Your personal invite link:
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 overflow-hidden">
                        <p className="text-sm text-gray-700 truncate">
                          {inviteCodeLink}
                        </p>
                      </div>
                      <button
                        onClick={handleCopyLink}
                        className={`flex items-center justify-center w-12 h-11 rounded-lg ${
                          copied ? "bg-green-500" : "bg-black"
                        } text-white transition-colors`}
                        aria-label="Copy invite link"
                      >
                        {copied ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <Clipboard className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-2 font-medium">
                      Share via:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {shareOptions.map((option, index) => (
                        <button
                          key={index}
                          onClick={option.share}
                          className={`flex items-center justify-center gap-2 py-2 rounded-lg text-white ${option.color} transition-transform hover:scale-105`}
                        >
                          {option.icon}
                          <span className="text-xs">{option.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-pulse flex items-center">
                    <div className="w-4 h-4 bg-purple-400 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-500">
                      Generating your invite link...
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Join our discord */}
            <Link
              href="https://discord.gg/A4KCFGM9ks"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <button
                onClick={() => handleAction("FOLLOW_DISCORD")}
                disabled={!!completedTasks["FOLLOW_DISCORD"]}
                className={`w-full bg-white border border-gray-200 rounded-2xl p-4 transition-all duration-200 group ${
                  completedTasks["FOLLOW_DISCORD"]
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gray-50 group-hover:bg-gray-100 rounded-xl flex items-center justify-center mr-4">
                    <Discord
                      className="w-5 h-5 text-gray-700"
                      strokeWidth={2}
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-semibold text-black text-base mb-1">
                      Join our Discord
                    </h4>
                    <p className="text-gray-500 text-sm mb-2">
                      Join our community discussions
                    </p>
                    <div className="flex items-center">
                      <Coins
                        className="w-4 h-4 text-gray-600 mr-1"
                        strokeWidth={2}
                      />
                      <span className="font-semibold text-gray-700 text-sm">
                        20 points
                      </span>
                    </div>
                  </div>
                  {completedTasks["FOLLOW_DISCORD"] && (
                    <CheckCircle className="w-5 h-5 text-green-500 ml-2" />
                  )}
                </div>
              </button>
            </Link>

            {/* Follow on X */}
            <Link
              href="https://x.com/intent/follow?screen_name=FlickShare_WLD"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <button
                onClick={() => handleAction("FOLLOW_X")}
                disabled={!!completedTasks["FOLLOW_X"]}
                className={`w-full bg-white border border-gray-200 rounded-2xl p-4 transition-all duration-200 group ${
                  completedTasks["FOLLOW_X"]
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gray-50 group-hover:bg-gray-100 rounded-xl flex items-center justify-center mr-4">
                    <X className="w-5 h-5 text-gray-700" strokeWidth={2} />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-semibold text-black text-base mb-1">
                      Follow us on X
                    </h4>
                    <p className="text-gray-500 text-sm mb-2">
                      Stay updated with latest news
                    </p>
                    <div className="flex items-center">
                      <Coins
                        className="w-4 h-4 text-gray-600 mr-1"
                        strokeWidth={2}
                      />
                      <span className="font-semibold text-gray-700 text-sm">
                        20 points
                      </span>
                    </div>
                  </div>
                  {completedTasks["FOLLOW_X"] && (
                    <CheckCircle className="w-5 h-5 text-green-500 ml-2" />
                  )}
                </div>
              </button>
            </Link>

            {/* Follow on Instagram */}
            <Link
              href="https://www.instagram.com/flickshare_on_world/"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <button
                onClick={() => handleAction("FOLLOW_INSTAGRAM")}
                disabled={!!completedTasks["FOLLOW_INSTAGRAM"]}
                className={`w-full bg-white border border-gray-200 rounded-2xl p-4 transition-all duration-200 group ${
                  completedTasks["FOLLOW_INSTAGRAM"]
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gray-50 group-hover:bg-gray-100 rounded-xl flex items-center justify-center mr-4">
                    <Instagram
                      className="w-5 h-5 text-gray-700"
                      strokeWidth={2}
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-semibold text-black text-base mb-1">
                      Follow us on Instagram
                    </h4>
                    <p className="text-gray-500 text-sm mb-2">
                      See behind the scenes content
                    </p>
                    <div className="flex items-center">
                      <Coins
                        className="w-4 h-4 text-gray-600 mr-1"
                        strokeWidth={2}
                      />
                      <span className="font-semibold text-gray-700 text-sm">
                        20 points
                      </span>
                    </div>
                  </div>
                  {completedTasks["FOLLOW_INSTAGRAM"] && (
                    <CheckCircle className="w-5 h-5 text-green-500 ml-2" />
                  )}
                </div>
              </button>
            </Link>

            {/* Follow on Facebook */}
            <Link
              href="fb://profile/697609756776592"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <button
                onClick={() => handleAction("FOLLOW_FACEBOOK")}
                disabled={!!completedTasks["FOLLOW_FACEBOOK"]}
                className={`w-full bg-white border border-gray-200 rounded-2xl p-4 transition-all duration-200 group ${
                  completedTasks["FOLLOW_FACEBOOK"]
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gray-50 group-hover:bg-gray-100 rounded-xl flex items-center justify-center mr-4">
                    <Facebook
                      className="w-5 h-5 text-gray-700"
                      strokeWidth={2}
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className="font-semibold text-black text-base mb-1">
                      Follow us on Facebook
                    </h4>
                    <p className="text-gray-500 text-sm mb-2">
                      Join our community discussions
                    </p>
                    <div className="flex items-center">
                      <Coins
                        className="w-4 h-4 text-gray-600 mr-1"
                        strokeWidth={2}
                      />
                      <span className="font-semibold text-gray-700 text-sm">
                        20 points
                      </span>
                    </div>
                  </div>
                  {completedTasks["FOLLOW_FACEBOOK"] && (
                    <CheckCircle className="w-5 h-5 text-green-500 ml-2" />
                  )}
                </div>
              </button>
            </Link>
          </div>
        </section>
      </div>

      {/* Mobile bottom safe area */}
      <div className="h-20 bg-white"></div>
    </main>
  );
}
