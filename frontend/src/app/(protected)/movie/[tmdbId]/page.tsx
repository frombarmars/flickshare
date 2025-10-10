"use client";
import { SupportAmount } from "@/components/SupportAmount";
import { ENV_VARIABLES } from "@/constants/env_variables";
import { ArrowLeft, Star, User, Share2, Coins, ThumbsUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

const MovieDetailsPage = () => {
  const params = useParams<{ tmdbId: string }>();
  const tmdbId = params?.tmdbId;

  const [movie, setMovie] = useState<any>(null);
  const [credits, setCredits] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState("trending");
  const [showShareOptions, setShowShareOptions] = useState(false);

  // 🔎 Fetch movie details + credits
  useEffect(() => {
    if (!tmdbId) return;

    const fetchMovie = async () => {
      try {
        const res = await fetch(
          `${ENV_VARIABLES.TMDB_BASE_URL}/movie/${tmdbId}`,
          {
            headers: { Authorization: `Bearer ${ENV_VARIABLES.TMDB_API_KEY}` },
          }
        );
        const data = await res.json();
        setMovie(data);
      } catch (err) {
        console.error("Failed to load movie", err);
      }
    };

    const fetchCredits = async () => {
      try {
        const res = await fetch(
          `${ENV_VARIABLES.TMDB_BASE_URL}/movie/${tmdbId}/credits`,
          {
            headers: { Authorization: `Bearer ${ENV_VARIABLES.TMDB_API_KEY}` },
          }
        );
        const data = await res.json();
        setCredits(data);
      } catch (err) {
        console.error("Failed to load credits", err);
      }
    };

    const fetchReviews = async () => {
      try {
        const res = await fetch(`/api/reviews/by-tmdb/${tmdbId}`);
        const data = await res.json();
        setReviews(data.reviews || []);
      } catch (err) {
        console.error("Failed to load reviews", err);
      }
    };

    fetchMovie();
    fetchCredits();
    fetchReviews();
  }, [tmdbId]);

  const getDirectors = () =>
    credits?.crew?.filter((c: any) => c.job === "Director") || [];

  const getTopCast = () => credits?.cast?.slice(0, 5) || [];

  // const truncateText = (text: string, maxLength = 150) =>
  //   text && text.length > maxLength
  //     ? text.substring(0, maxLength) + "..."
  //     : text;

  const getSortedReviews = () => {
    switch (activeFilter) {
      case "trending":
        return [...reviews].sort(
          (a, b) =>
            (b.likes?.length || 0) +
            (b.supports?.length || 0) -
            ((a.likes?.length || 0) + (a.supports?.length || 0))
        );
      case "most_liked":
        return [...reviews].sort(
          (a, b) => (b.likes?.length || 0) - (a.likes?.length || 0)
        );
      case "most_support":
        return [...reviews].sort(
          (a, b) =>
            (b.supports || []).reduce((s: number, x: any) => s + x.amount, 0) -
            (a.supports || []).reduce((s: number, x: any) => s + x.amount, 0)
        );
      default:
        return reviews;
    }
  };

  if (!movie) {
    return (
      <div className="!min-h-screen !bg-gray-50 !flex !items-center !justify-center">
        <div className="!text-center">
          <div className="!w-16 !h-16 !border-4 !border-gray-200 !border-t-gray-600 !rounded-full !animate-spin !mx-auto !mb-4"></div>
          <p className="!text-gray-600 !font-medium">Loading movie details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="!min-h-screen !bg-gray-50 !w-full">
      {/* Enhanced Header - Fully Responsive */}
      <div className="!sticky !top-0 !z-50 !bg-white/95 !backdrop-blur-sm !px-3 sm:!px-4 md:!px-6 !py-3 !flex !items-center !justify-between !border-b !border-gray-200 !shadow-sm !w-full">
        <button 
          onClick={() => window.history.back()} 
          className="!p-2 !rounded-full !bg-gray-100 hover:!bg-gray-200 !transition-colors !duration-200 !flex-shrink-0"
        >
          <ArrowLeft className="!w-5 !h-5 !text-gray-700" />
        </button>
        <h1 className="!text-base sm:!text-lg !font-bold !text-gray-900 !truncate !px-3 !flex-1 !text-center !min-w-0">
          {movie.title}
        </h1>
        <button
          onClick={() => setShowShareOptions(!showShareOptions)}
          className="!p-2 !rounded-full !bg-gray-100 hover:!bg-gray-200 !transition-colors !duration-200 !relative !flex-shrink-0"
        >
          <Share2 className="!w-5 !h-5 !text-gray-700" />
          {showShareOptions && (
            <div className="!absolute !top-12 !right-0 !bg-white !border !border-gray-200 !rounded-lg !shadow-lg !p-2 !min-w-[120px] !z-10">
              <button className="!w-full !text-left !px-3 !py-2 !text-sm hover:!bg-gray-50 !rounded">
                Copy Link
              </button>
            </div>
          )}
        </button>
      </div>

      {/* Enhanced Movie Info - Fully Responsive */}
      <div className="!bg-white !p-3 sm:!p-4 md:!p-5 !shadow-sm !mx-2 sm:!mx-4 md:!mx-6 !mt-2 !rounded-lg">
        <div className="!flex !flex-col sm:!flex-row !gap-3 sm:!gap-4 !mb-4">
          <div className="!relative !flex-shrink-0 !self-center sm:!self-start">
            <Image
              src={`https://image.tmdb.org/t/p/w500${
                movie.posterPath || movie.poster_path || ""
              }`}
              alt={movie.title}
              width={120}
              height={180}
              className="!rounded-xl !object-cover !w-24 !h-36 sm:!w-20 sm:!h-30 md:!w-24 md:!h-36 !shadow-md !mx-auto sm:!mx-0"
            />
            {/* Rating Badge */}
            {movie.vote_average && (
              <div className="!absolute !-top-2 !-right-2 !bg-yellow-500 !text-white !text-xs !font-bold !px-2 !py-1 !rounded-full !shadow-md">
                {movie.vote_average.toFixed(1)}
              </div>
            )}
          </div>
          
          <div className="!flex-1 !min-w-0 !text-center sm:!text-left">
            <h1 className="!text-lg sm:!text-xl md:!text-2xl !font-bold !text-gray-900 !mb-2 !leading-tight !px-2 sm:!px-0">
              {movie.title}
            </h1>
            
            {/* Year and Runtime */}
            <div className="!flex !items-center !justify-center sm:!justify-start !gap-2 sm:!gap-3 !mb-3 !text-sm !text-gray-600 !flex-wrap">
              <span className="!font-medium">
                {new Date(movie.releaseDate || movie.release_date).getFullYear()}
              </span>
              {movie.runtime && (
                <>
                  <span className="!text-gray-400">•</span>
                  <span>{movie.runtime} min</span>
                </>
              )}
            </div>

            {/* Genres */}
            <div className="!flex !flex-wrap !gap-1 sm:!gap-1.5 !mb-3 sm:!mb-4 !justify-center sm:!justify-start">
              {(movie.movieGenres || movie.genres || []).slice(0, window.innerWidth < 640 ? 2 : 3).map((g: any) => (
                <span
                  key={g.genre?.id || g.id}
                  className="!px-2 sm:!px-3 !py-1 !bg-gradient-to-r !from-gray-100 !to-gray-200 !rounded-full !text-xs !font-medium !text-gray-700"
                >
                  {g.genre?.name || g.name}
                </span>
              ))}
              {(movie.movieGenres || movie.genres || []).length > (window.innerWidth < 640 ? 2 : 3) && (
                <span className="!px-2 sm:!px-3 !py-1 !bg-gray-50 !rounded-full !text-xs !text-gray-500">
                  +{(movie.movieGenres || movie.genres || []).length - (window.innerWidth < 640 ? 2 : 3)} more
                </span>
              )}
            </div>

            {/* Director */}
            {getDirectors().length > 0 && (
              <div className="!mb-2 !px-2 sm:!px-0">
                <p className="!text-xs sm:!text-sm !text-gray-700">
                  <span className="!font-semibold !text-gray-800">Director:</span>{" "}
                  <span className="!text-gray-600">
                    {getDirectors()
                      .slice(0, 2)
                      .map((d: any) => d.name)
                      .join(", ")}
                  </span>
                </p>
              </div>
            )}

            {/* Cast */}
            {getTopCast().length > 0 && (
              <div className="!px-2 sm:!px-0">
                <p className="!text-xs sm:!text-sm !text-gray-700">
                  <span className="!font-semibold !text-gray-800">Cast:</span>{" "}
                  <span className="!text-gray-600">
                    {getTopCast()
                      .slice(0, window.innerWidth < 640 ? 2 : 3)
                      .map((c: any) => c.name)
                      .join(", ")}
                    {getTopCast().length > (window.innerWidth < 640 ? 2 : 3) && " and more"}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {(movie.description || movie.overview) && (
          <div className="!mt-4 sm:!mt-5 !pt-3 sm:!pt-4 !border-t !border-gray-100">
            <h3 className="!font-semibold !text-gray-800 !mb-2 !text-center sm:!text-left">Overview</h3>
            <p className="!text-gray-700 !text-sm !leading-relaxed !px-1 sm:!px-0 !text-center sm:!text-left">
              {movie.description || movie.overview}
            </p>
          </div>
        )}
      </div>

      {/* Enhanced Reviews Section - Fully Responsive */}
      <div className="!mt-3 sm:!mt-4 !bg-white !shadow-sm !mx-2 sm:!mx-4 md:!mx-6 !rounded-lg">
        <div className="!p-3 sm:!p-4 md:!p-5 !border-b !border-gray-100">
          <div className="!flex !items-center !justify-between !mb-3 sm:!mb-4 !flex-wrap !gap-2">
            <h3 className="!font-bold !text-lg sm:!text-xl !text-gray-900">Reviews</h3>
            <span className="!text-xs sm:!text-sm !text-gray-500 !font-medium !bg-gray-100 !px-2 !py-1 !rounded-full">
              {reviews.length} review{reviews.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Enhanced Add Review Button - Responsive */}
          <button
            onClick={() => (window.location.href = `/new/${tmdbId}`)}
            className="!w-full !py-3 sm:!py-4 !bg-gradient-to-r !from-gray-900 !to-gray-700 !text-white !rounded-lg sm:!rounded-xl !font-semibold !shadow-lg hover:!shadow-xl hover:!from-gray-800 hover:!to-gray-600 !transition-all !duration-200 !transform hover:!scale-[1.02] !text-sm sm:!text-base"
          >
            ✍️ Write Your Review
          </button>
        </div>

        {/* Enhanced Filter buttons - Responsive */}
        <div className="!px-3 sm:!px-4 md:!px-5 !py-3 sm:!py-4 !bg-gray-50">
          <div className="!flex !gap-1.5 sm:!gap-2 !overflow-x-auto !pb-1 !scrollbar-hide">
            <button
              onClick={() => setActiveFilter("trending")}
              className={`!px-3 sm:!px-4 !py-1.5 sm:!py-2 !rounded-full !text-xs sm:!text-sm !font-medium !whitespace-nowrap !transition-all !duration-200 !flex-shrink-0 ${
                activeFilter === "trending"
                  ? "!bg-gray-900 !text-white !shadow-md"
                  : "!bg-white !text-gray-700 !border !border-gray-200 hover:!bg-gray-100"
              }`}
            >
              🔥 Trending
            </button>
            <button
              onClick={() => setActiveFilter("most_liked")}
              className={`!px-3 sm:!px-4 !py-1.5 sm:!py-2 !rounded-full !text-xs sm:!text-sm !font-medium !whitespace-nowrap !transition-all !duration-200 !flex-shrink-0 ${
                activeFilter === "most_liked"
                  ? "!bg-gray-900 !text-white !shadow-md"
                  : "!bg-white !text-gray-700 !border !border-gray-200 hover:!bg-gray-100"
              }`}
            >
              👍 Most Liked
            </button>
            <button
              onClick={() => setActiveFilter("most_support")}
              className={`!px-3 sm:!px-4 !py-1.5 sm:!py-2 !rounded-full !text-xs sm:!text-sm !font-medium !whitespace-nowrap !transition-all !duration-200 !flex-shrink-0 ${
                activeFilter === "most_support"
                  ? "!bg-gray-900 !text-white !shadow-md"
                  : "!bg-white !text-gray-700 !border !border-gray-200 hover:!bg-gray-100"
              }`}
            >
              💰 Most Support
            </button>
          </div>
        </div>

        {/* Enhanced Reviews List - Fully Responsive */}
        <div className="!px-3 sm:!px-4 md:!px-5 !pb-4 sm:!pb-5">
          {getSortedReviews().length === 0 ? (
            <div className="!text-center !py-8 sm:!py-12">
              <div className="!w-12 !h-12 sm:!w-16 sm:!h-16 !bg-gray-100 !rounded-full !flex !items-center !justify-center !mx-auto !mb-3 sm:!mb-4">
                <Star className="!w-6 !h-6 sm:!w-8 sm:!h-8 !text-gray-400" />
              </div>
              <p className="!text-gray-500 !font-medium !mb-2 !text-sm sm:!text-base">No reviews yet</p>
              <p className="!text-xs sm:!text-sm !text-gray-400">Be the first to share your thoughts!</p>
            </div>
          ) : (
            <div className="!space-y-3 sm:!space-y-4 !mt-3 sm:!mt-4">
              {getSortedReviews().map((review: any) => (
                <Link key={review.id} href={`/review/${review.id}`} className="!block">
                  <div className="!border !border-gray-200 !rounded-xl sm:!rounded-2xl !p-3 sm:!p-4 !bg-white hover:!bg-gray-50 !transition-all !duration-200 hover:!shadow-md hover:!border-gray-300 !transform hover:!scale-[1.01]">
                    {/* Review Header - Responsive */}
                    <div className="!flex !items-start !gap-2 sm:!gap-3 !mb-3">
                      <div className="!flex !items-center !gap-2 sm:!gap-3 !flex-1 !min-w-0">
                        {review.reviewer?.profilePicture ? (
                          <Image
                            src={review.reviewer.profilePicture}
                            alt={review.reviewer?.username || "User"}
                            width={40}
                            height={40}
                            className="!w-8 !h-8 sm:!w-10 sm:!h-10 md:!w-11 md:!h-11 !rounded-full !object-cover !ring-1 sm:!ring-2 !ring-gray-100 !flex-shrink-0"
                          />
                        ) : (
                          <div className="!w-8 !h-8 sm:!w-10 sm:!h-10 md:!w-11 md:!h-11 !bg-gradient-to-br !from-gray-200 !to-gray-300 !rounded-full !flex !items-center !justify-center !ring-1 sm:!ring-2 !ring-gray-100 !flex-shrink-0">
                            <User className="!w-4 !h-4 sm:!w-5 sm:!h-5 md:!w-6 md:!h-6 !text-gray-500" />
                          </div>
                        )}
                        <div className="!flex-1 !min-w-0">
                          <div className="!flex !items-center !gap-1 sm:!gap-2 !mb-0.5 sm:!mb-1 !flex-wrap">
                            <span className="!font-semibold !text-sm sm:!text-base !text-gray-900 !truncate">
                              {review.reviewer?.username || "Anonymous"}
                            </span>
                            {/* Review Badge - Hide on very small screens */}
                            <span className="!hidden xs:!inline-block !px-1.5 sm:!px-2 !py-0.5 !bg-blue-100 !text-blue-700 !text-xs !font-medium !rounded-full">
                              Reviewer
                            </span>
                          </div>
                          <p className="!text-gray-500 !text-xs sm:!text-sm">
                            {new Date(review.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      
                      {/* Rating Stars - Responsive */}
                      <div className="!flex !items-center !gap-0.5 !flex-shrink-0">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`!w-3 !h-3 sm:!w-4 sm:!h-4 !transition-colors ${
                              i < review.rating
                                ? "!text-yellow-500 !fill-yellow-500"
                                : "!text-gray-300"
                            }`}
                          />
                        ))}
                        <span className="!ml-1 !text-xs sm:!text-sm !font-medium !text-gray-700">
                          {review.rating}/5
                        </span>
                      </div>
                    </div>

                    {/* Review Content - Responsive */}
                    <p className="!text-gray-800 !text-xs sm:!text-sm !leading-relaxed !mb-3 sm:!mb-4 !line-clamp-2 sm:!line-clamp-3">
                      {review.comment}
                    </p>

                    {/* Review Stats - Responsive */}
                    <div className="!flex !items-center !justify-between !pt-2 sm:!pt-3 !border-t !border-gray-100">
                      <div className="!flex !items-center !gap-3 sm:!gap-4">
                        <div className="!flex !items-center !gap-1 sm:!gap-1.5 !text-gray-600">
                          <ThumbsUp className="!w-3 !h-3 sm:!w-4 sm:!h-4" />
                          <span className="!text-xs sm:!text-sm !font-medium">{review.likes?.length || 0}</span>
                        </div>
                        <div className="!flex !items-center !gap-1 sm:!gap-1.5 !text-gray-600">
                          <Coins className="!w-3 !h-3 sm:!w-4 sm:!h-4" />
                          <div className="!text-xs sm:!text-sm">
                            <SupportAmount
                              amount={(review.supports || []).reduce(
                                (s: number, x: any) => s + x.amount,
                                0
                              )}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Read More Indicator */}
                      <div className="!text-xs !text-gray-400 !font-medium !hidden sm:!block">
                        Read more →
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Safe Area - Responsive */}
      <div className="!h-16 sm:!h-20 !bg-gray-50"></div>
    </div>
  );
};

export default MovieDetailsPage;
