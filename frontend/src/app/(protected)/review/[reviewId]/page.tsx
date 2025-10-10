"use client";
import { SupportAmount } from "@/components/SupportAmount";
import { ENV_VARIABLES } from "@/constants/env_variables";
import FlickShareContractABI from "@/abi/FlickShareContract.json";
import { ArrowLeft, Star, Coins, User, Share2, ThumbsUp, Heart } from "lucide-react";
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

  const [isLiking, setIsLiking] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const handleLike = async (reviewIdOnChain: number) => {
    // Check if user is trying to like their own review
    if (review?.reviewer?.id === session?.user?.id) {
      toast.info("🚫 Can't like your own review", {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        className: "!bg-blue-50 !text-blue-800 !border !border-blue-200 !rounded-xl !shadow-lg !text-sm !font-medium",
        icon: false,
      });
      return;
    }

    if (isLiked) {
      toast.info("❤️ You already liked this review", {
        position: "top-center",
        autoClose: 2500,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        className: "!bg-red-50 !text-red-800 !border !border-red-200 !rounded-xl !shadow-lg !text-sm !font-medium",
        icon: false,
      });
      return;
    }

    if (isLiking) return; // Prevent double clicks

    setIsLiking(true);
    
    // Optimistic update
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

      const likeResponse = await fetch(`/api/reviews/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId,
          userId: session?.user?.id,
          txHash: finalPayload.transaction_id,
        }),
      });

      if (!likeResponse.ok) {
        const errorData = await likeResponse.json();
        if (errorData.error === "Already liked") {
          toast.warning("⚠️ Already liked this review", {
            position: "top-center",
            autoClose: 2500,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            className: "!bg-yellow-50 !text-yellow-800 !border !border-yellow-200 !rounded-xl !shadow-lg !text-sm !font-medium",
            icon: false,
          });
        } else {
          throw new Error(errorData.error || "Failed to save like");
        }
      } else {
        toast.success("✨ Review liked successfully!", {
          position: "top-center",
          autoClose: 2000,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          className: "!bg-green-50 !text-green-800 !border !border-green-200 !rounded-xl !shadow-lg !text-sm !font-medium",
          icon: false,
        });
      }
    } catch (err) {
      console.error(err);
      // Revert optimistic update
      setIsLiked(false);
      setLikeCount((prev) => Math.max(0, prev - 1));
      
      const errorMessage = (err as Error).message;
      if (errorMessage.includes("Already liked")) {
        toast.warning("⚠️ Already liked this review", {
          position: "top-center",
          autoClose: 2500,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          className: "!bg-yellow-50 !text-yellow-800 !border !border-yellow-200 !rounded-xl !shadow-lg !text-sm !font-medium",
          icon: false,
        });
      } else {
        toast.error("❌ Failed to like review", {
          position: "top-center",
          autoClose: 3500,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          className: "!bg-red-50 !text-red-800 !border !border-red-200 !rounded-xl !shadow-lg !text-sm !font-medium",
          icon: false,
        });
      }
    } finally {
      setIsLiking(false);
    }
  };

  const shareOnX = () => {
    if (!review) return;
    const { movieTitle = "", user = "", releaseDate, director } = review;
    
    // Create a more distinctive movie title with year and director
    let movieInfo = movieTitle;
    if (releaseDate) {
      movieInfo += ` (${new Date(releaseDate).getFullYear()})`;
    }
    if (director) {
      movieInfo += ` directed by ${director}`;
    }
    
    const text = `Check out this review of "${movieInfo}" by ${user} on FlickShare!`;
    const shareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(
      text
    )}&url=${encodeURIComponent(
      `https://world.org/mini-app?app_id=${
        ENV_VARIABLES.WORLD_MINIAPP_ID
      }&path=${encodeURIComponent(`/review/${reviewId}`)}`
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
    <>
      <div className="min-h-screen bg-gray-50 w-full">
      {/* Mobile-Optimized Header */}
      <div className="bg-white/95 backdrop-blur-sm px-3 py-3 flex items-center justify-between border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <button 
          onClick={() => router.back()} 
          className="p-2 hover:bg-gray-100 rounded-full transition-all duration-200 active:scale-95 touch-manipulation" 
          aria-label="Back"
        >
          <ArrowLeft className="w-6 h-6 text-gray-700" />
        </button>
        <div className="text-center flex-1">
          <h1 className="text-base font-bold text-gray-900 truncate">Movie Review</h1>
        </div>
        <button
          onClick={() => setShowShareOptions(!showShareOptions)}
          className="p-2 hover:bg-gray-100 rounded-full transition-all duration-200 active:scale-95 relative touch-manipulation"
          aria-label="Share"
        >
          <Share2 className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      {/* Mobile-Optimized Share Modal */}
      {showShareOptions && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-3">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs transform animate-in zoom-in-95 duration-200">
            <div className="p-4">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Share Review</h3>
                  <p className="text-gray-600 text-xs">
                    Share with friends
                  </p>
                </div>
                
                <div className="flex justify-center pt-2">
                  <button
                    onClick={shareOnX}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-gray-50 transition-all duration-200 transform active:scale-95 touch-manipulation"
                  >
                    <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                      <XIcon />
                    </div>
                    <span className="text-xs font-medium text-gray-700">Share on X</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 p-3">
              <button 
                onClick={() => setShowShareOptions(false)}
                className="w-full py-2.5 text-gray-600 hover:text-gray-800 font-medium rounded-lg hover:bg-gray-50 transition-all duration-200 text-sm touch-manipulation"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile-Optimized Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="relative">
            <div className="w-12 h-12 border-3 border-gray-200 rounded-full animate-spin"></div>
            <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
          </div>
          <h3 className="mt-3 text-base font-semibold text-gray-900">Loading Review</h3>
          <p className="text-gray-500 text-xs text-center">Please wait...</p>
        </div>
      )}
      
      {/* Enhanced Error State */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <div className="w-8 h-8 text-red-500">⚠️</div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Oops! Something went wrong</h3>
          <p className="text-red-600 text-center mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
      
      {/* Enhanced Not Found State */}
      {!loading && !error && !review && (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <div className="w-8 h-8 text-gray-500">🔍</div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Review Not Found</h3>
          <p className="text-gray-500 text-center mb-4">
            The review you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Go Back
          </button>
        </div>
      )}

      {!loading && !error && review && (
        <>
          {/* Mobile-Optimized Hero Section */}
          <div className="bg-gradient-to-b from-white to-gray-50/50 p-4">
            <div className="flex flex-col items-center text-center space-y-3">
              {/* Mobile-Optimized Movie Poster */}
              <div className="relative">
                <Image
                  src={`https://image.tmdb.org/t/p/w500${review.posterPath}`}
                  alt={review.movieTitle}
                  width={120}
                  height={180}
                  className="rounded-lg object-cover shadow-lg ring-1 ring-black/10"
                />
              </div>
              
              {/* Mobile-Optimized Movie Title */}
              <div className="space-y-2 w-full">
                <h1 className="text-xl font-bold text-gray-900 leading-tight px-2">
                  {review.movieTitle}
                </h1>
                
                {/* Mobile-Optimized Movie Metadata */}
                {(review.releaseDate || review.director) && (
                  <div className="flex flex-wrap items-center justify-center gap-2 px-2">
                    {review.releaseDate && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        <span className="font-medium text-gray-700">
                          {new Date(review.releaseDate).getFullYear()}
                        </span>
                      </div>
                    )}
                    {review.director && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-xs">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                        <span className="font-medium text-blue-800 truncate max-w-32">
                          {review.director}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile-Optimized Review Content */}
          <div className="bg-white mx-2 -mt-1 rounded-t-2xl shadow-lg border border-gray-100">
            {/* Mobile-Optimized Reviewer Info */}
            <div className="px-4 pt-4 pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/profile/${review.user}`}
                      className="font-semibold text-gray-900 hover:text-blue-600 transition-colors block truncate text-sm"
                    >
                      {review.user}
                    </Link>
                    <p className="text-xs text-gray-500">Movie Reviewer</p>
                  </div>
                </div>
                
                {/* Mobile-Optimized Star Rating */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-yellow-50 border border-yellow-200 rounded-full flex-shrink-0">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 transition-colors ${
                          i < (review.rating ?? 0)
                            ? "text-yellow-500 fill-yellow-500"
                            : "text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-yellow-700 ml-0.5">
                    {review.rating}/5
                  </span>
                </div>
              </div>
            </div>

            {/* Mobile-Optimized Review Text */}
            <div className="px-4 py-4">
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-800 text-sm leading-relaxed font-normal">
                  {review.text}
                </p>
              </div>
            </div>

            {/* Mobile-Optimized Interaction Section */}
            <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between gap-4">
                {/* Mobile-Optimized Stats Section */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Support Amount - Mobile */}
                  <div className="text-sm">
                    <SupportAmount amount={review.coins} />
                  </div>
                  
                  {/* Like Count - Mobile */}
                  <div className="flex items-center gap-1.5">
                    <Heart className={`w-4 h-4 ${
                      isLiked ? 'fill-red-500 text-red-500' : 'text-gray-400'
                    }`} />
                    <span className="text-sm text-gray-600 font-medium">
                      {likeCount}
                    </span>
                  </div>
                </div>
                
                {/* Enhanced Mobile Like Button */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => handleLike(review.reviewIdOnChain)}
                    disabled={isLiking || (review?.reviewer?.id === session?.user?.id)}
                    className={`
                      !flex !items-center !justify-center !px-6 !py-3 !rounded-xl !transition-all !duration-300 !transform 
                      !active:scale-95 !touch-manipulation !shadow-lg !min-w-[100px] !min-h-[48px] !text-sm !font-semibold !text-white
                      ${review?.reviewer?.id === session?.user?.id
                        ? '!bg-gray-400 !cursor-not-allowed !opacity-60'
                        : isLiked 
                          ? '!bg-gradient-to-r !from-green-500 !to-emerald-600 !cursor-default !shadow-green-200' 
                          : '!bg-gradient-to-r !from-indigo-500 !to-purple-600 !cursor-pointer !shadow-indigo-200 hover:!shadow-xl'
                      }
                      ${isLiking ? '!animate-pulse !cursor-not-allowed' : ''}
                    `}
                    aria-label={
                      review?.reviewer?.id === session?.user?.id 
                        ? "Can't like own review" 
                        : isLiked 
                          ? "Already liked" 
                          : "Like this review"
                    }
                  >
                    <div className="!relative !flex !items-center !justify-center !gap-2 !text-white !z-10">
                      {isLiking ? (
                        <>
                          <div className="!w-5 !h-5 !border-2 !border-white/50 !border-t-white !rounded-full !animate-spin"></div>
                          <span className="!text-sm !font-semibold !text-white">
                            Liking...
                          </span>
                        </>
                      ) : isLiked ? (
                        <>
                          <Heart
                            className="!w-5 !h-5 !text-white !fill-white"
                            strokeWidth={2}
                          />
                          <span className="!text-sm !font-bold !text-white">
                            Liked!
                          </span>
                        </>
                      ) : (
                        <>
                          <ThumbsUp
                            className="!w-5 !h-5 !text-white"
                            strokeWidth={2}
                          />
                          <span className="!text-sm !font-semibold !text-white">
                            Like
                          </span>
                        </>
                      )}
                    </div>
                  </button>

                  {/* Enhanced Tooltip with Better Positioning */}
                  {showTooltip && (
                    <div className="absolute bottom-full right-0 mb-3 z-30">
                      <div className={`
                        px-4 py-2.5 text-sm font-medium text-white rounded-xl shadow-2xl
                        pointer-events-none transition-all duration-300 whitespace-nowrap
                        ${review?.reviewer?.id === session?.user?.id
                          ? 'bg-gray-800'
                          : isLiked 
                            ? 'bg-gradient-to-r from-red-500 to-pink-500' 
                            : 'bg-gradient-to-r from-blue-600 to-purple-600'
                        }
                      `}>
                        {review?.reviewer?.id === session?.user?.id
                          ? "❌ Can't like your own review"
                          : isLiked 
                            ? '❤️ You already liked this!' 
                            : '👍 Show appreciation'
                        }
                        <div className={`
                          absolute top-full right-4 
                          border-8 border-transparent
                          ${review?.reviewer?.id === session?.user?.id
                            ? 'border-t-gray-800'
                            : isLiked 
                              ? 'border-t-red-500' 
                              : 'border-t-blue-600'
                          }
                        `}></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Support Section with Better UX */}
          <div className="px-4 pb-6">
            <div className="relative bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border border-green-200/60 rounded-3xl p-6 shadow-lg overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-green-100/30 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-100/30 to-transparent rounded-full translate-y-12 -translate-x-12"></div>
              
              <div className="relative text-center space-y-5">
                <div className="flex justify-center">
                  <div className="relative group">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-105">
                      <Coins className="w-8 h-8 text-white" />
                    </div>
                    {/* Floating animation rings */}
                    <div className="absolute inset-0 rounded-2xl bg-green-400/20 animate-ping"></div>
                    <div className="absolute inset-0 rounded-2xl bg-emerald-400/10 animate-pulse"></div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-gray-900 tracking-tight">
                    💝 Support this Review
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed max-w-sm mx-auto">
                    Found this review helpful? Show your appreciation by sending WLD tokens to <span className="font-semibold text-emerald-700">{review.user}</span>
                  </p>
                  
                  {/* Support stats preview */}
                  {transactions.length > 0 && (
                    <div className="flex items-center justify-center gap-4 py-2">
                      <div className="flex items-center gap-2 px-3 py-1 bg-white/60 rounded-full border border-green-200/60">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs font-medium text-gray-700">
                          {transactions.length} supporter{transactions.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-white/60 rounded-full border border-green-200/60">
                        <Coins className="w-3 h-3 text-green-600" />
                        <div className="text-xs font-medium text-gray-700">
                          <SupportAmount amount={review.coins} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Enhanced Support Button */}
                <div className="pt-2">
                  <button
                    onClick={() => router.push(`/support/${reviewId}`)}
                    className="group relative w-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white py-4 px-8 rounded-2xl font-bold text-base shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                  >
                    {/* Button glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    {/* Button content */}
                    <div className="relative flex items-center justify-center gap-3">
                      <div className="relative">
                        <Coins className="w-6 h-6 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                        {/* Coin shine effect */}
                        <div className="absolute inset-0 bg-yellow-200/50 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                      <span className="tracking-wide">Send Support</span>
                      
                      {/* Arrow indicator */}
                      <div className="ml-1 transition-transform duration-300 group-hover:translate-x-1">
                        →
                      </div>
                    </div>
                    
                    {/* Success ripple effect placeholder */}
                    <div className="absolute inset-0 bg-green-300 opacity-0 rounded-2xl"></div>
                  </button>
                  
                  {/* Quick support amounts */}
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <span className="text-xs text-gray-600 font-medium">Quick amounts:</span>
                    <div className="flex gap-2">
                      {[1, 5, 10].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => router.push(`/support/${reviewId}?amount=${amount}`)}
                          className="px-3 py-1 text-xs font-semibold text-emerald-700 bg-white/80 hover:bg-emerald-50 border border-emerald-200 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-sm"
                        >
                          {amount} WLD
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Trust indicators */}
                <div className="pt-3 border-t border-green-200/40">
                  <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Secure</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Instant</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Verified</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Supporters Section */}
          {transactions.length > 0 && (
            <div className="mx-4 mb-6">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                      <Star className="w-5 h-5 text-white fill-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        Recent Supporters
                      </h3>
                      <p className="text-sm text-gray-600">
                        {transactions.length} {transactions.length === 1 ? 'supporter' : 'supporters'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {transactions.slice(0, 5).map((tx, index) => (
                    <div
                      key={tx.id}
                      className="px-6 py-4 hover:bg-gray-50/50 transition-colors duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                              <User className="w-6 h-6 text-white" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                              <Coins className="w-3 h-3 text-white" />
                            </div>
                          </div>
                          <div>
                            <Link
                              href={`/profile/${tx.from}`}
                              className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              {tx.from}
                            </Link>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <span>•</span>
                              {new Date(tx.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <SupportAmount amount={tx.amount} />
                          {index === 0 && (
                            <div className="text-xs text-green-600 font-medium mt-1">
                              Latest
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {transactions.length > 5 && (
                  <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-center">
                    <p className="text-sm text-gray-600">
                      And {transactions.length - 5} more supporters
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comments Section with Enhanced Styling */}
          {reviewId && (
            <div className="mx-4 mb-6">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <CommentSection reviewId={reviewId} />
              </div>
            </div>
          )}
        </>
      )}

      {/* Floating Support Button - Mobile Optimized */}
      {!loading && !error && review && (
        <div className="fixed bottom-6 right-4 z-40">
          <button
            onClick={() => router.push(`/support/${reviewId}`)}
            className="group relative bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 active:scale-95"
            aria-label="Quick Support"
          >
            {/* Pulsing ring animation */}
            <div className="absolute -inset-2 bg-green-400/30 rounded-full animate-ping"></div>
            <div className="absolute -inset-1 bg-emerald-400/20 rounded-full animate-pulse"></div>
            
            {/* Button icon */}
            <div className="relative">
              <Coins className="w-6 h-6 transition-transform duration-300 group-hover:rotate-12" />
              
              {/* Sparkle effect */}
              <div className="absolute -top-1 -right-1 w-3 h-3">
                <div className="absolute inset-0 bg-yellow-300 rounded-full animate-ping opacity-75"></div>
                <div className="absolute inset-0.5 bg-yellow-100 rounded-full animate-pulse"></div>
              </div>
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="bg-gray-900 text-white text-sm font-medium px-3 py-2 rounded-lg whitespace-nowrap shadow-xl">
                💚 Quick Support
                <div className="absolute top-full right-3 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Bottom Safe Area */}
      <div className="h-24 bg-transparent"></div>
    </div>
    </>
  );
};

export default ReviewSupportUI;
