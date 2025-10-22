"use client";
import React, { useEffect, useState } from "react";
import { ArrowLeft, Star, Copy, AlertCircle, Loader2, Check, Info, Coins } from "lucide-react";
import Image from "next/image";
import { MiniKit } from "@worldcoin/minikit-js";
import { useWaitForTransactionReceipt } from "@worldcoin/minikit-react";
import { useSession } from "next-auth/react";
import FlickShareContractABI from "@/abi/FlickShareContract.json";
import WLDTokenContractABI from "@/abi/WLDTokenContract.json";
import client from "@/lib/worldClient";
import { ENV_VARIABLES } from "@/constants/env_variables";
import { useParams, useRouter } from "next/navigation";

const SupportPage = () => {
  const params = useParams();
  const router = useRouter();
  const reviewId = params.reviewId;
  const { data: session, status } = useSession();
  const userWalletAddress = session?.user.walletAddress;

  const [selectedAmount, setSelectedAmount] = useState(0);
  const [customAmount, setCustomAmount] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [transactionId, setTransactionId] = useState<string>("");
  const [errors, setErrors] = useState<{
    submit?: string;
    customAmount?: string;
    balance?: string;
    review?: string;
    transaction?: string;
  }>({});
  const [reviewData, setReviewData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showTransactionPreview, setShowTransactionPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!reviewId) {
      setErrors((prev) => ({ ...prev, review: "Review ID is missing" }));
      return;
    }

    const fetchReviewData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/reviews/${reviewId}`);

        if (!res.ok) {
          throw new Error(
            `Failed to fetch review: ${res.status} ${res.statusText}`
          );
        }

        const data = await res.json();
        setReviewData(data);
        setErrors((prev) => ({ ...prev, review: undefined }));
      } catch {
        console.error("Failed to fetch review:");
        setErrors((prev) => ({
          ...prev,
          review: "Failed to load review data",
        }));
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviewData();
  }, [reviewId]);

  // fetch balance
  useEffect(() => {
    if (!userWalletAddress) return;

    const fetchBalance = async () => {
      try {
        const balance = (await client.readContract({
          address: ENV_VARIABLES.WLD_TOKEN_CONTRACT_ADDRESS as `0x${string}`,
          abi: WLDTokenContractABI,
          functionName: "balanceOf",
          args: [userWalletAddress],
        })) as bigint;

        // convert from wei
        const balanceInWLD = Number(balance) / 1e18;
        setCurrentBalance(balanceInWLD);
        setErrors((prev) => ({ ...prev, balance: undefined }));

        if (balanceInWLD < 0.01) {
          setErrors((prev) => ({
            ...prev,
            balance: "Your balance is too low to support this review (minimum 0.01 WLD)",
          }));
        }
      } catch (err) {
        console.error("Failed to fetch balance:", err);
        setErrors((prev) => ({
          ...prev,
          balance: "Failed to load your balance",
        }));
      }
    };

    fetchBalance();
  }, [userWalletAddress]);

  // track tx confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      client,
      appConfig: {
        app_id: ENV_VARIABLES.WORLD_MINIAPP_ID,
      },
      transactionId,
    });

  // handle UI when tx confirmed
  useEffect(() => {
    if (isConfirmed && reviewData) {
      const saveSupport = async () => {
        try {
          await fetch("/api/support", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              txHash: transactionId,
              userId: session?.user.id, // assuming session.user.id is your DB userId
              reviewId: reviewData.review.id,
              amount: selectedAmount, // store as int WLD
            }),
          });
        } catch (err) {
          console.error("Failed to save support record:", err);
        }
      };

      saveSupport();

      // deduct balance only when confirmed
      setCurrentBalance((prev) => prev - selectedAmount);
      setIsProcessing(false);
      setSuccessMessage(
        `Successfully sent ${selectedAmount} WLD to @${
          reviewData?.review?.user?.username || reviewData?.review?.username || "the reviewer"
        }!`
      );

      setTimeout(() => {
        setSuccessMessage("");
      }, 5000);
    }
  }, [
    isConfirmed,
    selectedAmount,
    reviewData,
    session?.user.id,
    transactionId,
  ]);

  const presetAmounts = [0.01, 0.1, 1, 5];

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setShowCustomInput(false);
    setCustomAmount("");
    setErrors((prev) => ({ ...prev, customAmount: undefined }));
  };

  const handleCustomSelect = () => {
    setShowCustomInput(true);
    setSelectedAmount(0);
    setCustomAmount("");
    setErrors((prev) => ({ ...prev, customAmount: undefined }));
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Allow only numbers and decimal point
    if (!/^\d*\.?\d*$/.test(value)) return;

    setCustomAmount(value);
    const numValue = parseFloat(value) || 0;
    setSelectedAmount(numValue);

    // Validate custom amount
    if (numValue > 0) {
      if (numValue < 0.01) {
        setErrors((prev) => ({
          ...prev,
          customAmount: "Minimum amount is 0.01 WLD",
        }));
      } else if (numValue > currentBalance) {
        setErrors((prev) => ({
          ...prev,
          customAmount: "Amount exceeds your balance",
        }));
      } else {
        setErrors((prev) => ({ ...prev, customAmount: undefined }));
      }
    } else if (value !== "") {
      setErrors((prev) => ({
        ...prev,
        customAmount: "Please enter a valid amount (minimum 0.01 WLD)",
      }));
    } else {
      setErrors((prev) => ({ ...prev, customAmount: undefined }));
    }
  };

  const handleSubmit = async () => {
    // Clear previous errors
    setErrors({});
    setIsProcessing(true);

    // Validation
    if (selectedAmount < 0.01) {
      setErrors({ submit: "Minimum support amount is 0.01 WLD" });
      setIsProcessing(false);
      return;
    }

    if (selectedAmount > currentBalance) {
      setErrors({ submit: "Amount exceeds your balance" });
      setIsProcessing(false);
      return;
    }

    if (!userWalletAddress) {
      setErrors({ submit: "Please connect your wallet" });
      setIsProcessing(false);
      return;
    }

    const feeBps = 500; // 2%
    const supportAmount = BigInt(Math.floor(selectedAmount * 1e18));

    const permitTransfer = {
      permitted: {
        token: ENV_VARIABLES.WLD_TOKEN_CONTRACT_ADDRESS,
        amount: supportAmount.toString(),
      },
      nonce: Date.now().toString(),
      deadline: Math.floor((Date.now() + 30 * 60 * 1000) / 1000).toString(),
    };

    try {
      const { commandPayload, finalPayload } =
        await MiniKit.commandsAsync.sendTransaction({
          transaction: [
            {
              address:
                ENV_VARIABLES.FLICKSHARE_CONTRACT_ADDRESS as `0x${string}`,
              abi: FlickShareContractABI,
              functionName: "supportReviewWithPermit",
              args: [
                reviewId,
                permitTransfer.permitted.amount,
                feeBps,
                [
                  [
                    permitTransfer.permitted.token,
                    permitTransfer.permitted.amount,
                  ],
                  permitTransfer.nonce,
                  permitTransfer.deadline,
                ],
                "PERMIT2_SIGNATURE_PLACEHOLDER_0",
              ],
            },
          ],
          permit2: [
            {
              ...permitTransfer,
              spender:
                ENV_VARIABLES.FLICKSHARE_CONTRACT_ADDRESS as `0x${string}`,
            },
          ],
        });

      if (finalPayload.status === "error") {
        throw new Error(finalPayload.error_code || "Transaction failed");
      } else {
        setTransactionId(finalPayload.transaction_id);
      }
    } catch {
      console.error("Error sending transaction:");
      setErrors({
        submit: "Something went wrong. Please try again.",
      });
      setIsProcessing(false);
    }
  };

  const getSubmitButtonText = () => {
    if (isProcessing || isConfirming) return "Processing...";
    if (selectedAmount < 0.01) return "Select amount to continue (min 0.01 WLD)";
    if (selectedAmount > currentBalance) return "Insufficient balance";
    return `Send ${selectedAmount} WLD`;
  };

  const isSubmitDisabled = () => {
    return (
      selectedAmount < 0.01 ||
      selectedAmount > currentBalance ||
      isProcessing ||
      isConfirming ||
      !!errors.customAmount
    );
  };

  const copyToClipboard = () => {
    const text = `Just supported @${
      reviewData?.review?.user?.username || reviewData?.review?.username || "a reviewer"
    } with ${selectedAmount} WLD on FlickShare! 🎬✨`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const calculateFee = () => {
    const fee = selectedAmount * 0.02; // 2% fee
    return fee.toFixed(4);
  };

  const calculateReceiverAmount = () => {
    const receiverAmount = selectedAmount * 0.98; // 98% to reviewer
    return receiverAmount.toFixed(4);
  };

  const getRemainingBalance = () => {
    return (currentBalance - selectedAmount).toFixed(4);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-black mx-auto mb-3" />
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userWalletAddress) {
    return (
      <div className="min-h-screen bg-white">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="flex items-center px-4 py-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-black" />
            </button>
            <h1 className="ml-3 text-lg font-semibold text-black">Support Review</h1>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-12">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-gray-900" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-black mb-2">Wallet Required</h2>
              <p className="text-gray-600 text-sm">
                Please connect your wallet to support reviews.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center px-4 py-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>
          <h1 className="ml-3 text-lg font-semibold text-black">Support Review</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-black mb-3" />
            <p className="text-sm text-gray-600">Loading review...</p>
          </div>
        )}

        {/* Error Loading Review */}
        {errors.review && (
          <div className="border border-gray-900 rounded-2xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-black mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-black">Unable to load review</p>
                <p className="text-sm text-gray-600 mt-1">{errors.review}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {successMessage && (
          <div className="mb-6 border-2 border-black rounded-2xl p-6 bg-gray-50">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-black text-lg">Success!</h3>
                  <p className="text-sm text-gray-700 mt-1">{successMessage}</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={copyToClipboard}
              className="w-full flex items-center justify-center space-x-2 bg-black text-white py-3 rounded-xl hover:bg-gray-800 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span className="text-sm font-medium">Share your support</span>
                </>
              )}
            </button>

            {transactionId && (
              <a
                href={`https://worldscan.org/tx/${transactionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-xs text-gray-600 hover:text-black underline mt-3"
              >
                View on Explorer →
              </a>
            )}
          </div>
        )}

        {/* Movie & Review Card */}
        {reviewData && !isLoading && (
          <div className="mb-6 border border-gray-200 rounded-2xl overflow-hidden">
            {/* Movie Header */}
            {reviewData.review.posterPath && (
              <div className="bg-gray-50 p-4 border-b border-gray-200">
                <div className="flex gap-4">
                  <Image
                    src={`https://image.tmdb.org/t/p/w500${reviewData.review.posterPath}`}
                    alt={reviewData.review.movieTitle || "Movie"}
                    width={80}
                    height={120}
                    className="rounded-lg object-cover shadow-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-black text-lg leading-tight mb-2">
                      {reviewData.review.movieTitle}
                    </h2>
                    <div className="flex items-center gap-1 mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < parseInt(reviewData.review.rating)
                              ? "text-black fill-black"
                              : "text-gray-300 fill-gray-300"
                          }`}
                        />
                      ))}
                      <span className="text-sm font-medium text-black ml-1">
                        {reviewData.review.rating}/5
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reviewer Info */}
            <div className="p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {(reviewData.review.handle || reviewData.review.username || "U")[1].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-black">
                      {reviewData.review.handle || reviewData.review.username || "Anonymous"}
                    </p>
                    <p className="text-xs text-gray-600">
                      {reviewData.review.totalSupport || 0} WLD received
                    </p>
                  </div>
                </div>
              </div>

              {/* Review Content */}
              {reviewData.review.text && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-700 leading-relaxed line-clamp-4">
                    {reviewData.review.text}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Balance Display */}
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Your Balance</p>
              <p className="text-2xl font-bold text-black">{currentBalance.toFixed(4)} WLD</p>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center">
              <Image
                src="/wld_token.png"
                alt="WLD"
                width={48}
                height={48}
                className="object-contain"
              />
            </div>
          </div>

          {errors.balance && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-gray-900 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-gray-700">{errors.balance}</p>
              </div>
            </div>
          )}
        </div>

        {/* Amount Selection */}
        {!successMessage && reviewData && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-black">Support Amount</h2>
              <div className="flex items-center space-x-1 text-xs text-gray-600">
                <Info className="w-3 h-3" />
                <span>2% platform fee</span>
              </div>
            </div>

            {/* Preset Amounts */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {presetAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleAmountSelect(amount)}
                  disabled={amount > currentBalance}
                  className={`
                    relative p-4 rounded-xl font-semibold transition-all
                    ${selectedAmount === amount && !showCustomInput
                      ? "bg-black text-white shadow-lg scale-105"
                      : amount > currentBalance
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white border-2 border-gray-200 text-black hover:border-gray-900"
                    }
                  `}
                >
                  <span className="text-lg">{amount}</span>
                  <span className="text-xs block mt-0.5 opacity-70">WLD</span>
                </button>
              ))}
            </div>

            {/* Custom Amount Button */}
            <button
              onClick={handleCustomSelect}
              className={`
                w-full p-4 rounded-xl font-medium transition-all
                ${showCustomInput
                  ? "bg-black text-white border-2 border-black"
                  : "bg-white border-2 border-gray-200 text-black hover:border-gray-900"
                }
              `}
            >
              Custom Amount
            </button>

            {/* Custom Input */}
            {showCustomInput && (
              <div className="mt-4 space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                    placeholder="0.00"
                    className="w-full p-4 pr-16 border-2 border-gray-900 rounded-xl text-black text-lg font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
                    style={{ fontSize: '18px' }}
                    autoFocus
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 text-sm font-medium">
                    WLD
                  </span>
                </div>
                {errors.customAmount && (
                  <div className="flex items-start space-x-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-black mt-0.5 flex-shrink-0" />
                    <p className="text-black">{errors.customAmount}</p>
                  </div>
                )}
              </div>
            )}

            {/* Transaction Preview */}
            {selectedAmount >= 0.01 && !errors.customAmount && (
              <div className="mt-6 border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Transaction Preview
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">You send</span>
                    <span className="font-semibold text-black">{selectedAmount.toFixed(4)} WLD</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Platform fee (2%)</span>
                    <span className="font-medium text-gray-700">-{calculateFee()} WLD</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex justify-between">
                    <span className="text-sm font-medium text-black">Reviewer receives</span>
                    <span className="font-bold text-black">{calculateReceiverAmount()} WLD</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="text-gray-600">Your remaining balance</span>
                    <span className="font-medium text-gray-700">{getRemainingBalance()} WLD</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        {!successMessage && reviewData && (
          <div className="space-y-3">
            <button
              onClick={handleSubmit}
              disabled={isSubmitDisabled()}
              className={`
                w-full p-4 rounded-xl font-semibold text-base transition-all
                ${isSubmitDisabled()
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-black text-white hover:bg-gray-800 active:scale-[0.98] shadow-lg"
                }
              `}
            >
              {isProcessing || isConfirming ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Processing...
                </span>
              ) : (
                getSubmitButtonText()
              )}
            </button>

            {/* Submit Error */}
            {errors.submit && (
              <div className="border border-gray-900 rounded-xl p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-black mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-black">{errors.submit}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Processing Status */}
        {transactionId && !isConfirmed && !successMessage && (
          <div className="mt-6 border-2 border-black rounded-xl p-4 bg-white">
            <div className="flex items-start space-x-3">
              <Loader2 className="w-5 h-5 animate-spin text-black mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-black">Transaction Submitted</p>
                <p className="text-sm text-gray-600 mt-1">
                  Waiting for confirmation...
                </p>
                <a
                  href={`https://worldscan.org/tx/${transactionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-black underline mt-2 inline-block hover:no-underline"
                >
                  View on Explorer →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportPage;
