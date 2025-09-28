"use client";
import React, { useEffect, useState } from "react";
import { ArrowLeft, Star, Copy, AlertCircle, Loader2 } from "lucide-react";
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
        console.log(balance);

        // convert from wei
        const balanceInWLD = Number(balance) / 1e18;
        setCurrentBalance(balanceInWLD);
        setErrors((prev) => ({ ...prev, balance: undefined }));

        if (balanceInWLD < 1) {
          setErrors((prev) => ({
            ...prev,
            balance: "Your balance is too low to support this review",
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
          reviewData?.review?.username || "the reviewer"
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

  const presetAmounts = [5, 10, 25, 50];

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
      if (numValue > currentBalance) {
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
        customAmount: "Please enter a valid amount",
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
    if (selectedAmount <= 0) {
      setErrors({ submit: "Please select a valid amount" });
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
      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: ENV_VARIABLES.FLICKSHARE_CONTRACT_ADDRESS as `0x${string}`,
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
            spender: ENV_VARIABLES.FLICKSHARE_CONTRACT_ADDRESS as `0x${string}`,
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
    if (selectedAmount === 0) return "Select amount to continue";
    if (selectedAmount > currentBalance) return "Insufficient balance";
    return `Send ${selectedAmount} WLD`;
  };

  const isSubmitDisabled = () => {
    return (
      selectedAmount === 0 ||
      selectedAmount > currentBalance ||
      isProcessing ||
      isConfirming ||
      !!errors.customAmount
    );
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(
      `Just supported @${
        reviewData?.review?.username || "MovieReviewer2024"
      } with ${selectedAmount} WLD on FlickShare! 🎬✨`
    );
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }

  if (!userWalletAddress) {
    return (
      <div className="min-h-screen bg-white pb-16">
        <div className="flex items-center p-4 border-b border-gray-100">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-50 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-black" />
          </button>
        </div>

        <div className="max-w-md mx-auto px-4 py-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-red-700 text-sm">
              Please connect your wallet to support reviews.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-16">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-100">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-50 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>
        <h1 className="ml-4 text-xl font-semibold text-black">
          Support Review
        </h1>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-black" />
          </div>
        )}

        {/* Error loading review */}
        {errors.review && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-red-700 text-sm">{errors.review}</p>
          </div>
        )}

        {/* Receiver Info */}
        {reviewData && !isLoading && (
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                <Image
                  src={
                    reviewData.review.userProfile ||
                    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
                  }
                  alt={reviewData.review.username}
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>
              <div>
                <div className="font-medium text-black">
                  @{reviewData.review.username}
                </div>
                <div className="flex items-center mt-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 mr-1 ${
                        i < parseInt(reviewData.review.rating)
                          ? "text-yellow-500 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center mt-1 text-sm text-gray-500">
                  {reviewData.review.totalSupport || 0}{" "}
                  <Image
                    src="/wld_token.png" // path to your PNG
                    alt="WLD"
                    width={20} // adjust size as needed
                    height={20} // adjust size as needed
                    className="mr-1"
                  />{" "}
                  received
                </div>
              </div>
            </div>

            {/* Review excerpt */}
            {reviewData.review.content && (
              <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-700 line-clamp-3">
                  {reviewData.review.content}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Current Balance Card */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
          <div className="text-center mb-5">
            <div className="text-3xl font-bold text-black mb-1">
              {currentBalance.toFixed(2)} WLD
            </div>
            <div className="text-sm text-gray-500">Your Balance</div>
          </div>

          {errors.balance && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-yellow-700 text-xs">{errors.balance}</p>
            </div>
          )}
        </div>

        {/* Support Contribution */}
        <div>
          <h2 className="text-lg font-medium text-black mb-4">
            Support Amount
          </h2>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {presetAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => handleAmountSelect(amount)}
                className={`!p-3 !rounded-2xl !font-medium !transition-all !duration-200 ${
                  selectedAmount === amount && !showCustomInput
                    ? "!bg-black !text-white !shadow-lg !scale-105"
                    : "!bg-gray-100 !text-gray-700 !hover:bg-gray-200"
                }`}
                disabled={amount > currentBalance}
              >
                {amount}
              </button>
            ))}
          </div>

          <button
            onClick={handleCustomSelect}
            className={`!w-full !p-3 !border !rounded-2xl !font-medium !transition-colors !mb-3 ${
              showCustomInput
                ? "!border-black !bg-black !text-white"
                : "!border-gray-200 !text-black !hover:border-gray-300"
            }`}
          >
            Custom Amount
          </button>

          {showCustomInput && (
            <div className="animate-fadeIn mb-3 mt-2">
              <input
                type="text"
                inputMode="decimal"
                value={customAmount}
                onChange={handleCustomAmountChange}
                placeholder="Enter amount"
                className="!w-full !p-3 !border !border-gray-200 !rounded-2xl !text-black !placeholder-gray-400 !focus:outline-none !focus:border-black !transition-all !focus:ring-2 !focus:ring-black !focus:ring-opacity-20"
                autoFocus
              />
              {errors.customAmount && (
                <p className="!text-red-500 !text-xs !mt-1 !ml-1 !flex !items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {errors.customAmount}
                </p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitDisabled()}
            className={`!w-full !p-4 !rounded-2xl !font-semibold !text-lg !transition-all !duration-200 !mt-4 ${
              isSubmitDisabled()
                ? "!bg-gray-200 !text-gray-400 !cursor-not-allowed"
                : "!bg-black !text-white !hover:bg-gray-800 !transform !hover:scale-[1.02] !active:scale-[0.98] !shadow-lg"
            }`}
          >
            {isProcessing || isConfirming ? (
              <div className="flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                {getSubmitButtonText()}
              </div>
            ) : (
              getSubmitButtonText()
            )}
          </button>

          {/* General Errors */}
          {errors.submit && (
            <div className="!mt-4 !p-3 !bg-red-50 !border border-red-200 rounded-xl flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-red-700 text-sm">{errors.submit}</p>
            </div>
          )}
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <p className="text-green-700 text-sm font-medium mb-2">
              {successMessage}
            </p>
            <button
              onClick={copyToClipboard}
              className="flex items-center text-green-600 text-xs"
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy celebration message to share
            </button>
          </div>
        )}

        {/* Tx Status */}
        {transactionId && !isConfirmed && (
          <div className="text-center p-4 bg-blue-50 rounded-2xl border border-blue-200">
            <p className="text-blue-600 text-sm font-medium">
              Transaction submitted!
            </p>
            <a
              href={`https://worldscan.org/tx/${transactionId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 underline mt-1 inline-block"
            >
              View on Explorer
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportPage;
