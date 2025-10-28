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

    const feeBps = 500; // 5%
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
    const fee = selectedAmount * 0.05; // 5% fee
    return fee.toFixed(4);
  };

  const calculateReceiverAmount = () => {
    const receiverAmount = selectedAmount * 0.95; // 95% to reviewer
    return receiverAmount.toFixed(4);
  };

  const getRemainingBalance = () => {
    return (currentBalance - selectedAmount).toFixed(4);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-900 mx-auto mb-2" />
          <p className="text-xs text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userWalletAddress) {
    return (
      <div className="min-h-screen bg-white">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
          <div className="flex items-center px-4 py-3 max-w-2xl mx-auto">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors active:scale-95"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-black" />
            </button>
            <h1 className="ml-2 text-base font-semibold text-black">Support Review</h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 text-gray-900" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-black mb-1">Wallet Required</h2>
              <p className="text-xs text-gray-600">
                Please connect your wallet to support reviews.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24 safe-area-inset">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center px-4 py-3 max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-gray-50 rounded-full transition-colors active:scale-95"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-black" />
          </button>
          <h1 className="ml-2 text-base font-semibold text-black">Support Review</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6 pb-8">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-900 mb-2" />
            <p className="text-xs text-gray-500">Loading...</p>
          </div>
        )}

        {/* Error Loading Review */}
        {errors.review && (
          <div className="border border-gray-200 rounded-xl p-4 mb-4 bg-gray-50">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-gray-900 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-black">Unable to load review</p>
                <p className="text-xs text-gray-600 mt-1">{errors.review}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {successMessage && (
          <div className="!mb-4 !border !border-black !rounded-xl !p-4 !bg-white">
            <div className="!flex !items-start !space-x-3 !mb-3">
              <div className="!w-8 !h-8 !bg-black !rounded-full !flex !items-center !justify-center !flex-shrink-0">
                <Check className="!w-5 !h-5 !text-white" />
              </div>
              <div className="!flex-1 !min-w-0">
                <h3 className="!text-sm !font-semibold !text-black">Success!</h3>
                <p className="!text-xs !text-gray-600 !mt-0.5 !break-words">{successMessage}</p>
              </div>
            </div>
            
            <button
              onClick={copyToClipboard}
              className="!w-full !flex !items-center !justify-center !space-x-2 !bg-black !text-white !py-2.5 !rounded-lg hover:!bg-gray-800 !transition-colors active:!scale-[0.98] !text-sm !font-medium"
            >
              {copied ? (
                <>
                  <Check className="!w-4 !h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="!w-4 !h-4" />
                  <span>Share your support</span>
                </>
              )}
            </button>

            {transactionId && (
              <a
                href={`https://worldscan.org/tx/${transactionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="!block !text-center !text-xs !text-gray-500 hover:!text-black !underline !mt-2"
              >
                View transaction →
              </a>
            )}
          </div>
        )}

        {/* Movie & Review Card */}
        {reviewData && !isLoading && (
          <div className="!mb-4 !border !border-gray-200 !rounded-xl !overflow-hidden !bg-white">
            {/* Movie Header */}
            {reviewData.review.posterPath && (
              <div className="!p-3 !border-b !border-gray-100">
                <div className="!flex !gap-3">
                  <Image
                    src={`https://image.tmdb.org/t/p/w500${reviewData.review.posterPath}`}
                    alt={reviewData.review.movieTitle || "Movie"}
                    width={60}
                    height={90}
                    className="!rounded-lg !object-cover !shadow-sm !flex-shrink-0"
                  />
                  <div className="!flex-1 !min-w-0">
                    <h2 className="!font-semibold !text-black !text-sm !leading-tight !mb-1.5 !line-clamp-2">
                      {reviewData.review.movieTitle}
                    </h2>
                    <div className="!flex !items-center !gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`!w-3.5 !h-3.5 ${
                            i < parseInt(reviewData.review.rating)
                              ? "!text-black !fill-black"
                              : "!text-gray-300 !fill-gray-300"
                          }`}
                        />
                      ))}
                      <span className="!text-xs !font-medium !text-black !ml-1">
                        {reviewData.review.rating}/5
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reviewer Info */}
            <div className="!p-3 !bg-white">
              <div className="!flex !items-center !gap-2.5 !mb-2">
                <div className="!w-8 !h-8 !rounded-full !bg-gray-900 !flex !items-center !justify-center !flex-shrink-0">
                  <span className="!text-white !text-xs !font-semibold">
                    {(reviewData.review.handle || reviewData.review.username || "U")[1].toUpperCase()}
                  </span>
                </div>
                <div className="!flex-1 !min-w-0">
                  <p className="!font-medium !text-black !text-sm !truncate">
                    {reviewData.review.handle || reviewData.review.username || "Anonymous"}
                  </p>
                  <p className="!text-xs !text-gray-500">
                    {reviewData.review.totalSupport || 0} WLD received
                  </p>
                </div>
              </div>

              {/* Review Content */}
              {reviewData.review.text && (
                <div className="!mt-2 !pt-2 !border-t !border-gray-100">
                  <p className="!text-xs !text-gray-700 !leading-relaxed !line-clamp-3">
                    {reviewData.review.text}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Balance Display */}
        <div className="!mb-4 !bg-gray-50 !border !border-gray-200 !rounded-xl !p-4">
          <div className="!flex !items-center !justify-between">
            <div className="!flex-1 !min-w-0">
              <p className="!text-xs !text-gray-500 !mb-0.5">Your Balance</p>
              <p className="!text-xl !font-bold !text-black">{currentBalance.toFixed(4)} WLD</p>
            </div>
            <div className="!w-10 !h-10 !rounded-full !flex !items-center !justify-center !flex-shrink-0">
              <Image
                src="/wld_token.png"
                alt="WLD"
                width={40}
                height={40}
                className="!object-contain"
              />
            </div>
          </div>

          {errors.balance && (
            <div className="!mt-3 !pt-3 !border-t !border-gray-200">
              <div className="!flex !items-start !space-x-2">
                <AlertCircle className="!w-3.5 !h-3.5 !text-gray-900 !mt-0.5 !flex-shrink-0" />
                <p className="!text-xs !text-gray-700">{errors.balance}</p>
              </div>
            </div>
          )}
        </div>

        {/* Amount Selection */}
        {!successMessage && reviewData && (
          <div className="!mb-4">
            <div className="!flex !items-center !justify-between !mb-3">
              <h2 className="!text-sm !font-semibold !text-black">Support Amount</h2>
              <div className="!flex !items-center !space-x-1 !text-xs !text-gray-500">
                <Info className="!w-3 !h-3" />
                <span>5% fee</span>
              </div>
            </div>

            {/* Preset Amounts */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {presetAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleAmountSelect(amount)}
                  disabled={amount > currentBalance}
                  className={`
                    relative !p-3 !rounded-lg !font-semibold !transition-all !text-center
                    ${selectedAmount === amount && !showCustomInput
                      ? "!bg-black !text-white !shadow-md !scale-[1.02]"
                      : amount > currentBalance
                      ? "!bg-gray-100 !text-gray-400 !cursor-not-allowed"
                      : "!bg-white !border !border-gray-200 !text-black hover:!border-black active:!scale-95"
                    }
                  `}
                >
                  <span className="!text-base !block">{amount}</span>
                  <span className="!text-xs !block !opacity-70">WLD</span>
                </button>
              ))}
            </div>

            {/* Custom Amount Button */}
            <button
              onClick={handleCustomSelect}
              className={`
                !w-full !p-3 !rounded-lg !font-medium !transition-all !text-sm
                ${showCustomInput
                  ? "!bg-black !text-white"
                  : "!bg-white !border !border-gray-200 !text-black hover:!border-black active:!scale-[0.98]"
                }
              `}
            >
              Custom Amount
            </button>

            {/* Custom Input */}
            {showCustomInput && (
              <div className="!mt-3 !space-y-2">
                <div className="!relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                    placeholder="0.00"
                    className="!w-full !p-3 !pr-14 !border !border-gray-900 !rounded-lg !text-black !text-base !font-semibold !placeholder-gray-400 focus:!outline-none focus:!ring-2 focus:!ring-black focus:!ring-offset-1"
                    autoFocus
                  />
                  <span className="!absolute !right-3 !top-1/2 !-translate-y-1/2 !text-gray-600 !text-sm !font-medium">
                    WLD
                  </span>
                </div>
                {errors.customAmount && (
                  <div className="!flex !items-start !space-x-2 !text-xs">
                    <AlertCircle className="!w-3.5 !h-3.5 !text-black !mt-0.5 !flex-shrink-0" />
                    <p className="!text-black">{errors.customAmount}</p>
                  </div>
                )}
              </div>
            )}

            {/* Transaction Preview */}
            {selectedAmount >= 0.01 && !errors.customAmount && (
              <div className="!mt-4 !border !border-gray-200 !rounded-lg !p-3 !bg-gray-50 !space-y-2">
                <h3 className="!text-xs !font-semibold !text-gray-500 !uppercase !tracking-wide">
                  Preview
                </h3>
                <div className="!space-y-1.5">
                  <div className="!flex !justify-between !text-xs">
                    <span className="!text-gray-600">You send</span>
                    <span className="!font-semibold !text-black">{selectedAmount.toFixed(4)} WLD</span>
                  </div>
                  <div className="!flex !justify-between !text-xs">
                    <span className="!text-gray-600">Fee (5%)</span>
                    <span className="!font-medium !text-gray-600">-{calculateFee()} WLD</span>
                  </div>
                  <div className="!pt-1.5 !border-t !border-gray-200 !flex !justify-between">
                    <span className="!text-xs !font-medium !text-black">Reviewer gets</span>
                    <span className="!text-sm !font-bold !text-black">{calculateReceiverAmount()} WLD</span>
                  </div>
                  <div className="!flex !justify-between !text-xs !pt-1.5 !border-t !border-gray-200">
                    <span className="!text-gray-600">Remaining</span>
                    <span className="!font-medium !text-gray-600">{getRemainingBalance()} WLD</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        {!successMessage && reviewData && (
          <div className="!space-y-2 !mt-10 !mb-15">
            <button
              onClick={handleSubmit}
              disabled={isSubmitDisabled()}
              className={`
                !w-full !p-3.5 !rounded-lg !font-semibold !text-sm !transition-all
                ${isSubmitDisabled()
                  ? "!bg-gray-200 !text-gray-400 !cursor-not-allowed"
                  : "!bg-black !text-white hover:!bg-gray-800 active:!scale-[0.98] !shadow-md"
                }
              `}
            >
              {isProcessing || isConfirming ? (
                <span className="!flex !items-center !justify-center">
                  <Loader2 className="!w-4 !h-4 !animate-spin !mr-2" />
                  Processing...
                </span>
              ) : (
                getSubmitButtonText()
              )}
            </button>

            {/* Submit Error */}
            {errors.submit && (
              <div className="!border !border-gray-200 !rounded-lg !p-3 !bg-gray-50">
                <div className="!flex !items-start !space-x-2">
                  <AlertCircle className="!w-4 !h-4 !text-black !mt-0.5 !flex-shrink-0" />
                  <p className="!text-xs !text-black">{errors.submit}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Processing Status */}
        {transactionId && !isConfirmed && !successMessage && (
          <div className="!my-4 !border !border-black !rounded-lg !p-3 !bg-white">
            <div className="!flex !items-start !space-x-2.5">
              <Loader2 className="!w-4 !h-4 !animate-spin !text-black !mt-0.5 !flex-shrink-0" />
              <div className="!flex-1 !min-w-0">
                <p className="!text-sm !font-medium !text-black">Processing</p>
                <p className="!text-xs !text-gray-600 !mt-0.5">
                  Waiting for confirmation...
                </p>
                <a
                  href={`https://worldscan.org/tx/${transactionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="!text-xs !text-black !underline !mt-1.5 !inline-block hover:!no-underline"
                >
                  View transaction →
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
