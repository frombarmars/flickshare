"use client";
import { useState, useEffect, useCallback } from "react";
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
  Twitter,
  Loader,
  Trophy,
  ArrowRight,
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
      const data = await fetch(`/api/points/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).then(r => r.json());

      if (data.ok) {
        setAirdropPoints(prev => prev + data.points);
        setCompletedTasks(prev => ({ ...prev, [action]: true }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!userId) return;
    const fetchSummary = async () => {
      try {
        const data = await fetch(`/api/points/summary/${userId}`).then(r => r.json());
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
  }, [userId]);

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

      const userSignal = session?.user?.walletAddress;
      const result = await MiniKit.commandsAsync.verify({
        action: "daily-checkin",
        verification_level: VerificationLevel.Orb,
        signal: userSignal,
      });

      if (result.finalPayload.status === "error") {
        setErrors({ submit: "Verification failed" });
        return;
      }

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
        setErrors({ submit: "Transaction failed" });
        return;
      }

      setTransactionId(finalPayload.transaction_id);
    } catch (err) {
      console.error("Error during check-in:", err);
      setErrors({ submit: "Something went wrong" });
    } finally {
      setLoading(false);
    }
  };

  const refreshPoints = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await fetch(`/api/points/summary/${userId}`).then(r => r.json());
      if (data.ok) {
        setAirdropPoints(data.totalPoints);
        setCompletedTasks(data.completedTasks);
      }
    } catch (err) {
      console.error("Failed to refresh points", err);
    }
  }, [userId]);

  useEffect(() => {
    const confirmCheckIn = async () => {
      if (!isConfirmed || !userId) return;

      try {
        const confirmRes = await fetch(`/api/check-in/confirm/${userId}`, {
          method: "POST",
        });
        const confirmData = await confirmRes.json();
        await refreshPoints();
        if (confirmData.ok) {
          setSuccessMessage("Check-in confirmed!");
          setAirdropPoints(confirmData.totalPoints);
        } else {
          setErrors({ submit: confirmData.message });
        }
      } catch (err) {
        console.error("Error confirming check-in:", err);
        setErrors({ submit: "Confirmation failed" });
      }
    };

    confirmCheckIn();
  }, [isConfirmed, userId, refreshPoints]);

  useEffect(() => {
    if (isNftConfirmed) {
      setNftClaimed(true);
      setNftImage("/api/placeholder/300/400?text=Your+NFT");
    }
  }, [isNftConfirmed]);

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
        setNftErrorMessage("Claim failed");
      } else {
        setNftTransactionId(finalPayload.transaction_id);
      }
    } catch (err) {
      console.error(err);
      setNftErrorMessage("Something went wrong");
    } finally {
      setNftLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteCodeLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
      setNftErrorMessage("Failed to load NFT");
    } finally {
      setNftLoading(false);
    }
  };

  return (
    <main className="!w-full !min-h-screen !bg-[#fafafa] !overflow-x-hidden">
      {/* Header */}
      <header className="!bg-white/80 !backdrop-blur-xl !border-b !border-gray-200/60 !px-4 !py-3 !sticky !top-0 !z-20">
        <h1 className="!text-base !font-semibold !text-gray-900 !text-center">
          Rewards
        </h1>
      </header>

      <div className="!max-w-2xl !mx-auto">
        {/* NFT Claim Section */}
        <section className="!bg-white !border-b !border-gray-100">
          <div className="!p-4 !space-y-4">
            <div className="!flex !items-center !justify-between">
              <div className="!flex !items-center !gap-3">
                <div className="!w-10 !h-10 !bg-gradient-to-br !from-yellow-500 !to-orange-500 !rounded-lg !flex !items-center !justify-center">
                  <Gift className="!w-5 !h-5 !text-white" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="!text-sm !font-semibold !text-gray-900">Early User NFT</h2>
                  <p className="!text-xs !text-gray-500">{totalMintedUsers}/1000 claimed</p>
                </div>
              </div>
              {nftClaimed && (
                <CheckCircle className="!w-5 !h-5 !text-green-600" />
              )}
            </div>

            <div className="!bg-yellow-50 !rounded-lg !p-3 !space-y-2">
              <div className="!w-full !bg-yellow-200 !rounded-full !h-1.5 !overflow-hidden">
                <div
                  className="!bg-gradient-to-r !from-yellow-500 !to-orange-500 !h-1.5 !transition-all"
                  style={{ width: `${(Number(totalMintedUsers) / 1000) * 100}%` }}
                />
              </div>
              <p className="!text-[11px] !text-yellow-800">
                {1000 - Number(totalMintedUsers)} remaining
              </p>
            </div>

            {!nftClaimed ? (
              <button
                onClick={claimNFT}
                disabled={nftLoading || isNftConfirming}
                className="!w-full !bg-gradient-to-r !from-yellow-500 !to-orange-500 !text-white !py-3 !rounded-lg !text-sm !font-medium !transition-all disabled:!opacity-50 disabled:!cursor-not-allowed !flex !items-center !justify-center !gap-2"
              >
                {nftLoading || isNftConfirming ? (
                  <>
                    <Loader className="!w-4 !h-4 !animate-spin" />
                    {isNftConfirming ? "Confirming..." : "Claiming..."}
                  </>
                ) : (
                  <>
                    <Gift className="!w-4 !h-4" />
                    Claim NFT
                  </>
                )}
              </button>
            ) : showNFTDetails && nftMetaData ? (
              <div className="!text-center">
                <Image
                  width={200}
                  height={200}
                  src={nftImage}
                  alt="NFT"
                  className="!w-48 !h-48 !mx-auto !rounded-lg !object-cover !mb-3"
                />
                <h3 className="!text-sm !font-semibold !text-gray-900">{nftMetaData.name}</h3>
                <p className="!text-xs !text-gray-600">{nftMetaData.description}</p>
              </div>
            ) : nftClaimed ? (
              <button
                onClick={handleShowNFT}
                disabled={nftLoading}
                className="!w-full !bg-gray-900 !text-white !py-3 !rounded-lg !text-sm !font-medium !transition-all !flex !items-center !justify-center !gap-2"
              >
                {nftLoading ? (
                  <Loader className="!w-4 !h-4 !animate-spin" />
                ) : (
                  <>
                    <Trophy className="!w-4 !h-4" />
                    View NFT
                  </>
                )}
              </button>
            ) : null}

            {nftErrorMessage && (
              <p className="!text-xs !text-red-600 !text-center">{nftErrorMessage}</p>
            )}
          </div>
        </section>

        {/* On-Chain */}
        <section className="!bg-white !border-b !border-gray-100">
          <div className="!px-4 !py-3 !border-b !border-gray-100">
            <h3 className="!text-sm !font-semibold !text-gray-900">On-Chain</h3>
          </div>
          <div className="!divide-y !divide-gray-100">
            <button
              onClick={() => router.push("/new")}
              className="!w-full !px-4 !py-4 !flex !items-center !gap-3 hover:!bg-gray-50 !transition-colors"
            >
              <div className="!w-10 !h-10 !bg-yellow-100 !rounded-lg !flex !items-center !justify-center">
                <Star className="!w-5 !h-5 !text-yellow-600" strokeWidth={2} />
              </div>
              <div className="!flex-1 !text-left">
                <h4 className="!text-sm !font-medium !text-gray-900">Review</h4>
                <p className="!text-xs !text-gray-600">10 points</p>
              </div>
              <ArrowRight className="!w-4 !h-4 !text-gray-400" />
            </button>

            <button
              onClick={() => router.push("/home")}
              className="!w-full !px-4 !py-4 !flex !items-center !gap-3 hover:!bg-gray-50 !transition-colors"
            >
              <div className="!w-10 !h-10 !bg-green-100 !rounded-lg !flex !items-center !justify-center">
                <ThumbsUp className="!w-5 !h-5 !text-green-600" strokeWidth={2} />
              </div>
              <div className="!flex-1 !text-left">
                <h4 className="!text-sm !font-medium !text-gray-900">Support</h4>
                <p className="!text-xs !text-gray-600">10 points / 1 WLD</p>
              </div>
              <ArrowRight className="!w-4 !h-4 !text-gray-400" />
            </button>

            <button
              onClick={dailyCheckIn}
              disabled={loading || isConfirming}
              className="!w-full !px-4 !py-4 !flex !items-center !gap-3 hover:!bg-gray-50 !transition-colors disabled:!opacity-50"
            >
              <div className="!w-10 !h-10 !bg-blue-100 !rounded-lg !flex !items-center !justify-center">
                <CheckCircle className="!w-5 !h-5 !text-blue-600" strokeWidth={2} />
              </div>
              <div className="!flex-1 !text-left">
                <h4 className="!text-sm !font-medium !text-gray-900">Check-in</h4>
                <p className="!text-xs !text-gray-600">5 points</p>
              </div>
              {loading || isConfirming ? (
                <Loader className="!w-4 !h-4 !text-gray-400 !animate-spin" />
              ) : (
                <ArrowRight className="!w-4 !h-4 !text-gray-400" />
              )}
            </button>
          </div>

          {(errors.submit || successMessage) && (
            <div className="!px-4 !py-3 !border-t !border-gray-100">
              {errors.submit && <p className="!text-xs !text-red-600">{errors.submit}</p>}
              {successMessage && <p className="!text-xs !text-green-600">{successMessage}</p>}
            </div>
          )}

          <div className="!p-4">
            <button
              onClick={() => router.push("/leaderboard")}
              className="!w-full !py-2.5 !bg-gray-900 !text-white !rounded-lg !text-sm !font-medium !flex !items-center !justify-center !gap-2 !transition-all"
            >
              <Trophy className="!w-4 !h-4" />
              Leaderboard
            </button>
          </div>
        </section>

        {/* Off-Chain */}
        <section className="!bg-white !border-b !border-gray-100">
          <div className="!px-4 !py-3 !border-b !border-gray-100">
            <h3 className="!text-sm !font-semibold !text-gray-900">Off-Chain</h3>
          </div>

          {/* Invite */}
          <div className="!p-4 !border-b !border-gray-100">
            <div className="!flex !items-center !gap-3 !mb-3">
              <div className="!w-10 !h-10 !bg-indigo-100 !rounded-lg !flex !items-center !justify-center">
                <UserPlus className="!w-5 !h-5 !text-indigo-600" strokeWidth={2} />
              </div>
              <div className="!flex-1">
                <h4 className="!text-sm !font-medium !text-gray-900">Invite</h4>
                <p className="!text-xs !text-gray-600">50 points per friend</p>
              </div>
            </div>

            {inviteCodeLink && (
              <>
                <div className="!flex !gap-2 !mb-3">
                  <div className="!flex-1 !bg-gray-50 !border !border-gray-200 !rounded-lg !px-3 !py-2">
                    <p className="!text-[11px] !text-gray-700 !truncate !font-mono">
                      {inviteCodeLink}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className={`!w-10 !h-10 !rounded-lg !flex !items-center !justify-center !transition-all ${
                      copied ? "!bg-green-500" : "!bg-gray-900"
                    } !text-white`}
                  >
                    {copied ? (
                      <CheckCircle className="!w-4 !h-4" />
                    ) : (
                      <Clipboard className="!w-4 !h-4" />
                    )}
                  </button>
                </div>

                <button
                  onClick={() => {
                    const text = "Join me on FlickShare!";
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(inviteCodeLink)}`, '_blank');
                  }}
                  className="!w-full !py-2.5 !bg-black !text-white !rounded-lg !text-sm !font-medium !flex !items-center !justify-center !gap-2"
                >
                  <X className="!w-4 !h-4" />
                  Share on X
                </button>
              </>
            )}
          </div>

          {/* Social Links */}
          <div className="!divide-y !divide-gray-100">
            <Link href="https://discord.gg/A4KCFGM9ks" target="_blank">
              <button
                onClick={() => handleAction("FOLLOW_DISCORD")}
                disabled={!!completedTasks["FOLLOW_DISCORD"]}
                className="!w-full !px-4 !py-4 !flex !items-center !gap-3 hover:!bg-gray-50 !transition-colors disabled:!opacity-50"
              >
                <div className="!w-10 !h-10 !bg-indigo-100 !rounded-lg !flex !items-center !justify-center">
                  <Discord className="!w-5 !h-5 !text-indigo-600" strokeWidth={2} />
                </div>
                <div className="!flex-1 !text-left">
                  <h4 className="!text-sm !font-medium !text-gray-900">Discord</h4>
                  <p className="!text-xs !text-gray-600">20 points</p>
                </div>
                {completedTasks["FOLLOW_DISCORD"] ? (
                  <CheckCircle className="!w-5 !h-5 !text-green-600" />
                ) : (
                  <ArrowRight className="!w-4 !h-4 !text-gray-400" />
                )}
              </button>
            </Link>

            <Link href="https://x.com/intent/follow?screen_name=FlickShare_WLD" target="_blank">
              <button
                onClick={() => handleAction("FOLLOW_X")}
                disabled={!!completedTasks["FOLLOW_X"]}
                className="!w-full !px-4 !py-4 !flex !items-center !gap-3 hover:!bg-gray-50 !transition-colors disabled:!opacity-50"
              >
                <div className="!w-10 !h-10 !bg-gray-900 !rounded-lg !flex !items-center !justify-center">
                  <X className="!w-5 !h-5 !text-white" strokeWidth={2} />
                </div>
                <div className="!flex-1 !text-left">
                  <h4 className="!text-sm !font-medium !text-gray-900">X (Twitter)</h4>
                  <p className="!text-xs !text-gray-600">20 points</p>
                </div>
                {completedTasks["FOLLOW_X"] ? (
                  <CheckCircle className="!w-5 !h-5 !text-green-600" />
                ) : (
                  <ArrowRight className="!w-4 !h-4 !text-gray-400" />
                )}
              </button>
            </Link>

            <Link href="https://www.instagram.com/flickshare_on_world/" target="_blank">
              <button
                onClick={() => handleAction("FOLLOW_INSTAGRAM")}
                disabled={!!completedTasks["FOLLOW_INSTAGRAM"]}
                className="!w-full !px-4 !py-4 !flex !items-center !gap-3 hover:!bg-gray-50 !transition-colors disabled:!opacity-50"
              >
                <div className="!w-10 !h-10 !bg-gradient-to-br !from-pink-500 !to-purple-600 !rounded-lg !flex !items-center !justify-center">
                  <Instagram className="!w-5 !h-5 !text-white" strokeWidth={2} />
                </div>
                <div className="!flex-1 !text-left">
                  <h4 className="!text-sm !font-medium !text-gray-900">Instagram</h4>
                  <p className="!text-xs !text-gray-600">20 points</p>
                </div>
                {completedTasks["FOLLOW_INSTAGRAM"] ? (
                  <CheckCircle className="!w-5 !h-5 !text-green-600" />
                ) : (
                  <ArrowRight className="!w-4 !h-4 !text-gray-400" />
                )}
              </button>
            </Link>

            <Link href="fb://profile/697609756776592" target="_blank">
              <button
                onClick={() => handleAction("FOLLOW_FACEBOOK")}
                disabled={!!completedTasks["FOLLOW_FACEBOOK"]}
                className="!w-full !px-4 !py-4 !flex !items-center !gap-3 hover:!bg-gray-50 !transition-colors disabled:!opacity-50"
              >
                <div className="!w-10 !h-10 !bg-blue-600 !rounded-lg !flex !items-center !justify-center">
                  <Facebook className="!w-5 !h-5 !text-white" strokeWidth={2} />
                </div>
                <div className="!flex-1 !text-left">
                  <h4 className="!text-sm !font-medium !text-gray-900">Facebook</h4>
                  <p className="!text-xs !text-gray-600">20 points</p>
                </div>
                {completedTasks["FOLLOW_FACEBOOK"] ? (
                  <CheckCircle className="!w-5 !h-5 !text-green-600" />
                ) : (
                  <ArrowRight className="!w-4 !h-4 !text-gray-400" />
                )}
              </button>
            </Link>
          </div>
        </section>
      </div>

      <div className="!h-20"></div>
    </main>
  );
}