"use client";
import { SupportAmount } from "@/components/SupportAmount";
import { ENV_VARIABLES } from "@/constants/env_variables";
import FlickShareContractABI from "@/abi/FlickShareContract.json";
import {
  ArrowLeft,
  Star,
  Coins,
  User,
  Share2,
  ThumbsUp,
} from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import { useSession } from "next-auth/react";
import { decodeAbiParameters, parseAbiParameters } from "viem";
import { toast } from "react-toastify";

const ReviewSupportUI = () => {
  const params = useParams<{ reviewId: string }>();

  const { data: session } = useSession();
  const reviewId = params?.reviewId;
  const [showShareOptions, setShowShareOptions] = useState(false);

  const [review, setReview] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      if (!reviewId) return;
      setLoading(true);
      setError(null);
      try {
        const userId = session?.user?.id;
        const res = await fetch(`/api/reviews/${reviewId}?userId=${userId}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Failed to fetch review ${reviewId}`);
        const data = await res.json();
        setReview(data.review);
        setTransactions(data.transactions);
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "Failed to load review.");
      } finally {
        setLoading(false);
      }
    };

    if (session) fetchData();
  }, [reviewId, session]);

  useEffect(() => {
    if (review) {
      setIsLiked(Boolean(review.isLikedByMe));
      setLikeCount(Number(review.likes ?? 0));
    }
  }, [review]);

  const handleLike = async (reviewIdOnChain: number) => {
    if (isLiked) {
      toast.info("You have already liked this review.");
      return;
    }
    console.log("Wow");

    console.log(reviewIdOnChain);

    setIsLiked(true);
    setLikeCount((prev) => prev + 1);

    const userSignal = session?.user?.walletAddress;

    try {
      const result = await MiniKit.commandsAsync.verify({
        action: "like-review",
        verification_level: VerificationLevel.Orb,
        signal: userSignal,
      });

      if (result.finalPayload.status === "error") {
        throw new Error("Verification failed: " + result.finalPayload.status);
      }

      const proofArray = decodeAbiParameters(
        parseAbiParameters("uint256[8]"),
        result.finalPayload.proof as `0x${string}`
      )[0];

      const { finalPayload } =
        await MiniKit.commandsAsync.sendTransaction({
          transaction: [
            {
              address: ENV_VARIABLES.FLICKSHARE_CONTRACT_ADDRESS,
              abi: FlickShareContractABI,
              functionName: "likeReview",
              args: [
                BigInt(reviewIdOnChain),
                result.finalPayload.merkle_root,
                userSignal,
                result.finalPayload.nullifier_hash,
                ENV_VARIABLES.WORLD_MINIAPP_ID,
                "like-review",
                proofArray,
              ],
            },
          ],
        });

      if (finalPayload.status === "error") {
        throw new Error("Transaction failed: " + finalPayload.status);
      }

      fetch(`/api/reviews/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId,
          userId: session?.user?.id,
          txHash: finalPayload.transaction_id,
        }),
      }).catch((err) => {
        console.error("DB sync failed (will retry on next load):", err);
      });
    } catch (err) {
      console.error(err);
      setIsLiked((prev) => !prev);
      setLikeCount((prev) => Math.max(0, prev - 1));
      alert((err as Error).message);
    }
  };

  const shareOnX = () => {
    if (!review) return;
    const { title = "", username = "" } = review;
    const text = `Check out this review of "${title}" by ${username} on FlickShare!`;
    const shareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(
      text
    )}&url=${encodeURIComponent(
      `https://world.org/mini-app?app_id=${ENV_VARIABLES.WORLD_MINIAPP_ID}&path=${encodeURIComponent(
        `/review/${reviewId}`
      )}`
    )}`;
    window.open(shareUrl, "_blank", "width=600,height=400");
    setShowShareOptions(false);
  };

  const XIcon = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );

  return (
    <div className="!min-h-screen !bg-gray-50 !w-full !max-w-md !mx-auto">
      <div className="!bg-white !px-4 !py-3 !flex !items-center !justify-between !border-b">
        <button onClick={() => router.back()} className="p-1" aria-label="Back">
          <ArrowLeft className="!w-6 !h-6 !text-gray-600" />
        </button>
        <h1 className="text-lg font-semibold">Review</h1>
        <button
          onClick={() => setShowShareOptions(!showShareOptions)}
          className="!p-2 !rounded-full !hover:bg-gray-100 !transition-colors"
          aria-label="Share"
        >
          <Share2 className="!w-5 !h-5 !text-gray-600" />
        </button>
      </div>

      {showShareOptions && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-20 z-20 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-xs">
            <h3 className="text-lg font-bold mb-4 text-center">Share Review</h3>
            <div className="flex justify-center gap-4">
              <button
                onClick={shareOnX}
                className="!flex !flex-col !items-center !gap-2 !p-3 !rounded-xl !hover:bg-gray-50 !transition-colors"
              >
                <div className="!w-12 !h-12 !bg-black !rounded-full !flex !items-center !justify-center">
                  <XIcon />
                </div>
                <span className="!text-sm !font-medium">X</span>
              </button>
            </div>
            <div className="!mt-6 !p-3 !text-center !bg-gray-100 !text-gray-800 !font-medium !rounded-lg !hover:bg-gray-200 !transition-colors">
              <button onClick={() => setShowShareOptions(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="p-4 text-center">Loading review...</div>
      )}
      {!loading && error && (
        <div className="p-4 text-center text-red-500">{error}</div>
      )}
      {!loading && !error && !review && (
        <div className="p-4 text-center">Review not found.</div>
      )}

      {!loading && !error && review && (
        <>
          <div className="bg-white p-4">
            <div className="flex flex-col items-center text-center">
              <Image
                src={`https://image.tmdb.org/t/p/w500${review.posterPath}`}
                alt={review.movieTitle}
                width={128}
                height={192}
                className="rounded-lg object-cover shadow-lg mb-4"
              />
              <h2 className="text-2xl font-bold leading-tight">
                {review.movieTitle}
              </h2>
              <p className="text-md text-gray-600 mt-1">
                Review by {review.user}
              </p>
              <div className="flex items-center my-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < (review.rating ?? 0)
                        ? "text-yellow-400 fill-current"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-gray-800 text-lg leading-relaxed">
                {review.text}
              </p>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <SupportAmount amount={review.coins} />
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {likeCount} likes
                    </span>
                    <button
                      onClick={() => handleLike(review.reviewIdOnChain)}
                      className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-200"
                      aria-label={isLiked ? "Unlike" : "Like"}
                    >
                      <ThumbsUp
                        className={`w-5 h-5 transition-all duration-200 ${
                          isLiked
                            ? "text-blue-500 fill-blue-500"
                            : "text-gray-500"
                        }`}
                        strokeWidth={2}
                      />
                    </button>
                </div>
            </div>
          </div>

          <div className="p-4 bg-white border-t">
            <button
              onClick={() => router.push(`/support/${reviewId}`)}
              className="!w-full !bg-black !text-white !py-3 !rounded-lg !font-medium !text-lg"
            >
              Support this Review
            </button>
          </div>

          {transactions.length > 0 && (
            <div className="bg-gray-50 p-4 border-t">
              <h3 className="text-lg font-bold text-black mb-3">Recent Supporters</h3>
              <div className="space-y-3">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm text-gray-900">{tx.from}</p>
                            <p className="text-xs text-gray-500">
                                {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    <SupportAmount amount={tx.amount} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="h-20"></div>
    </div>
  );
};

export default ReviewSupportUI;