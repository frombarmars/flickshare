"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { ChevronRight, ThumbsUp } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import client from "@/lib/worldClient";
import { ENV_VARIABLES } from "@/constants/env_variables";
import FlickShareContractABI from "@/abi/FlickShareContract.json";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import { decodeAbiParameters, parseAbiParameters } from "viem";
import { useSession } from "next-auth/react";
import { useWaitForTransactionReceipt } from "@worldcoin/minikit-react";
import { toast } from "react-toastify";

type ReviewAddedLog = {
  reviewer: string;
  movieId: bigint;
  reviewId: bigint;
  reviewText: string;
  timestamp: bigint;
  rating: number;
};

export default function ReviewsFeedPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const scrollObserver = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(false);
  const router = useRouter();
  const { data: session } = useSession();
  const nextCursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);

  const fetchReviews = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const url = nextCursorRef.current
        ? `/api/reviews?cursor=${nextCursorRef.current}&limit=6`
        : `/api/reviews?limit=6`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch reviews");

      const data = await response.json();

      if (data.reviews.length) {
        setReviews((prev) => [...prev, ...data.reviews]);
        nextCursorRef.current = data.nextCursor;
        hasMoreRef.current = !!data.nextCursor;
      } else {
        hasMoreRef.current = false;
      }
    } catch (err) {
      console.error("Error fetching reviews:", err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    const unwatch = client.watchContractEvent({
      address: ENV_VARIABLES.FLICKSHARE_CONTRACT_ADDRESS as `0x${string}`,
      abi: FlickShareContractABI,
      eventName: "ReviewAdded",
      // 👇 logs are automatically typed with args
      onLogs: (logs) => {
        logs.forEach((log) => {
          const { reviewer, movieId, reviewId, reviewText, timestamp, rating } =
            (log as unknown as { args: ReviewAddedLog }).args;

          const newReview = {
            reviewer,
            movieId: Number(movieId),
            reviewIdOnChain: Number(reviewId),
            reviewText,
            timestamp: Number(timestamp) * 1000,
            rating,
            likes: [],
            supports: [],
          };

          setReviews((prev) => [newReview, ...prev]);
        });
      },
    });

    return () => unwatch();
  }, []);

  const lastReviewRef = useCallback(
    (node: HTMLElement | null) => {
      if (loading) return;
      if (scrollObserver.current) scrollObserver.current.disconnect();

      scrollObserver.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current) {
          fetchReviews();
        }
      });

      if (node) scrollObserver.current.observe(node);
    },
    [loading, fetchReviews]
  );

  const handleReviewClick = (review: any) => {
    router.push(`/review/${review.reviewIdOnChain}`);
  };

  const handleAvatarClick = (e: React.MouseEvent, username: string) => {
    e.stopPropagation(); // Prevent triggering the review click
    router.push(`/profile/${username}`);
  };

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      client,
      appConfig: {
        app_id: ENV_VARIABLES.WORLD_MINIAPP_ID,
      },
      transactionId,
    });

  useEffect(() => {
    if (isConfirming) {
      toast.loading("Confirming transaction...");
    } else if (isConfirmed) {
      toast.success("Transaction confirmed!");
    }
  }, [isConfirming, isConfirmed]);

  const handleLike = async (reviewIdOnChain: number) => {
    setReviews((prev) =>
      prev.map((r) =>
        r.reviewIdOnChain === reviewIdOnChain
          ? { ...r, isLiked: true, likes: r.likes + 1 }
          : r
      )
    );

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

      const { commandPayload, finalPayload } =
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
        console.log(finalPayload);
        throw new Error("Transaction failed: " + finalPayload.status);
      }
      setTransactionId(finalPayload.transaction_id);
      fetch(`/api/reviews/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId: reviewIdOnChain,
          userId: session?.user?.id,
          txHash: finalPayload.transaction_id,
        }),
      }).catch((err) => console.error("DB sync failed:", err));
    } catch (err) {
      console.error(err);
      // Revert UI if failed
      setReviews((prev) =>
        prev.map((r) =>
          r.reviewIdOnChain === reviewIdOnChain
            ? { ...r, isLiked: false, likes: Math.max(0, r.likes - 1) }
            : r
        )
      );
      alert((err as Error).message);
    }
  };

  const formatCoins = (coins: number) => {
    if (coins >= 1000000) return `${(coins / 1000000).toFixed(1)}M`;
    if (coins >= 1000) return `${(coins / 1000).toFixed(1)}K`;
    return coins.toString();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Condensed reviews feed */}
      <div className="px-3 py-3 space-y-3">
        {reviews.map((r, i) => {
          const isLast = i === reviews.length - 1;

          return (
            <div
              key={r.id}
              ref={isLast ? lastReviewRef : null}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden active:scale-[0.99] transition-all duration-150 hover:shadow-md hover:border-gray-300"
              onClick={() => handleReviewClick(r)}
            >
              {/* Compact top bar with coin status */}
              <div
                className="flex items-center justify-between gap-3 p-2 rounded-md active:bg-gray-100"
                onClick={(e) => handleAvatarClick(e, r.user)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200">
                    <Image
                      src={r.avatar || ""}
                      alt={r.user}
                      width={32}
                      height={32}
                      className="object-cover"
                    />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{r.user}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>

              {/* Main content - poster + review */}
              <div className="flex gap-4 p-4 pt-3">
                {/* High-quality poster with subtle glow effect */}
                <div className="relative flex-shrink-0">
                  <div className="w-22 h-33 relative rounded-xl overflow-hidden shadow-lg border border-gray-200">
                    <Image
                      src={`https://image.tmdb.org/t/p/w500${
                        r.posterPath || "./placeholder.jpeg"
                      }`}
                      alt={r.movieTitle}
                      fill
                      className="object-cover"
                      sizes="72px"
                      priority={i < 3}
                    />
                  </div>
                  {/* Subtle glow effect behind poster */}
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-400 to-gray-500 opacity-10 blur-lg -z-10 scale-110 rounded-xl"></div>
                </div>

                {/* Content area */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-base leading-tight line-clamp-1">
                      {r.movieTitle}
                    </h3>
                  </div>

                  {/* Review text with refined typography */}
                  <p className="text-sm leading-relaxed text-gray-700 line-clamp-3 font-normal mb-2">
                    {r.text}
                  </p>

                  {/* Engagement footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="px-2 py-1 bg-gray-100 rounded-md">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <Image
                            src="/wld_token.png"
                            alt="WLD"
                            width={20}
                            height={20}
                            className="mr-1"
                          />
                          <span className="font-medium">
                            {formatCoins(r.coins)}
                          </span>
                        </div>
                      </div>
                      <div className="px-2 py-1 bg-gray-100 rounded-md">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <ThumbsUp size={11} />
                          <span>{r.likes}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bold icon-only like button */}
                    {/* Like button inside review card */}
                    <button
                      className="p-2 bg-black rounded-lg hover:bg-gray-800 transition-colors shadow-sm hover:shadow-md flex items-center justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(r.reviewIdOnChain);
                      }}
                    >
                      <ThumbsUp
                        size={22}
                        className={`text-black ${
                          r.isLiked ? "fill-blue-500" : "fill-transparent"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Refined loading indicator */}
      {loading && (
        <div className="flex justify-center py-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200"></div>
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-700 border-t-transparent absolute top-0"></div>
          </div>
        </div>
      )}

      {/* End message with clean styling */}
      {!hasMoreRef.current && reviews.length > 0 && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2px-4 py-3 rounded-2xl">
            <span className="text-sm font-medium text-gray-600">
              All reviews loaded!
            </span>
          </div>
        </div>
      )}

      <div className="h-20"></div>
    </div>
  );
}
