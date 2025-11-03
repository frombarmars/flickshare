"use client";
import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Star,
  Copy,
  AlertCircle,
  Loader2,
  Check,
  Info,
  Coins,
} from "lucide-react";
import Image from "next/image";
import { MiniKit } from "@worldcoin/minikit-js";
import { useWaitForTransactionReceipt } from "@worldcoin/minikit-react";
import { useSession } from "next-auth/react";
import FlickShareContractABI from "@/abi/FlickShareContract.json";
import WLDTokenContractABI from "@/abi/WLDTokenContract.json";
import client from "@/lib/worldClient";
import { ENV_VARIABLES } from "@/constants/env_variables";
import { useParams, useRouter } from "next/navigation";
import { SupportAmount } from "@/components/SupportAmount";
import { useLocale } from "@/context/LocaleContext";
import { getSupportTranslation } from "@/translations/support";

const SupportPage = () => {
  const params = useParams();
  const router = useRouter();
  const reviewId = params.reviewId;
  const { data: session, status } = useSession();
  const userWalletAddress = session?.user.walletAddress;
  const { locale } = useLocale();

  // Translation helper
  const t = (
    key: Parameters<typeof getSupportTranslation>[1],
    params?: Record<string, string | number>
  ) => getSupportTranslation(locale, key, params);

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
      setErrors((prev) => ({ ...prev, review: t("reviewIdMissing") }));
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
          review: t("failedToLoadReview"),
        }));
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviewData();
  }, [reviewId, locale]);

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
            balance: t("balanceTooLow"),
          }));
        }
      } catch (err) {
        console.error("Failed to fetch balance:", err);
        setErrors((prev) => ({
          ...prev,
          balance: t("failedToLoadBalance"),
        }));
      }
    };

    fetchBalance();
  }, [userWalletAddress, locale, t]);

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
        t("successMessage", {
          amount: selectedAmount.toString(),
          username:
            reviewData?.review?.user?.username ||
            reviewData?.review?.username ||
            t("anonymous"),
        })
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
    locale,
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
          customAmount: t("minimumAmount"),
        }));
      } else if (numValue > currentBalance) {
        setErrors((prev) => ({
          ...prev,
          customAmount: t("exceedsBalance"),
        }));
      } else {
        setErrors((prev) => ({ ...prev, customAmount: undefined }));
      }
    } else if (value !== "") {
      setErrors((prev) => ({
        ...prev,
        customAmount: t("invalidAmount"),
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
      setErrors({ submit: t("minimumAmount") });
      setIsProcessing(false);
      return;
    }

    if (selectedAmount > currentBalance) {
      setErrors({ submit: t("exceedsBalance") });
      setIsProcessing(false);
      return;
    }

    if (!userWalletAddress) {
      setErrors({ submit: t("walletRequiredDescription") });
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
        submit: t("transactionFailed"),
      });
      setIsProcessing(false);
    }
  };

  const getSubmitButtonText = () => {
    if (isProcessing || isConfirming) return t("processingTransaction");
    if (selectedAmount < 0.01) return t("minimumAmount");
    if (selectedAmount > currentBalance) return t("exceedsBalance");
    return `${t("sendSupport")} ${selectedAmount} WLD`;
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
      reviewData?.review?.user?.username ||
      reviewData?.review?.username ||
      "a reviewer"
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
          <p className="text-xs text-gray-500">{t("loadingReview")}</p>
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
              aria-label={t("backToReview")}
            >
              <ArrowLeft className="w-5 h-5 text-black" />
            </button>
            <h1 className="ml-2 text-base font-semibold text-black">
              {t("supportReviewTitle")}
            </h1>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 text-gray-900" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-black mb-1">
                {t("walletRequired")}
              </h2>
              <p className="text-xs text-gray-600">
                {t("walletRequiredDescription")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pb-24 safe-area-inset">
      {/* Header */}
      <div className="!sticky !top-0 !z-50 !bg-white/95 !backdrop-blur-md !border-b !border-gray-200 !shadow-sm">
        <div className="!max-w-2xl !mx-auto">
          <div className="!flex !items-center !px-4 !py-3.5">
            <button
              onClick={() => router.back()}
              className="!p-2 !-ml-2 hover:!bg-gray-100 !rounded-xl !transition-all !duration-200 active:!scale-95 !flex !items-center !justify-center"
              aria-label={t("backToReview")}
            >
              <ArrowLeft className="!w-5 !h-5 !text-gray-900" />
            </button>
            <div className="!ml-3 !flex-1 !min-w-0">
              <h1 className="!text-base !font-bold !text-gray-900">
                {t("supportReviewer")}
              </h1>
              <p className="!text-xs !text-gray-500 !mt-0.5">
                {t("supportDescription")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 pb-8">
        {/* Loading State */}
        {isLoading && (
          <div className="!flex !flex-col !items-center !justify-center !py-24 !animate-in !fade-in !duration-300">
            <div className="!relative">
              <div className="!w-12 !h-12 !rounded-full !border-4 !border-gray-200 !animate-spin"></div>
              <div className="!absolute !inset-0 !w-12 !h-12 !rounded-full !border-4 !border-gray-900 !border-t-transparent !animate-spin"></div>
            </div>
            <p className="!text-sm !text-gray-600 !mt-4 !font-medium">
              {t("loadingReview")}
            </p>
          </div>
        )}

        {/* Error Loading Review */}
        {errors.review && (
          <div className="!border-2 !border-red-200 !rounded-2xl !p-5 !mb-6 !bg-red-50 !animate-in !fade-in !slide-in-from-top-2 !duration-300">
            <div className="!flex !items-start !space-x-3">
              <div className="!w-10 !h-10 !bg-red-100 !rounded-full !flex !items-center !justify-center !flex-shrink-0">
                <AlertCircle className="!w-5 !h-5 !text-red-600" />
              </div>
              <div className="!flex-1">
                <p className="!text-sm !font-semibold !text-red-900">
                  {t("unableToLoad")}
                </p>
                <p className="!text-xs !text-red-700 !mt-1 !leading-relaxed">
                  {errors.review}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {successMessage && (
          <div className="!mb-6 !border-2 !border-green-200 !rounded-2xl !p-6 !bg-gradient-to-br !from-green-50 !to-emerald-50 !shadow-lg !animate-in !zoom-in !fade-in !duration-500">
            <div className="!flex !items-start !space-x-4 !mb-4">
              <div className="!w-12 !h-12 !bg-gradient-to-br !from-green-500 !to-emerald-600 !rounded-full !flex !items-center !justify-center !flex-shrink-0 !shadow-md">
                <Check className="!w-6 !h-6 !text-white !stroke-[3]" />
              </div>
              <div className="!flex-1 !min-w-0">
                <h3 className="!text-base !font-bold !text-green-900 !mb-1">
                  {t("success")}
                </h3>
                <p className="!text-sm !text-green-800 !leading-relaxed !break-words">
                  {successMessage}
                </p>
              </div>
            </div>

            <div className="!space-y-2">
              <button
                onClick={copyToClipboard}
                className="!w-full !flex !items-center !justify-center !space-x-2 !bg-gray-900 !text-white !py-3 !rounded-xl hover:!bg-gray-800 !transition-all !duration-200 active:!scale-[0.98] !text-sm !font-semibold !shadow-md"
              >
                {copied ? (
                  <>
                    <Check className="!w-4 !h-4" />
                    <span>{t("copiedToClipboard")}</span>
                  </>
                ) : (
                  <>
                    <Copy className="!w-4 !h-4" />
                    <span>{t("shareSupport")}</span>
                  </>
                )}
              </button>

              {transactionId && (
                <a
                  href={`https://worldscan.org/tx/${transactionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="!flex !items-center !justify-center !space-x-1 !text-sm !text-green-700 hover:!text-green-900 !font-medium !py-2 !transition-colors"
                >
                  <span>{t("viewTransaction")}</span>
                  <span className="!text-lg">→</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Movie & Review Card */}
        {reviewData && !isLoading && (
          <div className="!mb-6 !border-2 !border-gray-200 !rounded-2xl !overflow-hidden !bg-white !shadow-sm hover:!shadow-md !transition-all !duration-200 !animate-in !fade-in !slide-in-from-bottom-4">
            {/* Movie Header */}
            {reviewData.review.posterPath && (
              <div className="!p-4 !border-b !border-gray-100 !bg-gradient-to-b !from-white !to-gray-50">
                <div className="!flex !gap-4">
                  <div className="!relative !group">
                    <Image
                      src={`https://image.tmdb.org/t/p/w500${reviewData.review.posterPath}`}
                      alt={reviewData.review.movieTitle || "Movie"}
                      width={70}
                      height={105}
                      className="!rounded-xl !object-cover !shadow-md !flex-shrink-0 !border-2 !border-gray-100 !transition-transform !duration-200 group-hover:!scale-[1.02]"
                    />
                  </div>
                  <div className="!flex-1 !min-w-0">
                    <h2 className="!font-bold !text-gray-900 !text-base !leading-tight !mb-2 !line-clamp-2">
                      {reviewData.review.movieTitle}
                    </h2>
                    <div className="!flex !items-center !gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`!w-4 !h-4 !transition-all !duration-200 ${
                            i < parseInt(reviewData.review.rating)
                              ? "!text-yellow-500 !fill-yellow-500"
                              : "!text-gray-300 !fill-gray-300"
                          }`}
                        />
                      ))}
                      <span className="!text-sm !font-bold !text-gray-900 !ml-1.5">
                        {reviewData.review.rating}/5
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reviewer Info */}
            <div className="!p-4 !bg-white">
              <div className="!flex !items-center !gap-3 !mb-3">
                <div className="!w-11 !h-11 !rounded-full !bg-gradient-to-br !from-gray-900 !to-gray-700 !flex !items-center !justify-center !flex-shrink-0 !shadow-md !border-2 !border-white">
                  <span className="!text-white !text-sm !font-bold">
                    {(reviewData.review.handle ||
                      reviewData.review.username ||
                      "U")[1].toUpperCase()}
                  </span>
                </div>
                <div className="!flex-1 !min-w-0">
                  <p className="!font-semibold !text-gray-900 !text-sm !truncate !mb-0.5">
                    {reviewData.review.handle ||
                      reviewData.review.username ||
                      "Anonymous"}
                  </p>
                  <SupportAmount amount={reviewData.review.totalSupport || 0} />
                </div>
              </div>

              {/* Review Content */}
              {reviewData.review.text && (
                <div className="!mt-3 !pt-3 !border-t !border-gray-100">
                  <p className="!text-sm !text-gray-700 !leading-relaxed !line-clamp-4">
                    {reviewData.review.text}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Balance Display */}
        <div className="!mb-6 !bg-gradient-to-br !from-gray-50 !to-gray-100 !border-2 !border-gray-200 !rounded-2xl !p-5 !shadow-sm !animate-in !fade-in !slide-in-from-bottom-2">
          <div className="!flex !items-center !justify-between !mb-3">
            <div className="!flex-1 !min-w-0">
              <p className="!text-xs !font-medium !text-gray-500 !uppercase !tracking-wide !mb-1">
                {t("yourBalance")}
              </p>
              <p className="!text-2xl !font-black !text-gray-900">
                {currentBalance.toFixed(4)}{" "}
                <span className="!text-lg !font-bold !text-gray-600">WLD</span>
              </p>
            </div>
            <div className="!w-14 !h-14 !rounded-full !bg-white !shadow-md !flex !items-center !justify-center !flex-shrink-0 !border-2 !border-gray-100">
              <Image
                src="/wld_token.png"
                alt={t("wldToken")}
                width={48}
                height={48}
                className="!object-contain"
              />
            </div>
          </div>

          {errors.balance && (
            <div className="!mt-3 !pt-3 !border-t !border-gray-300">
              <div className="!flex !items-start !space-x-2 !bg-white/60 !p-2.5 !rounded-lg">
                <AlertCircle className="!w-4 !h-4 !text-orange-600 !mt-0.5 !flex-shrink-0" />
                <p className="!text-xs !text-gray-800 !font-medium !leading-relaxed">
                  {errors.balance}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Amount Selection */}
        {!successMessage && reviewData && (
          <div className="!mb-6 !animate-in !fade-in !slide-in-from-bottom-4 !duration-300">
            <div className="!flex !items-center !justify-between !mb-4">
              <h2 className="!text-base !font-bold !text-gray-900">
                {t("supportAmount")}
              </h2>
              <div className="!flex !items-center !space-x-1.5 !bg-blue-50 !px-3 !py-1.5 !rounded-full !border !border-blue-100">
                <Info className="!w-3.5 !h-3.5 !text-blue-600" />
                <span className="!text-xs !font-semibold !text-blue-700">
                  {t("platformFee")}
                </span>
              </div>
            </div>

            {/* Preset Amounts */}
            <div className="grid grid-cols-4 gap-2.5 mb-3">
              {presetAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => handleAmountSelect(amount)}
                  disabled={amount > currentBalance}
                  className={`
                    relative !p-4 !rounded-xl !font-bold !transition-all !duration-200 !text-center !border-2
                    ${
                      selectedAmount === amount && !showCustomInput
                        ? "!bg-gray-900 !text-white !border-gray-900 !shadow-lg !scale-[1.05] !ring-4 !ring-gray-200"
                        : amount > currentBalance
                        ? "!bg-gray-50 !text-gray-300 !border-gray-200 !cursor-not-allowed"
                        : "!bg-white !border-gray-200 !text-gray-900 hover:!border-gray-900 hover:!shadow-md active:!scale-95"
                    }
                  `}
                >
                  <span className="!text-lg !block !font-black">{amount}</span>
                  <span className="!text-xs !block !opacity-60 !font-semibold !mt-0.5">
                    WLD
                  </span>
                </button>
              ))}
            </div>

            {/* Custom Amount Button */}
            <button
              onClick={handleCustomSelect}
              className={`
                !w-full !p-4 !rounded-xl !font-bold !transition-all !duration-200 !text-sm !border-2
                ${
                  showCustomInput
                    ? "!bg-gray-900 !text-white !border-gray-900 !shadow-lg"
                    : "!bg-white !border-gray-200 !text-gray-900 hover:!border-gray-900 hover:!shadow-md active:!scale-[0.98]"
                }
              `}
            >
              <span className="!flex !items-center !justify-center !gap-2">
                <Coins className="!w-4 !h-4" />
                {t("customAmount")}
              </span>
            </button>

            {/* Custom Input */}
            {showCustomInput && (
              <div className="!mt-4 !space-y-3 !animate-in !slide-in-from-top-2 !fade-in !duration-200">
                <div className="!relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                    placeholder="0.00"
                    className="!w-full !p-4 !pr-16 !border-2 !border-gray-900 !rounded-xl !text-gray-900 !text-lg !font-bold !placeholder-gray-400 focus:!outline-none focus:!ring-4 focus:!ring-gray-200 !transition-all !bg-white !shadow-sm"
                    autoFocus
                  />
                  <span className="!absolute !right-4 !top-1/2 !-translate-y-1/2 !text-gray-600 !text-sm !font-bold !bg-gray-100 !px-2 !py-1 !rounded-lg">
                    WLD
                  </span>
                </div>
                {errors.customAmount && (
                  <div className="!flex !items-start !space-x-2 !bg-red-50 !p-3 !rounded-lg !border !border-red-200">
                    <AlertCircle className="!w-4 !h-4 !text-red-600 !mt-0.5 !flex-shrink-0" />
                    <p className="!text-sm !text-red-800 !font-medium">
                      {errors.customAmount}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Transaction Preview */}
            {selectedAmount >= 0.01 && !errors.customAmount && (
              <div className="!mt-5 !border-2 !border-gray-200 !rounded-2xl !p-5 !bg-gradient-to-br !from-gray-50 !to-white !shadow-sm !space-y-3 !animate-in !slide-in-from-bottom-2 !fade-in !duration-300">
                <div className="!flex !items-center !gap-2 !mb-2">
                  <div className="!w-6 !h-6 !bg-gray-900 !rounded-full !flex !items-center !justify-center">
                    <Info className="!w-3.5 !h-3.5 !text-white" />
                  </div>
                  <h3 className="!text-xs !font-bold !text-gray-900 !uppercase !tracking-wider">
                    {t("transactionPreview")}
                  </h3>
                </div>
                <div className="!space-y-2.5">
                  <div className="!flex !justify-between !text-sm !py-2">
                    <span className="!text-gray-600 !font-medium">
                      {t("youSend")}
                    </span>
                    <span className="!font-bold !text-gray-900">
                      {selectedAmount.toFixed(4)} WLD
                    </span>
                  </div>
                  <div className="!flex !justify-between !text-sm !py-2 !border-t !border-gray-200">
                    <span className="!text-gray-600 !font-medium">
                      {t("platformFeeLabel")}
                    </span>
                    <span className="!font-semibold !text-red-600">
                      -{calculateFee()} WLD
                    </span>
                  </div>
                  <div className="!pt-2 !border-t-2 !border-gray-900 !flex !justify-between !items-center">
                    <span className="!text-sm !font-bold !text-gray-900">
                      {t("reviewerReceives")}
                    </span>
                    <span className="!text-lg !font-black !text-green-600">
                      {calculateReceiverAmount()} WLD
                    </span>
                  </div>
                  <div className="!flex !justify-between !text-sm !pt-2 !border-t !border-gray-200">
                    <span className="!text-gray-600 !font-medium">
                      {t("yourNewBalance")}
                    </span>
                    <span className="!font-semibold !text-gray-700">
                      {getRemainingBalance()} WLD
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        {!successMessage && reviewData && (
          <div className="!space-y-3 !mt-8 !mb-20">
            <button
              onClick={handleSubmit}
              disabled={isSubmitDisabled()}
              className={`
                !w-full !p-4 !rounded-2xl !font-bold !text-base !transition-all !duration-200 !shadow-lg
                ${
                  isSubmitDisabled()
                    ? "!bg-gray-200 !text-gray-400 !cursor-not-allowed !shadow-none"
                    : "!bg-gradient-to-r !from-gray-900 !to-gray-700 !text-white hover:!from-gray-800 hover:!to-gray-600 active:!scale-[0.98] !shadow-xl"
                }
              `}
            >
              {isProcessing || isConfirming ? (
                <span className="!flex !items-center !justify-center !gap-3">
                  <Loader2 className="!w-5 !h-5 !animate-spin" />
                  <span>{t("processingTransaction")}</span>
                </span>
              ) : (
                <span className="!flex !items-center !justify-center !gap-2">
                  <Coins className="!w-5 !h-5" />
                  {getSubmitButtonText()}
                </span>
              )}
            </button>

            {/* Submit Error */}
            {errors.submit && (
              <div className="!border-2 !border-red-200 !rounded-xl !p-4 !bg-red-50 !animate-in !shake !duration-300">
                <div className="!flex !items-start !space-x-3">
                  <div className="!w-8 !h-8 !bg-red-100 !rounded-full !flex !items-center !justify-center !flex-shrink-0">
                    <AlertCircle className="!w-5 !h-5 !text-red-600" />
                  </div>
                  <div className="!flex-1">
                    <p className="!text-sm !font-semibold !text-red-900 !mb-1">
                      {t("transactionError")}
                    </p>
                    <p className="!text-xs !text-red-800 !leading-relaxed">
                      {errors.submit}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Processing Status */}
        {transactionId && !isConfirmed && !successMessage && (
          <div className="!my-6 !border-2 !border-blue-200 !rounded-2xl !p-5 !bg-gradient-to-br !from-blue-50 !to-blue-100/50 !shadow-lg !animate-in !slide-in-from-bottom-4 !fade-in !duration-300">
            <div className="!flex !items-start !space-x-4">
              <div className="!relative !flex-shrink-0">
                <div className="!w-10 !h-10 !bg-gradient-to-br !from-blue-500 !to-blue-600 !rounded-full !flex !items-center !justify-center !shadow-md">
                  <Loader2 className="!w-6 !h-6 !animate-spin !text-white" />
                </div>
                <div className="!absolute !inset-0 !bg-blue-400 !rounded-full !animate-ping !opacity-30" />
              </div>
              <div className="!flex-1 !min-w-0">
                <p className="!text-base !font-bold !text-gray-900 !mb-1">
                  {t("confirmingTransaction")}
                </p>
                <p className="!text-sm !text-gray-700 !mb-3 !leading-relaxed">
                  {t("confirmingDescription")}
                </p>
                <a
                  href={`https://worldscan.org/tx/${transactionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="!inline-flex !items-center !gap-1.5 !px-3 !py-1.5 !bg-white !text-blue-600 !text-xs !font-bold !rounded-lg !border-2 !border-blue-300 hover:!bg-blue-50 hover:!border-blue-400 !transition-all !duration-200 !shadow-sm active:!scale-95"
                >
                  <span>{t("viewOnExplorer")}</span>
                  <span className="!text-base">→</span>
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
