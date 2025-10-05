
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import { useWaitForTransactionReceipt } from "@worldcoin/minikit-react";
import FlickShareContractABI from "@/abi/FlickShareContract.json";
import client from "@/lib/worldClient";
import { ENV_VARIABLES } from "@/constants/env_variables";
import { decodeAbiParameters, parseAbiParameters } from "viem";
import { getReviewCounter } from "@/lib/contract_utility/getReviewCounter";

interface UseSubmitReviewProps {
  movieId: number;
  review: string;
  rating: number;
  setErrors: (errors: any) => void;
  setSuccessMessage: (message: string) => void;
  setMovie: (movie: string) => void;
  setMovieId: (movieId: number) => void;
  setReview: (review: string) => void;
  setRating: (rating: number) => void;
}

export const useSubmitReview = ({
  movieId,
  review,
  rating,
  setErrors,
  setSuccessMessage,
  setMovie,
  setMovieId,
  setReview,
  setRating,
}: UseSubmitReviewProps) => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [transactionId, setTransactionId] = useState<string>("");
  const savedToDbRef = useRef(false);

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    client,
    appConfig: {
      app_id: ENV_VARIABLES.WORLD_MINIAPP_ID,
    },
    transactionId,
  });

  useEffect(() => {
    async function saveReview() {
      if (!isConfirmed || !transactionId || savedToDbRef.current) return;
      if (!session?.user?.id) return;

      savedToDbRef.current = true;

      try {
        const counter = await getReviewCounter();
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            movieId: movieId.toString(),
            reviewerId: session.user.id,
            numericId: counter,
            comment: review,
            rating: rating,
            txHash: transactionId,
          }),
        });

        const data = await res.json();

        if (res.ok) {
          setSuccessMessage("Review confirmed on-chain and saved! +10 points awarded.");
          setMovie("");
          setMovieId(0);
          setReview("");
          setRating(0);
        } else {
          setErrors({ submit: data.error || "Failed to save review, please try again." });
          savedToDbRef.current = false;
        }
      } catch (err) {
        console.error("Error saving review to DB:", err);
        setErrors({ submit: "Error saving review. Please try again." });
        savedToDbRef.current = false;
      }
    }

    saveReview();
  }, [isConfirmed, transactionId, movieId, review, rating, session?.user?.id, setErrors, setSuccessMessage, setMovie, setMovieId, setReview, setRating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrors({});

    try {
      const userSignal = session?.user?.walletAddress;
      setLoading(true);
      savedToDbRef.current = false;

      const result = await MiniKit.commandsAsync.verify({
        action: "add-review",
        verification_level: VerificationLevel.Orb,
        signal: userSignal,
      });

      if (result.finalPayload.status === "error") {
        setErrors({ submit: "Verification failed, please try again." });
        setLoading(false);
        return;
      }

      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: ENV_VARIABLES.FLICKSHARE_CONTRACT_ADDRESS,
            abi: FlickShareContractABI,
            functionName: "createReview",
            args: [
              movieId,
              review,
              rating,
              result.finalPayload.merkle_root,
              userSignal,
              result.finalPayload.nullifier_hash,
              ENV_VARIABLES.WORLD_MINIAPP_ID,
              "add-review",
              decodeAbiParameters(
                parseAbiParameters("uint256[8]"),
                result.finalPayload.proof as `0x${string}`
              )[0],
            ],
          },
        ],
      });

      if (finalPayload.status === "error") {
        setErrors({ submit: "Transaction failed, please try again." });
      } else {
        setTransactionId(finalPayload.transaction_id);
      }
    } catch (err) {
      console.error("Error sending transaction:", err);
      setErrors({ submit: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return { loading, isConfirming, handleSubmit };
};
