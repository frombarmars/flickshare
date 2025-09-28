"use client";
import { ENV_VARIABLES } from "@/constants/env_variables";
import { ArrowLeft, Star, User, Share2 } from "lucide-react";
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
    return <div className="p-6 text-center">Loading movie...</div>;
  }

  return (
    <div className="!min-h-screen !bg-gray-50 !max-w-md !mx-auto">
      {/* Header */}
      <div className="!bg-white !px-4 !py-3 !flex !items-center !justify-between !border-b">
        <button onClick={() => window.history.back()} className="!p-1">
          <ArrowLeft className="!w-6 !h-6 !text-gray-600" />
        </button>
        <button
          onClick={() => setShowShareOptions(!showShareOptions)}
          className="!p-2 !rounded-full hover:!bg-gray-100"
        >
          <Share2 className="!w-5 !h-5 !text-gray-600" />
        </button>
      </div>

      {/* Movie Info */}
      <div className="!bg-white !p-4 !border-b">
        <div className="!flex !gap-3">
          <Image
            src={`https://image.tmdb.org/t/p/w500${
              movie.posterPath || movie.poster_path || ""
            }`}
            alt={movie.title}
            width={64}
            height={96}
            className="!rounded-lg !object-cover !flex-shrink-0 !w-16 !h-24"
          />
          <div className="!flex-1">
            <h1 className="!text-lg !font-bold !mb-2">{movie.title}</h1>
            <p className="!text-sm !text-gray-600 !mb-3">
              {new Date(movie.releaseDate || movie.release_date).getFullYear()}
            </p>
            <div className="!flex !flex-wrap !gap-1 !mb-3">
              {(movie.movieGenres || movie.genres || []).map((g: any) => (
                <span
                  key={g.genre?.id || g.id}
                  className="!px-2 !py-1 !bg-gray-100 !rounded !text-xs"
                >
                  {g.genre?.name || g.name}
                </span>
              ))}
            </div>

            {/* Director */}
            {getDirectors().length > 0 && (
              <p className="!text-xs !text-gray-700 !mb-1">
                <span className="!font-semibold">🎬 Director:</span>{" "}
                {getDirectors()
                  .map((d: any) => d.name)
                  .join(", ")}
              </p>
            )}

            {/* Cast */}
            {getTopCast().length > 0 && (
              <p className="!text-xs !text-gray-700">
                <span className="!font-semibold">🎭 Cast:</span>{" "}
                {getTopCast()
                  .slice(0, 5) // limit to top 5 actors
                  .map((c: any) => c.name)
                  .join(", ")}
                {getTopCast().length > 5 && " + more"}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="!mt-4">
          <p className="!text-gray-800 !text-sm !leading-relaxed">
            {movie.description || movie.overview}
          </p>
        </div>
      </div>

      {/* Reviews */}
      <div className="!bg-white !p-3">
        <h3 className="!font-bold !text-lg !mb-3">Reviews</h3>

        {/* ➕ Add Review Button */}
        <button
          onClick={() => (window.location.href = `/new/${tmdbId}`)}
          className="!w-full !py-4 !mb-4 !bg-black !text-white !rounded-lg !font-semibold hover:!bg-gray-800 transition"
        >
          Write a Review
        </button>

        {/* Filter buttons */}
        <div className="!flex !gap-2 !mb-3">
          <button
            onClick={() => setActiveFilter("trending")}
            className={`!px-3 !py-1 !rounded ${
              activeFilter === "trending"
                ? "!bg-gray-800 !text-white"
                : "!bg-gray-100"
            }`}
          >
            Trending
          </button>
          <button
            onClick={() => setActiveFilter("most_liked")}
            className={`!px-3 !py-1 !rounded ${
              activeFilter === "most_liked"
                ? "!bg-gray-800 !text-white"
                : "!bg-gray-100"
            }`}
          >
            Most Liked
          </button>
          <button
            onClick={() => setActiveFilter("most_support")}
            className={`!px-3 !py-1 !rounded ${
              activeFilter === "most_support"
                ? "!bg-gray-800 !text-white"
                : "!bg-gray-100"
            }`}
          >
            Most Support
          </button>
        </div>

        <div className="!space-y-3">
          {getSortedReviews().map((review: any) => (
            <Link key={review.id} href={`/review/${review.id}`}>
              <div
                key={review.id}
                className="!border !border-gray-200 !rounded-lg !p-3 !bg-white m-2"
              >
                <div className="!flex !items-center !justify-between !mb-2">
                  <div className="!flex !items-center !gap-2">
                    {review.reviewer?.profilePicture ? (
                      <Image
                        src={review.reviewer.profilePicture}
                        alt={review.reviewer?.username || "User"}
                        width={24}
                        height={24}
                        className="!w-6 !h-6 !rounded-full !object-cover"
                      />
                    ) : (
                      <User className="!w-6 !h-6 !text-gray-600 !rounded-full !bg-gray-200 p-1" />
                    )}

                    <span className="!font-medium !text-sm">
                      {review.reviewer?.username || "Anonymous"}
                    </span>
                    <span className="!text-gray-400 !text-xs">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="!flex !items-center !gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`!w-3 !h-3 ${
                          i < review.rating
                            ? "!text-yellow-400 !fill-current"
                            : "!text-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="!text-gray-800 !text-sm !mb-3 line-clamp-5">
                  {review.comment}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MovieDetailsPage;
