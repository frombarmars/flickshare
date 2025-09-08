"use client";
import { ENV_VARIABLES } from "@/constants/env_variables";
import FlickShareContractABI from "@/abi/FlickShareContract.json";
import {
  ArrowLeft,
  ExternalLink,
  Star,
  Coins,
  User,
  ChevronDown,
  Share2,
  Facebook,
  Instagram,
  ThumbsUp,
} from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import { useSession } from "next-auth/react";
import { decodeAbiParameters, parseAbiParameters } from "viem";
import client from "@/lib/worldClient";
import { useWaitForTransactionReceipt } from "@worldcoin/minikit-react";

type Review = {
  id: string;
  username: string;
  title: string;
  rating: number;
  totalSupport: number;
  reviewText: string;
  poster: string;
  likeCount?: number;
  isLikedByMe?: boolean;
};

type Tx = {
  id: string;
  from: string;
  to: string;
  amount: number;
  amountFiat?: string;
  createdAt?: string; // ISO timestamp if provided by backend
  date?: string; // fallback if backend provides split date/time
  time?: string; // fallback if backend provides split date/time
  txHash: string;
  explorerUrl?: string;
};

const ReviewSupportUI = () => {
  const params = useParams<{ reviewId: string }>();
  console.log("Page : details/[reviewId]/page.tsx");
  console.log(params);

  const { data: session } = useSession();
  const reviewId = params?.reviewId;
  const [activeView, setActiveView] = useState<"history" | "analytics">(
    "history"
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);

  const [review, setReview] = useState<Review | null>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);


  const router = useRouter();

  // Fetch review + transactions from your API/DB using the dynamic reviewId
  useEffect(() => {
    let ignore = false;

    const fetchData = async () => {
      if (!reviewId) return;
      setLoading(true);
      setError(null);
      try {
        // Adjust this endpoint to match your actual API route or client
        const res = await fetch(`/api/reviews/${reviewId}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to fetch review ${reviewId}`);
        const data = (await res.json()) as {
          review: any;
          transactions?: any[];
        };

        if (ignore) return;

        // Normalize review shape
        const normalizedReview: Review = {
          id: String(data.review.numericId ?? reviewId),
          username:
            data.review.username ??
            data.review.user?.username ??
            data.review.author?.handle ??
            "@user",
          title: data.review.title ?? data.review.movieTitle ?? "Untitled",
          rating: Number(data.review.rating ?? data.review.stars ?? 0),
          totalSupport: Number(data.review.totalSupport ?? data.review.totalWLD ?? 0),
          reviewText: data.review.reviewText ?? data.review.content ?? "",
          poster:
            `${ENV_VARIABLES.TMDB_IMAGE_BASE}${data.review.poster}`,
          likeCount: Number(data.review.likeCount ?? data.review.likes ?? 0),
          isLikedByMe: Boolean(data.review.isLikedByMe ?? false),
        };

        // Normalize transactions shape
        const normalizedTxs: Tx[] = (data.transactions ?? []).map((t: any, idx: number) => {
          const txHash: string = t.txHash ?? t.hash ?? "";
          const createdAt: string | undefined =
            t.createdAt ?? t.timestamp ?? t.blockTimestamp;
          const date = t.date;
          const time = t.time;

          return {
            id: String(t.id ?? idx + 1),
            from:
              t.from ??
              t.fromUsername ??
              t.sender?.username ??
              t.sender?.handle ??
              "@unknown",
            to: t.to ?? t.toUsername ?? t.receiver?.username ?? "@unknown",
            amount: Number(t.amount ?? t.value ?? 0),
            amountFiat: t.amountFiat,
            createdAt,
            date,
            time,
            txHash,
            explorerUrl:
              t.explorerUrl ??
              (txHash ? `https://worldscan.org/tx/${txHash}` : undefined),
          };
        });

        setReview(normalizedReview);
        setTransactions(normalizedTxs);
      } catch (e: any) {
        console.error(e);
        setError(e?.message ?? "Failed to load review.");
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchData();

    return () => {
      ignore = true;
    };
  }, [reviewId]);

  // Sync like state with loaded review
  useEffect(() => {
    if (review) {
      setIsLiked(Boolean(review.isLikedByMe));
      setLikeCount(Number(review.likeCount ?? 0));
    }
  }, [review]);

  const [txId, setTxId] = useState<string>("");

  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    client,
    appConfig: {
      app_id: ENV_VARIABLES.WORLD_MINIAPP_ID,
    },
    transactionId: txId,
  });

  useEffect(() => {
    if (isConfirmed && txId && reviewId && session?.user?.id) {
      // Only run once when confirmed
      (async () => {
        try {
          const dbRes = await fetch(`/api/reviews/like`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reviewId,
              userId: session.user.id,
              txHash: txId, // you may replace with waitResult.transaction_hash if backend needs real hash
            }),
          });

          if (!dbRes.ok) {
            const dbResult = await dbRes.json();
            throw new Error(dbResult.error || "DB update failed");
          }

          console.log("✅ Like successfully saved to database");
        } catch (err) {
          console.error("DB sync failed", err);
        }
      })();
    }
  }, [isConfirmed, txId, reviewId, session?.user?.id]);

  const handleLike = async () => {
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
              BigInt(reviewId),
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

      // ✅ Save txId so the hook starts tracking
      setTxId(finalPayload.transaction_id);

    } catch (err) {
      console.error(err);
      setIsLiked((prev) => !prev);
      setLikeCount((prev) => Math.max(0, prev - 1));
      alert((err as Error).message);
    }
  };


  // Share functions
  const shareOnFacebook = () => {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
      window.location.href
    )}`;
    window.open(shareUrl, "_blank", "width=600,height=400");
    setShowShareOptions(false);
  };

  const shareOnInstagram = () => {
    const text = `Check out this review of "${review?.title ?? ""}" by ${review?.username ?? ""
      } on FlickShare!`;
    navigator.clipboard.writeText(`${text} ${window.location.href}`);
    window.open("https://www.instagram.com/", "_blank");
    setShowShareOptions(false);
  };

  const shareOnX = () => {
    const text = `Check out this review of "${review?.title ?? ""}" by ${review?.username ?? ""
      } on FlickShare!`;
    const shareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(
      text
    )}&url=${encodeURIComponent(window.location.href)}`;
    window.open(shareUrl, "_blank", "width=600,height=400");
    setShowShareOptions(false);
  };

  const truncateHash = (hash: string) => {
    if (!hash) return "";
    if (hash.length <= 10) return hash;
    return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
  };

  const getSupporterTier = (amount: number) => {
    if (amount >= 5) return { tier: "Gold Supporter", color: "text-yellow-600" };
    if (amount >= 2) return { tier: "Silver Supporter", color: "text-gray-500" };
    return { tier: "Bronze Supporter", color: "text-amber-600" };
  };

  const getAnalyticsData = useMemo(() => {
    const tierCounts = { Bronze: 0, Silver: 0, Gold: 0 };
    let totalWLD = 0;

    const supporterTotals: { [key: string]: number } = {};

    transactions.forEach((tx) => {
      const { tier } = getSupporterTier(tx.amount);
      const tierName = tier.split(" ")[0] as "Bronze" | "Silver" | "Gold";
      tierCounts[tierName]++;
      totalWLD += tx.amount;

      supporterTotals[tx.from] = (supporterTotals[tx.from] ?? 0) + tx.amount;
    });

    const topSupporters = Object.entries(supporterTotals)
      .map(([username, total]) => ({ username, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const average = transactions.length ? totalWLD / transactions.length : 0;

    const pieData = [
      { name: "Bronze", value: tierCounts.Bronze, color: "#d97706" },
      { name: "Silver", value: tierCounts.Silver, color: "#6b7280" },
      { name: "Gold", value: tierCounts.Gold, color: "#ca8a04" },
    ].filter((item) => item.value > 0);

    return { pieData, totalWLD, tierCounts, topSupporters, average };
  }, [transactions]);

  const formatDateTime = (tx: Tx) => {
    const d = tx.createdAt
      ? new Date(tx.createdAt)
      : tx.date && tx.time
        ? new Date(`${tx.date}T${tx.time}`)
        : null;

    if (!d || isNaN(d.getTime())) return "";

    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // X (formerly Twitter) icon
  const XIcon = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );

  return (
    // Add exclamatin mark as prefix of each className to override parent styles
    <div className="!min-h-screen !bg-gray-50 !w-full !max-w-md !mx-auto">
      {/* Header */}
      <div className="!bg-white !px-4 !py-3 !flex !items-center !justify-between !border-b">
        <button onClick={() => router.back()} className="p-1" aria-label="Back">
          <ArrowLeft className="!w-6 !h-6 !text-gray-600" />
        </button>
        <button
          onClick={() => setShowShareOptions(!showShareOptions)}
          className="!p-2 !rounded-full !hover:bg-gray-100 !transition-colors"
          aria-label="Share"
        >
          <Share2 className="!w-5 !h-5 !text-gray-600" />
        </button>
      </div>

      {/* Share Options Popup */}
      {showShareOptions && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-20 z-20 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-xs">
            <h3 className="text-lg font-bold mb-4 text-center">Share Review</h3>
            <div className="flex justify-center gap-4">
              <button
                onClick={shareOnFacebook}
                className="!flex !flex-col !items-center !gap-2 !p-3 !rounded-xl !hover:bg-blue-50 !transition-colors"
              >
                <div className="!w-12 !h-12 !bg-blue-600 !rounded-full !flex !items-center !justify-center">
                  <Facebook className="!w-6 !h-6 !text-white" />
                </div>
                <span className="!text-sm !font-medium">Facebook</span>
              </button>
              <button
                onClick={shareOnInstagram}
                className="!flex !flex-col !items-center !gap-2 !p-3 !rounded-xl !hover:bg-pink-50 !transition-colors"
              >
                <div className="!w-12 !h-12 !bg-gradient-to-br !from-purple-600 !via-pink-600 !to-orange-400 !rounded-full !flex !items-center !justify-center">
                  <Instagram className="!w-6 !h-6 !text-white" />
                </div>
                <span className="!text-sm !font-medium">Instagram</span>
              </button>
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

      {/* Loading / Error / Not found states */}
      {loading && (
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-white rounded-lg border" />
            <div className="h-10 bg-white rounded-lg border" />
            <div className="h-40 bg-white rounded-lg border" />
          </div>
        </div>
      )}
      {!loading && error && (
        <div className="p-4">
          <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">
            {error}
          </div>
        </div>
      )}
      {!loading && !error && !review && (
        <div className="p-4">
          <div className="bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg p-3 text-sm">
            Review not found.
          </div>
        </div>
      )}

      {!loading && !error && review && (
        <>
          {/* Review Card */}
          <div className="bg-white p-4 border-b">
            <div className="flex gap-3">
              <Image
                src={review.poster}
                alt={review.title}
                width={64}
                height={96}
                className="rounded-lg object-cover flex-shrink-0"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600 mb-1">
                      Review by {review.username}
                    </p>
                    <h2 className="text-lg font-bold mb-2 leading-tight">
                      {review.title}
                    </h2>
                  </div>

                  {/* Like Button */}
                  <div className="flex flex-col items-center ml-2 mr-2">
                    <button
                      onClick={handleLike}
                      className="p-1 text-gray-600 hover:text-black transition-all duration-200"
                      aria-label={isLiked ? "Unlike" : "Like"}
                    >
                      <ThumbsUp
                        className={`w-5 h-5 transition-all duration-200 ${isLiked
                          ? "stroke-blue-500 fill-transparent"
                          : "stroke-current fill-transparent"
                          }`}
                        strokeWidth={2}
                      />
                    </button>
                    <span className="text-xs text-gray-500 mt-1">{likeCount}</span>
                  </div>
                </div>

                <div className="flex items-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < (review.rating ?? 0)
                        ? "text-yellow-400 fill-current"
                        : "text-gray-300"
                        }`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Coins className="w-4 h-4" />
                  <span>Supported by {review.totalSupport} coins</span>
                </div>
              </div>
            </div>

            {/* Review Text */}
            <div className="mt-4">
              <p className="text-gray-800 text-sm leading-relaxed">{review.reviewText}</p>
            </div>
          </div>

          {/* Support Button */}
          <div className="p-4 bg-white border-b">
            <button
              onClick={() => router.push(`/support/${reviewId}`)}
              className="!w-full !bg-black !text-white !py-3 !rounded-lg !font-medium"
            >
              Support
            </button>
          </div>

          {/* Supporters Section Header */}
          <div className="bg-white p-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-black">Supporters</h3>

              {/* Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-gray-700 hover:text-black transition-colors"
                >
                  {activeView === "history" ? "History" : "Analytics"}
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${dropdownOpen ? "rotate-180" : ""
                      }`}
                  />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-28 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden z-10">
                    <button
                      onClick={() => {
                        setActiveView("history");
                        setDropdownOpen(false);
                      }}
                      className={`!w-full !text-left !px-3 !py-2 !text-sm !transition-colors ${activeView === "history"
                        ? "!bg-black !text-white"
                        : "!text-gray-700 !hover:bg-gray-50"
                        }`}
                    >
                      History
                    </button>
                    <button
                      onClick={() => {
                        setActiveView("analytics");
                        setDropdownOpen(false);
                      }}
                      className={`!w-full !text-left !px-3 !py-2 !text-sm !transition-colors ${activeView === "analytics"
                        ? "!bg-black !text-white"
                        : "!text-gray-700 !hover:bg-gray-50"
                        }`}
                    >
                      Analytics
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Conditional Content */}
          {activeView === "history" ? (
            /* History View - Supporter Cards */
            <div className="bg-white p-3">
              <div className="space-y-1">
                {transactions.map((tx) => {
                  const dateTime = formatDateTime(tx);
                  const { tier, color } = getSupporterTier(tx.amount);

                  return (
                    <div
                      key={tx.id}
                      className="border border-gray-200 rounded p-2 bg-white hover:bg-gray-50 transition-colors"
                    >
                      {/* Main Row: Supporter + Amount */}
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="w-3 h-3 text-gray-600" />
                          </div>
                          <span className="font-medium text-black text-sm">{tx.from}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600 flex items-center justify-end gap-1 text-sm">
                            <Coins className="w-3 h-3" />
                            {tx.amount} WLD
                          </div>
                          <div className={`text-xs text-right ${color}`}>
                            {tier.split(" ")[0]}
                          </div>
                        </div>
                      </div>

                      {/* Date Row */}
                      <div className="mb-1">
                        <span className="text-gray-600 text-xs">{dateTime}</span>
                      </div>

                      {/* Hash + View Row */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-gray-400 bg-gray-50 px-1 py-0.5 rounded">
                          {truncateHash(tx.txHash)}
                        </span>
                        {tx.explorerUrl ? (
                          <a
                            href={tx.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-black transition-colors flex items-center gap-1 text-xs"
                          >
                            View
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-gray-300 text-xs">No explorer link</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Analytics View */
            <div className="bg-white p-3">
              {(() => {
                const { pieData, totalWLD, tierCounts, topSupporters, average } =
                  getAnalyticsData;

                return (
                  <>
                    {/* Summary Stats */}
                    <div className="mb-4">
                      <div className="text-center mb-3">
                        <div className="text-2xl font-bold text-green-600 mb-1">
                          {totalWLD} WLD
                        </div>
                        <div className="text-gray-600 text-xs">Total Received</div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="font-bold text-gray-600 text-sm">
                            {tierCounts.Bronze}
                          </div>
                          <div className="text-xs text-gray-600">Bronze</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="font-bold text-gray-600 text-sm">
                            {tierCounts.Silver}
                          </div>
                          <div className="text-xs text-gray-600">Silver</div>
                        </div>
                        <div className="text-center p-2 bg-gray-50 rounded">
                          <div className="font-bold text-gray-600 text-sm">
                            {tierCounts.Gold}
                          </div>
                          <div className="text-xs text-gray-600">Gold</div>
                        </div>
                      </div>
                    </div>

                    {/* Average Support */}
                    <div className="mb-4 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                      <h4 className="font-semibold text-sm mb-4 text-center text-gray-800">
                        Support Statistics
                      </h4>

                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex flex-col items-center justify-center">
                          <div className="text-lg font-bold text-gray-900">
                            {average.toFixed(1)} <span className="text-green-600">WLD</span>
                          </div>
                          <div className="text-xs text-gray-500">Average</div>
                        </div>
                      </div>
                    </div>

                    {/* Top Supporters */}
                    <div className="mb-4">
                      <h4 className="font-semibold text-xs mb-2 text-gray-700">
                        Top Supporters
                      </h4>
                      <div className="space-y-1">
                        {topSupporters.map((supporter, index) => (
                          <div
                            key={supporter.username}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white
                            ${index === 0
                                    ? "bg-yellow-500"
                                    : index === 1
                                      ? "bg-gray-400"
                                      : index === 2
                                        ? "bg-amber-600"
                                        : "bg-gray-300"
                                  }`}
                              >
                                {index + 1}
                              </div>
                              <span className="font-medium text-xs">
                                {supporter.username}
                              </span>
                            </div>
                            <div className="font-bold text-green-600 text-xs">
                              {supporter.total} WLD
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pie Chart */}
                    <div className="mb-3">
                      <h4 className="font-semibold text-xs text-center mb-2 text-gray-700">
                        Supporter Breakdown
                      </h4>
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={70}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: any, name: any) => [
                                `${value} supporters`,
                                name,
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Note */}
                    <div className="text-center text-xs text-gray-500 p-2">
                      <p>
                        <strong>Note:</strong> Analytics calculated from all support
                        transactions. Top supporters ranked by total contribution.
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </>
      )}

      {/* Space for bottom nav */}
      <div className="h-20"></div>
    </div>
  );
};

export default ReviewSupportUI;

