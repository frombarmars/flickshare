"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { ChevronRight, ThumbsUp, MessageCircle } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import client from "@/lib/worldClient";
import { ENV_VARIABLES } from "@/constants/env_variables";
import FlickShareContractABI from "@/abi/FlickShareContract.json";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import { decodeAbiParameters, parseAbiParameters } from "viem";
import { SupportAmount } from "@/components/SupportAmount";
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
      const userId = session?.user?.id;
      const url = nextCursorRef.current
        ? `/api/reviews?cursor=${nextCursorRef.current}&limit=6&userId=${userId}`
        : `/api/reviews?limit=6&userId=${userId}`;

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
  }, [session?.user?.id]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    const unwatch = client.watchContractEvent({
      address: ENV_VARIABLES.FLICKSHARE_CONTRACT_ADDRESS as `0x${string}`,
      abi: FlickShareContractABI,
      eventName: "ReviewAdded",
      onLogs: (logs) => {
        logs.forEach(async (log) => {
          const { reviewId } = (log as unknown as { args: ReviewAddedLog })
            .args;

          try {
            const response = await fetch(`/api/reviews/${reviewId}`);
            if (response.ok) {
              const { review } = await response.json();
              if (review) {
                setReviews((prev) => [review, ...prev]);
              }
            }
          } catch (error) {
            console.error("Error fetching new review:", error);
          }
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
    e.stopPropagation();
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
    const review = reviews.find((r) => r.reviewIdOnChain === reviewIdOnChain);
    
    if (review?.reviewer?.id === session?.user?.id) {
      toast.info("You can't like your own review! 😊", {
        position: "top-center",
        autoClose: 2000,
      });
      return;
    }
    
    if (review?.isLiked) {
      toast.info("You've already liked this review! ❤️", {
        position: "top-center",
        autoClose: 2000,
      });
      return;
    }

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
      }).catch((err) => {
        console.error("Error updating like status:", err);
      });
    } catch (err) {
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
    if (coins >= 1) return coins.toFixed(2);
    if (coins >= 0.01) return coins.toFixed(2);
    if (coins >= 0.001) return coins.toFixed(3);
    if (coins > 0) return '<0.001';
    return '0';
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Compact reviews feed */}
      <div className="max-w-3xl mx-auto px-3 py-4">
        {reviews.map((r, i) => {
          const isLast = i === reviews.length - 1;

          return (
            <div
              key={r.id}
              ref={isLast ? lastReviewRef : null}
              className="mb-3 group"
              onClick={() => handleReviewClick(r)}
            >
              {/* Compact review card */}
              <div className="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors cursor-pointer">
                {/* Compact top bar */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border border-gray-200"
                      onClick={(e) => handleAvatarClick(e, r.user)}
                    >
                      <Image
                        src={r.avatar || ""}
                        alt={r.user}
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{r.user}</p>
                      <p className="text-[10px] text-gray-500">Film enthusiast</p>
                    </div>
                  </div>
                  <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                    <ChevronRight size={16} />
                  </div>
                </div>

                {/* Compact content */}
                <div className="flex gap-3">
                  {/* Smaller poster */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-24 relative rounded overflow-hidden border border-gray-200">
                      <Image
                        src={`https://image.tmdb.org/t/p/w500${
                          r.posterPath || "./placeholder.jpeg"
                        }`}
                        alt={r.movieTitle}
                        fill
                        className="object-cover"
                        sizes="64px"
                        priority={i < 3}
                      />
                    </div>
                  </div>

                  {/* Content area */}
                  <div className="flex-1 min-w-0">
                    <div className="mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                        {r.movieTitle}
                      </h3>
                    </div>

                    {/* Review text */}
                    <p className="text-gray-600 text-xs mb-3 leading-relaxed line-clamp-3">
                      {r.text}
                    </p>

                    {/* Compact interaction bar */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-3">
                        <SupportAmount amount={r.coins} />
                        
                        <div className="flex items-center gap-1 text-gray-500">
                          <ThumbsUp size={12} className={r.isLiked ? 'fill-current text-gray-700' : ''} />
                          <span className="text-xs">{r.likes}</span>
                        </div>
                        
                        <div className="flex items-center gap-1 text-gray-500">
                          <span className="text-xs">💬</span>
                          <span className="text-xs">{r.commentsCount}</span>
                        </div>
                      </div>
                      
                      <button
                        disabled={r.reviewer?.id === session?.user?.id}
                        className={`
                          !px-2.5 !py-1 !rounded !text-xs !font-medium !transition-colors
                          ${r.reviewer?.id === session?.user?.id
                            ? '!bg-gray-100 !text-gray-400 !cursor-not-allowed !border !border-gray-200'
                            : r.isLiked 
                              ? '!bg-gray-200 !text-gray-700 !border !border-gray-300' 
                              : '!bg-gray-100 !text-gray-700 hover:!bg-gray-200 !border !border-gray-200 hover:!border-gray-300'
                          }
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(r.reviewIdOnChain);
                        }}
                      >
                        {r.isLiked ? 'Liked' : 'Like'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compact loading */}
      {loading && (
        <div className="flex justify-center py-6">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
            <span className="text-xs">Loading...</span>
          </div>
        </div>
      )}

      {/* End message */}
      {!hasMoreRef.current && reviews.length > 0 && (
        <div className="max-w-3xl mx-auto px-3 py-6">
          <div className="text-center py-4 border-t border-gray-200">
            <p className="text-gray-500 text-xs">You've reached the end</p>
          </div>
        </div>
      )}

      <div className="h-16"></div>
    </div>
  );
}