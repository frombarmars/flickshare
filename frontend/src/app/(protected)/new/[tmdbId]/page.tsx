"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Search, X, Award, RefreshCw, Loader2 } from "lucide-react";
import { MiniKit, VerificationLevel } from "@worldcoin/minikit-js";
import { useWaitForTransactionReceipt } from "@worldcoin/minikit-react";
import FlickShareContractABI from "@/abi/FlickShareContract.json";
import client from "@/lib/worldClient";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { ENV_VARIABLES } from "@/constants/env_variables";
import { decodeAbiParameters, parseAbiParameters } from "viem";
import { getReviewCounter } from "@/lib/contract_utility/getReviewCounter";
import { Rating } from "@/components/AddReview/Rating";

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

interface SelectedMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date?: string;
}

export default function AddReview() {
  const { data: session } = useSession();
  const params = useParams();
  const tmdbId = params?.tmdbId as string | undefined;

  const [movie, setMovie] = useState("");
  const [movieId, setMovieId] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState<SelectedMovie | null>(
    null
  );
  const [review, setReview] = useState("");
  const [rating, setRating] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchResults, setSearchResults] = useState<MovieSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [transactionId, setTransactionId] = useState<string>("");
  const [dailyCount, setDailyCount] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number>(5);
  const [fetchingMovie, setFetchingMovie] = useState(false);

  const savedToDbRef = useRef(false); // prevent double POST after confirmation
  const WORD_LIMIT = 200;

  const wordCount = review.trim() ? review.trim().split(/\s+/).length : 0;

  // Fetch movie details from TMDB when tmdbId is provided
  useEffect(() => {
    async function fetchMovieDetails() {
      if (!tmdbId || selectedMovie) return;

      setFetchingMovie(true);
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

        if (res.ok) {
          const movieData = await res.json();
          const movieInfo: SelectedMovie = {
            id: movieData.id,
            title: movieData.title,
            poster_path: movieData.poster_path,
            release_date: movieData.release_date,
          };
          setSelectedMovie(movieInfo);
          setMovie(movieInfo.title);
          setMovieId(movieInfo.id);
        }
      } catch (err) {
        console.error("Failed to fetch movie details:", err);
      } finally {
        setFetchingMovie(false);
      }
    }

    fetchMovieDetails();
  }, [tmdbId, selectedMovie]);

  const validateForm = (): FormErrors => {
    const newErrors: FormErrors = {};
    if (!movie.trim()) newErrors.movie = "Movie title is required";
    if (!review.trim()) {
      newErrors.review = "Please write a review";
    } else if (wordCount < 5) {
      newErrors.review = "Review must be at least 5 words.";
    } else if (wordCount > WORD_LIMIT) {
      newErrors.review = `Review must be ${WORD_LIMIT} words or less`;
    }
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
          // Reset form after short delay
          setTimeout(() => {
            handleClearForm();
            setSuccessMessage("");
          }, 3000);
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

  const handleMovieSelect = (m: MovieSuggestion) => {
    setMovie(m.title);
    setMovieId(m.id);
    setSelectedMovie(m);
    setShowDropdown(false);
    setErrors((prev) => ({ ...prev, movie: undefined }));
  };

  const handleChangeMovie = () => {
    setSelectedMovie(null);
    setMovie("");
    setMovieId(0);
    setErrors((prev) => ({ ...prev, movie: undefined }));
  };

  const handleClearForm = () => {
    setMovie("");
    setMovieId(0);
    setSelectedMovie(null);
    setReview("");
    setRating(0);
    setErrors({});
    setSuccessMessage("");
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

      const { commandPayload, finalPayload } =
        await MiniKit.commandsAsync.sendTransaction({
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

  // Show loading state while fetching movie details
  if (fetchingMovie) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
          <p className="text-gray-600">Loading movie details...</p>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-white flex flex-col items-center px-4 py-6 pb-24">
      {/* Header with Incentive */}
      <div className="w-full max-w-lg mb-6">
        <div className="text-center mb-3">
          <h1 className="text-xl font-semibold text-gray-900">Add Review</h1>
          {dailyCount !== null && (
            <p className="mt-1 text-xs text-gray-600">
              {remaining} review{remaining !== 1 ? "s" : ""} remaining today
            </p>
          )}
        </div>

        {/* Reward Banner */}
        <div className="bg-gray-900 text-white rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0">
              <Award className="w-4 h-4 text-gray-900" />
            </div>
            <div>
              <p className="font-semibold text-sm">Earn 10 Points</p>
              <p className="text-[10px] text-gray-300">
                For each verified review
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Image
              src="/wld_token.png"
              alt="Points"
              width={20}
              height={20}
              className="object-contain"
            />
            <span className="text-base font-bold">+10</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-4">
        {/* Movie Search with Selected Movie Display */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700 block">
            Movie <span className="text-red-500">*</span>
          </label>

          {selectedMovie ? (
            /* Selected Movie Card */
            <div className="bg-gray-50 rounded-xl p-3 border-2 border-gray-200">
              <div className="flex items-start gap-3">
                {selectedMovie.poster_path ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w185${selectedMovie.poster_path}`}
                    alt={selectedMovie.title}
                    width={60}
                    height={90}
                    className="rounded-lg object-cover shadow-sm flex-shrink-0"
                  />
                ) : (
                  <div className="w-15 h-22 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-400 text-[10px]">No Image</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-base leading-tight">
                    {selectedMovie.title}
                  </h3>
                  {selectedMovie.release_date && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      {new Date(selectedMovie.release_date).getFullYear()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Movie Search Input */
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
                className={`!w-full !h-12 !px-4 !bg-gray-50 !rounded-xl !border-2 !text-gray-700 !text-sm !placeholder-gray-400 !focus:outline-none !transition-all !duration-200 ${
                  errors.movie
                    ? "!border-red-300 !focus:border-red-400"
                    : "!border-gray-200 !focus:border-gray-900 !hover:border-gray-300"
                }`}
              />
              <Search className="!absolute !right-4 !top-1/2 !-translate-y-1/2 !text-gray-400 !w-4 !h-4" />
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white rounded-2xl shadow-xl border-2 border-gray-200 mt-2 max-h-80 overflow-y-auto z-50">
                  {searchLoading ? (
                    <div className="p-6 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                    </div>
                  ) : (
                    searchResults.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleMovieSelect(m)}
                        className="!w-full !flex !items-center !gap-4 !px-4 !py-3 !hover:bg-gray-50 !transition-colors !text-left !border-b !border-gray-100 last:!border-b-0"
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
                            <span className="!text-gray-400 !text-xs">
                              No Img
                            </span>
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
          )}
          {errors.movie && (
            <p className="text-xs text-red-500 px-2">{errors.movie}</p>
          )}
        </div>

        {/* Rating */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700 block">
            Rating <span className="text-red-500">*</span>
          </label>
          <Rating rating={rating} setRating={setRating} error={errors.rating} />
        </div>

        {/* Review */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700 block">
            Your Review <span className="text-red-500">*</span>
          </label>
          <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden hover:border-gray-900 transition-colors">
            <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <span className="text-[10px] text-gray-600">Minimum 5 words</span>
              <span
                className={`text-xs font-medium ${
                  wordCount > WORD_LIMIT
                    ? "text-red-500"
                    : wordCount >= 5
                    ? "text-green-600"
                    : "text-gray-500"
                }`}
              >
                {wordCount}/{WORD_LIMIT} words
              </span>
            </div>
            <textarea
              placeholder="Share your thoughts about this movie... What did you love? What could be better?"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={5}
              className="!w-full !px-4 !py-3 !text-gray-700 !placeholder-gray-400 !resize-none !focus:outline-none !bg-transparent !leading-relaxed !text-sm"
            />
            {errors.review && (
              <div className="px-4 pb-3 bg-red-50">
                <p className="text-xs text-red-500">{errors.review}</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 pb-4">
          <button
            type="button"
            onClick={handleClearForm}
            disabled={loading || isConfirming}
            className="!px-4 !py-3 !border-2 !border-gray-200 !text-gray-700 hover:!border-gray-900 hover:!text-gray-900 !font-medium !rounded-xl !transition-all !disabled:opacity-50 !disabled:cursor-not-allowed !flex !items-center !gap-2 !text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="!flex-1 !h-12 !bg-black !hover:bg-gray-800 !disabled:bg-gray-400 !text-white !font-semibold !rounded-xl !transition-all !duration-200 !shadow-lg !active:scale-[0.98] !text-sm"
          >
            {loading
              ? "Submitting..."
              : isConfirming
              ? "Confirming..."
              : !session?.user?.id
              ? "Sign in to submit"
              : "Submit Review"}
          </button>
        </div>

        {/* Messages */}
        {errors.submit && (
          <div className="text-center p-3 bg-white rounded-xl border-2 border-gray-900">
            <p className="text-gray-900 text-xs font-medium">{errors.submit}</p>
          </div>
        )}
        {successMessage && (
          <div className="text-center p-4 bg-gray-900 text-white rounded-xl border-2 border-gray-900 animate-pulse">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                <Award className="w-4 h-4 text-gray-900" />
              </div>
              <p className="text-base font-bold">Success!</p>
            </div>
            <p className="text-xs text-gray-200">{successMessage}</p>
          </div>
        )}
      </form>
    </div>
  );
}
