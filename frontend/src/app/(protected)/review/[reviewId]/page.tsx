"use client";
import { SupportAmount } from "@/components/SupportAmount";
import { ENV_VARIABLES } from "@/constants/env_variables";
import FlickShareContractABI from "@/abi/FlickShareContract.json";
import { ArrowLeft, Star, Coins, User, Share2, ThumbsUp, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import { useSession } from "next-auth/react";
import { decodeAbiParameters, parseAbiParameters } from "viem";
import { toast } from "react-toastify";
import { CommentSection } from "@/components/Comments/CommentSection";

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
  const [isLiking, setIsLiking] = useState(false);
  const [activeTab, setActiveTab] = useState<'supporters' | 'comments' | 'analytics'>('supporters');
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
    if (review?.reviewer?.id === session?.user?.id) {
      toast.info("You can't like your own review", {
        position: "top-center",
        autoClose: 2000,
      });
      return;
    }

    if (isLiked) {
      toast.info("You already liked this review", {
        position: "top-center",
        autoClose: 2000,
      });
      return;
    }

    if (isLiking) return;

    setIsLiking(true);
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

      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
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

      await fetch(`/api/reviews/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId,
          userId: session?.user?.id,
          txHash: finalPayload.transaction_id,
        }),
      });

      toast.success("Review liked!", { position: "top-center", autoClose: 2000 });
    } catch (err) {
      setIsLiked(false);
      setLikeCount((prev) => Math.max(0, prev - 1));
      toast.error("Failed to like review", { position: "top-center", autoClose: 2000 });
    } finally {
      setIsLiking(false);
    }
  };

  const shareOnX = () => {
    if (!review) return;
    const { movieTitle = "", user = "" } = review;
    const text = `Check out this review of "${movieTitle}" by ${user} on FlickShare!`;
    const shareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(
      `https://world.org/mini-app?app_id=${ENV_VARIABLES.WORLD_MINIAPP_ID}&path=${encodeURIComponent(`/review/${reviewId}`)}`
    )}`;
    window.open(shareUrl, "_blank", "width=600,height=400");
    setShowShareOptions(false);
  };

  const XIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="!px-4 !py-2 !bg-gray-900 !text-white !rounded-md hover:!bg-gray-800 !text-sm !transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!review) return null;

  return (
    <div className="min-h-screen bg-[#fafafa] px-3">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#fafafa]/80 backdrop-blur-xl border-b border-gray-200/60">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => router.back()} 
            className="!p-1.5 hover:!bg-gray-100/80 !rounded-md !transition-all" 
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={() => setShowShareOptions(!showShareOptions)}
            className="!p-1.5 hover:!bg-gray-100/80 !rounded-md !transition-all"
          >
            <Share2 className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Share Modal */}
      {showShareOptions && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-2xl w-full max-w-lg animate-slide-up">
            <div className="p-6 space-y-4">
              <button
                onClick={shareOnX}
                className="!flex !items-center !gap-3 !w-full !px-4 !py-3 !bg-black hover:!bg-gray-900 !rounded-lg !transition-all"
              >
                <XIcon />
                <span className="!text-sm !font-medium !text-white">Share on X</span>
              </button>
              <button 
                onClick={() => setShowShareOptions(false)}
                className="!w-full !py-3 !text-sm !text-gray-600 hover:!bg-gray-50 !rounded-lg !transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">
        {/* Movie Header */}
        <div className="px-4 py-6 bg-white">
          <div className="flex gap-4">
            <Image
              src={`https://image.tmdb.org/t/p/w500${review.posterPath}`}
              alt={review.movieTitle}
              width={70}
              height={105}
              className="rounded-lg object-cover shadow-sm"
            />
            <div className="flex-1 min-w-0 space-y-2">
              <h2 className="text-lg font-semibold text-gray-900 leading-tight">
                {review.movieTitle}
              </h2>
              {review.releaseDate && (
                <p className="text-xs text-gray-500">
                  {new Date(review.releaseDate).getFullYear()}
                </p>
              )}
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < (review.rating ?? 0)
                        ? "text-amber-400 fill-amber-400"
                        : "text-gray-200 fill-gray-200"
                    }`}
                  />
                ))}
                <span className="text-xs font-medium text-gray-700 ml-1.5">
                  {review.rating}/5
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-200"></div>

        {/* Review Content */}
        <div className="bg-white">
          {/* Author */}
          <Link
            href={`/profile/${review.user}`}
            className="flex items-center gap-2.5 px-4 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-gray-600" />
            </div>
            <span className="text-sm font-medium text-gray-900">{review.user}</span>
          </Link>

          {/* Review Text */}
          <div className="px-4 pb-4">
            <p className="text-[15px] text-gray-800 leading-relaxed">
              {review.text}
            </p>
          </div>

          {/* Actions */}
          <div className="px-4 py-3 bg-white-50 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleLike(review.reviewIdOnChain)}
                  disabled={isLiking || (review?.reviewer?.id === session?.user?.id)}
                  className={`
                    !flex !items-center !gap-1.5 !px-2.5 !py-1.5 !rounded-md !text-xs !font-medium !transition-all
                    ${review?.reviewer?.id === session?.user?.id
                      ? '!bg-gray-100 !text-blue-400 !cursor-not-allowed'
                      : isLiked 
                        ? '!bg-red-50 !text-red-600 hover:!bg-red-100' 
                        : '!bg-transparent hover:!bg-gray-100 !text-gray-600'
                    }
                  `}
                >
                  <ThumbsUp className={`!w-3.5 !h-3.5 ${isLiked ? '!fill-blue-600': ''}`} />
                  <span>{likeCount}</span>
                </button>
              </div>

              <SupportAmount amount={review.coins} />
            </div>
          </div>
        </div>

        {/* Support CTA */}
        <div className="px-4 py-4 bg-white border-t border-gray-100">
          <button
            onClick={() => router.push(`/support/${reviewId}`)}
            className="!w-full !py-3 !bg-gray-900 hover:!bg-gray-800 !text-white !rounded-xl !text-sm !font-medium !transition-all !shadow-sm !flex !items-center !justify-center !gap-2"
          >
            <Coins className="!w-4 !h-4" />
            <span>Support {review.user}</span>
          </button>
        </div>

        {/* Tabbed Section */}
        <div className="bg-white">
          {/* Tab Header */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('comments')}
              className={`!flex-1 !py-3 !text-xs !font-medium !transition-all !border-b-2 ${
                activeTab === 'comments'
                  ? '!border-gray-900 !text-gray-900'
                  : '!border-transparent !text-gray-500 hover:!text-gray-700'
              }`}
            >
              Comments
            </button>
            <button
              onClick={() => setActiveTab('supporters')}
              className={`!flex-1 !py-3 !text-xs !font-medium !transition-all !border-b-2 ${
                activeTab === 'supporters'
                  ? '!border-gray-900 !text-gray-900'
                  : '!border-transparent !text-gray-500 hover:!text-gray-700'
              }`}
            >
              Supporters
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`!flex-1 !py-3 !text-xs !font-medium !transition-all !border-b-2 ${
                activeTab === 'analytics'
                  ? '!border-gray-900 !text-gray-900'
                  : '!border-transparent !text-gray-500 hover:!text-gray-700'
              }`}
            >
              Analytics
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[200px] mt-2">
            {/* Supporters Tab */}
            {activeTab === 'supporters' && (
              <>
                {transactions.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {transactions.slice(0, 10).map((tx) => (
                      <Link
                        key={tx.id}
                        href={`/profile/${tx.from}`}
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{tx.from}</p>
                            <p className="text-[10px] text-gray-500">
                              {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <SupportAmount amount={tx.amount} />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <Coins className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">No supporters yet</p>
                  </div>
                )}
              </>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && reviewId && (
              <div>
                <CommentSection reviewId={reviewId} />
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <ThumbsUp className="w-3.5 h-3.5 text-gray-600" />
                      <span className="text-[10px] text-gray-500 uppercase tracking-wide">Likes</span>
                    </div>
                    <p className="text-xl font-semibold text-gray-900">{likeCount}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Coins className="w-3.5 h-3.5 text-gray-600" />
                      <span className="text-[10px] text-gray-500 uppercase tracking-wide">Support</span>
                    </div>
                    <div className="text-xl font-semibold text-gray-900">
                      <SupportAmount amount={review.coins} />
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-3.5 h-3.5 text-gray-600" />
                      <span className="text-[10px] text-gray-500 uppercase tracking-wide">Supporters</span>
                    </div>
                    <p className="text-xl font-semibold text-gray-900">{transactions.length}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="w-3.5 h-3.5 text-gray-600" />
                      <span className="text-[10px] text-gray-500 uppercase tracking-wide">Rating</span>
                    </div>
                    <p className="text-xl font-semibold text-gray-900">{review.rating}/5</p>
                  </div>
                </div>
                
                {transactions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Top Supporter</h4>
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3">
                      <Link
                        href={`/profile/${transactions[0].from}`}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-amber-700" />
                          </div>
                          <p className="text-sm font-medium text-gray-900">{transactions[0].from}</p>
                        </div>
                        <SupportAmount amount={transactions[0].amount} />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-20"></div>
    </div>
  );
};

export default ReviewSupportUI;