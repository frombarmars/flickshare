"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import { useWaitForTransactionReceipt } from "@worldcoin/minikit-react";
import FlickShareContractABI from "@/abi/FlickShareContract.json";
import client from "@/lib/worldClient";
import { useSession } from "next-auth/react";
import { ENV_VARIABLES } from "@/constants/env_variables";
import { decodeAbiParameters, parseAbiParameters } from "viem";
import { getReviewCounter } from "@/lib/contract_utility/getReviewCounter";
import { useParams } from "next/navigation";

interface FormErrors {
  movie?: string;
  review?: string;
  rating?: string;
  submit?: string;
}

interface MovieSuggestion {
  id: number;
  title: string;
  poster_path: string | null;
  release_date?: string;
}

export default function AddReview() {
  const { data: session } = useSession();
  const { tmdbId } = useParams<{ tmdbId?: string }>();
  const [movie, setMovie] = useState("");
  const [movieId, setMovieId] = useState(0);
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchResults, setSearchResults] = useState<MovieSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [transactionId, setTransactionId] = useState<string>("");
  const [dailyCount, setDailyCount] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number>(5);

  const savedToDbRef = useRef(false); // prevent double POST after confirmation
  const WORD_LIMIT = 200;

  const wordCount = review.trim() ? review.trim().split(/\s+/).length : 0;

  useEffect(() => {
    if (!tmdbId) return;

    // Fetch movie details directly from TMDB by ID
    async function fetchMovieById() {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${tmdbId}?language=en-US`,
          {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${ENV_VARIABLES.TMDB_API_KEY}`,
            },
          }
        );
        const data = await res.json();
        setMovie(data.title);
        setMovieId(data.id);
      } catch (err) {
        console.error("Failed to fetch movie details:", err);
      }
    }

    fetchMovieById();
  }, [tmdbId]);

  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};
    if (!movie.trim()) newErrors.movie = "Movie title is required";
    if (!review.trim()) newErrors.review = "Please write a review";
    if (wordCount > WORD_LIMIT)
      newErrors.review = `Review must be ${WORD_LIMIT} words or less`;
    if (rating === 0) newErrors.rating = "Please select a rating";
    if (!session?.user?.id)
      newErrors.submit = "Please sign in to submit a review";
    return newErrors;
  };

  useEffect(() => {
    async function fetchDailyCount() {
      if (!session?.user?.id) return;

      try {
        const res = await fetch(`/api/reviews/count?userId=${session.user.id}`);
        const { count } = await res.json();
        setDailyCount(count);
        setRemaining(5 - count);
      } catch (err) {
        console.error("Failed to fetch daily review count", err);
      }
    }

    fetchDailyCount();
  }, [session?.user?.id]);
  // Track tx confirmation
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      client,
      appConfig: {
        app_id: ENV_VARIABLES.WORLD_MINIAPP_ID,
      },
      transactionId,
    });

  // Save review to DB once on-chain tx is confirmed
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
            movieId: movieId.toString(), // tmdbId
            reviewerId: session.user.id,
            numericId: counter,
            comment: review,
            rating: rating,
            txHash: transactionId,
          }),
        });

        const data = await res.json();

        if (res.ok) {
          setSuccessMessage(
            "Review confirmed on-chain and saved! +10 points awarded."
          );
          // Reset form
          setMovie("");
          setMovieId(0);
          setReview("");
          setRating(0);
        } else {
          setErrors({
            submit: data.error || "Failed to save review, please try again.",
          });
          savedToDbRef.current = false; // allow retry if needed
        }
      } catch (err) {
        console.error("Error saving review to DB:", err);
        setErrors({ submit: "Error saving review. Please try again." });
        savedToDbRef.current = false;
      }
    }

    saveReview();
  }, [isConfirmed, transactionId, movieId, review, rating, session?.user?.id]);

  // Fetch from TMDB (Bearer auth)
  const fetchMovies = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setSearchLoading(true);
      const res = await fetch(
        `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(
          query
        )}&include_adult=false&language=en-US&page=1`,
        {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${ENV_VARIABLES.TMDB_API_KEY}`, // FIX: TMDB requires Bearer
          },
        }
      );
      const data = await res.json();
      setSearchResults(data.results?.slice(0, 5) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (movie) fetchMovies(movie);
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [movie, fetchMovies]);

  const handleMovieSelect = (title: string, id: number) => {
    setMovie(title);
    setMovieId(id);
    setShowDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrors({});

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      // Proceed as usual
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

  const isSubmitDisabled = loading || isConfirming || !session?.user?.id;

  if (dailyCount !== null && remaining <= 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-800">
            Daily Limit Reached
          </h1>
          <p className="mt-2 text-gray-600">
            You’ve already submitted 5 reviews today. Please come back tomorrow.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg mb-8 text-center">
        <h1 className="text-xl font-light text-gray-900">Add Review</h1>
        {/* 👇 Daily remaining reviews info */}
        {dailyCount !== null && (
          <p className="mt-2 text-sm text-gray-500 text-center">
            You can submit {remaining} more review(s) today.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-6">
        {/* Movie Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search for a movie..."
            value={movie}
            onChange={(e) => {
              setMovie(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => movie && setShowDropdown(true)}
            className={`!w-full !h-14 !px-6 !bg-gray-50 !rounded-2xl !border-2 !text-gray-700 !placeholder-gray-400 !focus:outline-none !transition-all !duration-200 ${
              errors.movie
                ? "!border-red-300 !focus:border-red-400"
                : "!border-gray-200 !focus:border-gray-400 !hover:border-gray-300"
            }`}
          />
          <Search className="!absolute !right-6 !top-1/2 !-translate-y-1/2 !text-gray-400" />
          {errors.movie && (
            <p className="mt-2 text-sm text-red-500 px-2">{errors.movie}</p>
          )}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-white rounded-2xl shadow-xl border border-gray-200 mt-2 max-h-80 overflow-y-auto z-50">
              {searchLoading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                </div>
              ) : (
                searchResults.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleMovieSelect(m.title, m.id)}
                    className="!w-full !flex !items-center !gap-4 !px-4 !py-3 !hover:bg-gray-50 !transition-colors !text-left"
                  >
                    {m.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
                        alt={m.title}
                        width={48}
                        height={72}
                        className="!rounded-lg !shadow-sm"
                      />
                    ) : (
                      <div className="!w-12 !h-18 !bg-gray-200 !rounded-lg !flex !items-center !justify-center">
                        <span className="!text-gray-400 !text-xs">No Img</span>
                      </div>
                    )}
                    <div className="!flex-1 !min-w-0">
                      <p className="!font-medium !text-gray-800 !truncate">
                        {m.title}
                      </p>
                      <p className="!text-sm !text-gray-500">
                        {m.release_date
                          ? new Date(m.release_date).getFullYear()
                          : "Unknown"}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Rating */}
        <div className="rounded-2xl px-5 py-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <label className="text-gray-700 font-medium text-sm">Rating:</label>
            <div className="flex items-center gap-0.5 mx-4">
              {[1, 2, 3, 4, 5].map((star) => {
                const currentRating = hoveredRating || rating;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="!relative !w-8 !h-8 !flex !items-center !justify-center"
                    aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                  >
                    <svg
                      className={`!w-8 !h-8 ${
                        currentRating >= star
                          ? "!text-yellow-400"
                          : "!text-gray-300"
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.84-.197-1.54-1.118l1.07-3.292A1 1 0 0 0 4.7 10.753L1.9 8.72c-.783-.57-.38-1.81.588-1.81H5.95a1 1 0 0 0 .951-.69l1.07-3.292Z" />
                    </svg>
                  </button>
                );
              })}
            </div>
            <div className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm min-w-[60px] text-center">
              <span className="text-base font-semibold text-gray-800">
                {hoveredRating > 0 ? hoveredRating : rating > 0 ? rating : "—"}
              </span>
              <span className="text-gray-500 text-sm ml-0.5">/5</span>
            </div>
          </div>
          {errors.rating && (
            <p className="mt-2 text-sm text-red-500 text-center">
              {errors.rating}
            </p>
          )}
        </div>

        {/* Review */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center">
            <label className="text-gray-700 font-medium">Your Review</label>
            <span
              className={`text-sm ${
                wordCount > WORD_LIMIT ? "text-red-500" : "text-gray-500"
              }`}
            >
              {wordCount}/{WORD_LIMIT} words
            </span>
          </div>
          <textarea
            placeholder="Share your thoughts..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={6}
            className="!w-full !px-5 !py-4 !text-gray-700 !placeholder-gray-400 !resize-none !focus:outline-none !bg-transparent"
          />
          {errors.review && (
            <div className="px-5 pb-4">
              <p className="text-sm text-red-500">{errors.review}</p>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="!w-full !h-14 !bg-black !hover:bg-gray-800 !disabled:bg-gray-400 !text-white !font-medium !rounded-2xl !transition-all !duration-200 shadow-lg"
        >
          {loading
            ? "Submitting..."
            : isConfirming
            ? "Confirming on-chain..."
            : !session?.user?.id
            ? "Sign in to submit"
            : "Submit Review"}
        </button>

        {/* Messages */}
        {errors.submit && (
          <div className="text-center p-4 bg-red-50 rounded-2xl border border-red-200">
            <p className="text-red-600 text-sm">{errors.submit}</p>
          </div>
        )}
        {successMessage && (
          <div className="text-center p-4 bg-green-50 rounded-2xl border border-green-200">
            <p className="text-green-600 text-sm font-medium">
              {successMessage}
            </p>
          </div>
        )}
      </form>
    </div>
  );
}
