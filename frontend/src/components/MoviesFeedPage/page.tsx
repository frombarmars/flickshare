"use client";
import {
  MessageSquare,
  Star,
  Play,
  Calendar,
  User,
  Search,
  Filter,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";

interface Movie {
  id: string;
  tmdbId: number;
  title: string;
  description: string;
  releaseDate: Date;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  voteCount: number;
  _count: {
    reviews: number;
  };
  crew: Array<{
    person: {
      name: string;
    };
    job: string;
  }>;
}

type SortOption = "relevance" | "mostReviewed" | "bestRated";

export default function MovieFeedPage() {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const scrollObserver = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchMovies = useCallback(
    async (reset = false) => {
      if (loadingRef.current || (!hasMore && !reset)) return;
      loadingRef.current = true;
      setLoading(true);

      try {
        const params = new URLSearchParams();
        params.set("limit", "6");
        if (!reset && nextCursor) params.set("cursor", nextCursor);
        if (debouncedSearchQuery.trim())
          params.set("search", debouncedSearchQuery.trim());

        const response = await fetch(`/api/movies?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch movies");

        const data = await response.json();

        // Update states
        setMovies(
          reset ? data.movies : [...(reset ? [] : movies), ...data.movies]
        );
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore ?? !!data.nextCursor);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [nextCursor, hasMore, debouncedSearchQuery, movies]
  );

  useEffect(() => {
    if (debouncedSearchQuery !== "") {
      fetchMovies(true); // reset when user searches
    } else {
      // Reset when cleared
      setMovies([]);
      setNextCursor(null);
      setHasMore(true);
      fetchMovies(true);
    }
  }, [debouncedSearchQuery, fetchMovies]);

  // Debounce search query for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Enhanced keyboard shortcuts for better UX
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Escape key to clear search
      if (event.key === "Escape" && searchQuery.trim()) {
        setSearchQuery("");
        setFilteredMovies(movies);
      }
      // Ctrl/Cmd + F to focus search (prevent browser search)
      if ((event.metaKey || event.ctrlKey) && event.key === "f") {
        event.preventDefault();
        const searchInput = document.querySelector(
          'input[placeholder*="Search"]'
        ) as HTMLInputElement;
        searchInput?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery, movies]);

  // Enhanced filter and sort movies based on search query and sort option
  useEffect(() => {
    let result = [...movies];

    // Enhanced filter by search query with more flexible matching
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      const searchTerms = query.split(" ").filter((term) => term.length > 0);

      result = result.filter((movie) => {
        const movieTitle = movie.title.toLowerCase();
        const movieDescription = movie.description?.toLowerCase() || "";
        const crewNames =
          movie.crew?.map((crew) => crew.person.name.toLowerCase()).join(" ") ||
          "";
        const releaseYear = new Date(movie.releaseDate)
          .getFullYear()
          .toString();

        // Create searchable text combining all fields
        const searchableText =
          `${movieTitle} ${movieDescription} ${crewNames} ${releaseYear}`.toLowerCase();

        // More flexible search: if single term, use OR logic; if multiple terms, use AND logic
        if (searchTerms.length === 1) {
          const term = searchTerms[0];
          return (
            movieTitle.includes(term) ||
            movieDescription.includes(term) ||
            crewNames.includes(term) ||
            releaseYear.includes(term) ||
            searchableText.includes(term)
          );
        } else {
          // For multiple terms, check if at least 70% of terms are found
          const foundTerms = searchTerms.filter(
            (term) =>
              movieTitle.includes(term) ||
              movieDescription.includes(term) ||
              crewNames.includes(term) ||
              releaseYear.includes(term) ||
              searchableText.includes(term)
          );
          return foundTerms.length >= Math.ceil(searchTerms.length * 0.7);
        }
      });
    }

    // Sort by selected option
    switch (sortBy) {
      case "mostReviewed":
        result.sort((a, b) => b._count.reviews - a._count.reviews);
        break;
      case "bestRated":
        result.sort((a, b) => b.voteAverage - a.voteAverage);
        break;
      case "relevance":
      default:
        // For search results, sort by comprehensive relevance scoring
        if (debouncedSearchQuery.trim()) {
          const query = debouncedSearchQuery.toLowerCase().trim();
          const searchTerms = query
            .split(" ")
            .filter((term) => term.length > 0);

          result.sort((a, b) => {
            const aTitle = a.title.toLowerCase();
            const bTitle = b.title.toLowerCase();
            const aDirector = (
              a.crew?.find((c) => c.job === "Director")?.person.name || ""
            ).toLowerCase();
            const bDirector = (
              b.crew?.find((c) => c.job === "Director")?.person.name || ""
            ).toLowerCase();

            let aScore = 0;
            let bScore = 0;

            // Calculate relevance scores
            searchTerms.forEach((term) => {
              // Exact title match (highest score)
              if (aTitle === term) aScore += 1000;
              if (bTitle === term) bScore += 1000;

              // Title starts with term (high score)
              if (aTitle.startsWith(term)) aScore += 500;
              if (bTitle.startsWith(term)) bScore += 500;

              // Title contains term (medium score)
              if (aTitle.includes(term)) aScore += 100;
              if (bTitle.includes(term)) bScore += 100;

              // Director match (lower score)
              if (aDirector.includes(term)) aScore += 50;
              if (bDirector.includes(term)) bScore += 50;
            });

            // Add bonus for review count (small influence)
            aScore += (a._count?.reviews || 0) * 0.1;
            bScore += (b._count?.reviews || 0) * 0.1;

            // Add bonus for rating (small influence)
            aScore += (a.voteAverage || 0) * 0.5;
            bScore += (b.voteAverage || 0) * 0.5;

            return bScore - aScore;
          });
        } else {
          // When no search query, sort by popularity (reviews + rating)
          result.sort((a, b) => {
            const aPopularity = (a._count?.reviews || 0) + (a.voteAverage || 0);
            const bPopularity = (b._count?.reviews || 0) + (b.voteAverage || 0);
            return bPopularity - aPopularity;
          });
        }
        break;
    }

    setFilteredMovies(result);
  }, [movies, debouncedSearchQuery, sortBy]);

  const lastMovieRef = useCallback(
    (node: HTMLElement | null) => {
      if (loading || !hasMore) return;
      if (scrollObserver.current) scrollObserver.current.disconnect();

      scrollObserver.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          fetchMovies();
        }
      });

      if (node) scrollObserver.current.observe(node);
    },
    [loading, hasMore, fetchMovies]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMovieClick = (tmdbId: number) => {
    router.push(`/movie/${tmdbId}`);
  };

  const handleSortChange = (option: SortOption) => {
    setSortBy(option);
    setShowSortDropdown(false);
  };

  const sortOptions = [
    { value: "relevance", label: "Relevance" },
    { value: "mostReviewed", label: "Most Reviewed" },
    { value: "bestRated", label: "Best Rated" },
  ];

  // Get director from crew
  const getDirector = (movie: Movie) => {
    const director = movie.crew.find((person) => person.job === "Director");
    return director ? director.person.name : "Unknown Director";
  };

  return (
    <div className="p-3 bg-white min-h-screen">
      <div className="mb-4 flex gap-2">
        <div className="!flex-1 !bg-gray-100 !rounded-lg !p-2 !flex !items-center !border !border-gray-200 !transition-all !duration-200 focus-within:!border-gray-400 focus-within:!bg-white focus-within:!shadow-sm">
          <Search
            size={14}
            className="!text-gray-500 !mr-2 !ml-2 !flex-shrink-0"
          />
          <input
            type="text"
            placeholder="Search by title, director, year... (Esc to clear)"
            className="!flex-1 !bg-transparent !border-none !outline-none !text-gray-900 placeholder:!text-gray-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: "16px" }}
            autoComplete="off"
            spellCheck="false"
            autoCapitalize="off"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="!ml-2 !mr-1 !p-1 !rounded-full !bg-gray-200 hover:!bg-gray-300 !transition-colors"
            >
              <span className="!text-xs !text-gray-600">✕</span>
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="!relative" ref={dropdownRef}>
          <button
            className="!w-10 !h-10 !bg-gray-100 hover:!bg-gray-200 !rounded-lg !flex !items-center !justify-center !transition-colors !duration-200 !border !border-gray-200"
            onClick={() => setShowSortDropdown(!showSortDropdown)}
          >
            <Filter size={16} className="!text-gray-700" />
          </button>

          {showSortDropdown && (
            <div className="!absolute !right-0 !top-12 !bg-white !border !border-gray-200 !rounded-lg !shadow-lg !z-20 !min-w-[140px] !py-1">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  className={`!w-full !text-left !px-3 !py-2 !text-xs hover:!bg-gray-100 !transition-colors !duration-150 ${
                    sortBy === option.value
                      ? "!bg-gray-100 !font-semibold !text-gray-900"
                      : "!text-gray-700"
                  }`}
                  onClick={() => handleSortChange(option.value as SortOption)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Typing Indicator */}
      {searchQuery.trim() && searchQuery !== debouncedSearchQuery && (
        <div className="!mb-4 !p-3 !bg-blue-50 !rounded-lg !border !border-blue-200 !flex !items-center !gap-2">
          <div className="!animate-pulse !flex !space-x-1">
            <div className="!w-2 !h-2 !bg-blue-400 !rounded-full !animate-bounce"></div>
            <div
              className="!w-2 !h-2 !bg-blue-400 !rounded-full !animate-bounce"
              style={{ animationDelay: "0.1s" }}
            ></div>
            <div
              className="!w-2 !h-2 !bg-blue-400 !rounded-full !animate-bounce"
              style={{ animationDelay: "0.2s" }}
            ></div>
          </div>
          <div className="!text-sm !text-blue-700 !font-medium">
            Searching as you type...
          </div>
        </div>
      )}

      {/* Enhanced Search Results Info with Quick Actions */}
      {debouncedSearchQuery.trim() && (
        <div className="!mb-4 !p-4 !bg-gradient-to-r !from-blue-50 !to-gray-50 !rounded-lg !border !border-blue-100">
          <div className="!flex !items-center !justify-between !mb-3">
            <div className="!text-sm !font-semibold !text-gray-900">
              {filteredMovies.length > 0
                ? `Found ${filteredMovies.length} movie${
                    filteredMovies.length !== 1 ? "s" : ""
                  }`
                : "No movies found"}
            </div>
            <div className="!flex !items-center !space-x-2">
              <div className="!text-xs !text-gray-600 !bg-white !px-2 !py-1 !rounded-full !border !shadow-sm">
                {sortOptions.find((opt) => opt.value === sortBy)?.label}
              </div>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilteredMovies(movies);
                  setSortBy("relevance");
                }}
                className="!text-xs !text-blue-600 hover:!text-blue-800 !font-medium !bg-white !px-3 !py-1 !rounded-full !border !border-blue-200 hover:!border-blue-300 !transition-colors !duration-200 !shadow-sm"
              >
                Clear All
              </button>
            </div>
          </div>
          <div className="!flex !items-center !justify-between">
            <div className="!text-xs !text-gray-700">
              Searching:{" "}
              <span className="!font-semibold !text-blue-700 !bg-blue-100 !px-2 !py-0.5 !rounded">
                &quot;{debouncedSearchQuery}&quot;
              </span>
            </div>
            {filteredMovies.length > 0 && (
              <div className="!text-xs !text-gray-500">
                {filteredMovies.length === 1
                  ? "Perfect match!"
                  : `${filteredMovies.length} results`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Movies Grid - Responsive */}
      <div className="!grid !grid-cols-2 sm:!grid-cols-3 md:!grid-cols-4 lg:!grid-cols-5 !gap-3 sm:!gap-4 md:!gap-5">
        {filteredMovies.map((movie, i) => {
          const isLast =
            i === filteredMovies.length - 1 && !debouncedSearchQuery;
          return (
            <div
              key={movie.id}
              ref={isLast ? lastMovieRef : null}
              className="!bg-white !rounded-lg !overflow-hidden !shadow-sm !border !border-gray-100 hover:!shadow-lg hover:!border-gray-200 !transition-all !duration-300 !cursor-pointer !group !transform hover:!scale-105"
              onClick={() => handleMovieClick(movie.tmdbId)}
            >
              {/* Enhanced Movie Poster */}
              <div className="!relative !aspect-[3/4] !overflow-hidden !bg-gray-100">
                <Image
                  src={`https://image.tmdb.org/t/p/original${movie.posterPath}`}
                  alt={movie.title}
                  fill
                  className="!object-cover group-hover:!scale-110 !transition-transform !duration-500"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                />

                {/* Enhanced Overlay with Gradient */}
                <div className="!absolute !inset-0 !bg-gradient-to-t !from-black/50 !via-transparent !to-transparent !opacity-0 group-hover:!opacity-100 !transition-opacity !duration-300 !flex !items-center !justify-center">
                  <div className="!transform !translate-y-4 group-hover:!translate-y-0 !transition-transform !duration-300">
                    <div className="!bg-white !bg-opacity-90 !backdrop-blur-sm !rounded-full !p-3 !shadow-lg">
                      <Play size={16} fill="black" className="!ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Enhanced Rating Badge */}
                <div className="!absolute !top-2 !left-2 !bg-black !bg-opacity-80 !backdrop-blur-sm !text-white !text-xs !font-bold !px-2 !py-1 !rounded-full !flex !items-center !shadow-lg">
                  <Star size={10} fill="currentColor" className="!mr-1" />
                  {movie.voteAverage.toFixed(1)}
                </div>

                {/* Search Match Indicator */}
                {debouncedSearchQuery.trim() &&
                  movie.title
                    .toLowerCase()
                    .includes(debouncedSearchQuery.toLowerCase()) && (
                    <div className="!absolute !top-2 !right-2 !bg-blue-500 !text-white !text-xs !font-bold !px-2 !py-1 !rounded-full !shadow-lg">
                      Match
                    </div>
                  )}
              </div>

              {/* Enhanced Movie Info */}
              <div className="!p-3 sm:!p-3.5">
                <h3 className="!font-semibold !text-gray-900 !text-sm sm:!text-base !mb-2 !line-clamp-2 !leading-tight">
                  {movie.title}
                </h3>

                <div className="!flex !items-center !text-xs !text-gray-600 !mb-2">
                  <User size={10} className="!mr-1.5 !flex-shrink-0" />
                  <span className="!line-clamp-1 !text-xs">
                    {getDirector(movie)}
                  </span>
                </div>

                <div className="!flex !justify-between !items-center !gap-2">
                  <div className="!flex !items-center !text-xs !text-gray-500 !bg-gray-50 !px-2 !py-1 !rounded-full">
                    <MessageSquare size={10} className="!mr-1.5" />
                    <span className="!font-medium">
                      {movie._count.reviews.toLocaleString()}
                    </span>
                  </div>

                  <div className="!text-xs !text-gray-700 !font-medium !bg-gray-100 !px-2 !py-1 !rounded-full !flex !items-center">
                    <Calendar size={10} className="!mr-1" />
                    {new Date(movie.releaseDate).getFullYear()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Enhanced Loading Indicator */}
      {loading && !debouncedSearchQuery && (
        <div className="!flex !justify-center !py-8">
          <div className="!flex !flex-col !items-center !space-y-3">
            <div className="!animate-spin !rounded-full !h-8 !w-8 !border-2 !border-gray-200 !border-t-blue-500"></div>
            <div className="!text-sm !text-gray-600 !font-medium">
              Loading more movies...
            </div>
          </div>
        </div>
      )}

      {/* Search Loading */}
      {loading && debouncedSearchQuery && (
        <div className="!flex !justify-center !py-8">
          <div className="!flex !flex-col !items-center !space-y-3">
            <div className="!animate-pulse !flex !space-x-2">
              <div className="!w-3 !h-3 !bg-blue-400 !rounded-full !animate-bounce"></div>
              <div
                className="!w-3 !h-3 !bg-blue-400 !rounded-full !animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="!w-3 !h-3 !bg-blue-400 !rounded-full !animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
            <div className="!text-sm !text-gray-600 !font-medium">
              Searching movies...
            </div>
          </div>
        </div>
      )}

      {/* Enhanced End of Content */}
      {!hasMore && !debouncedSearchQuery && filteredMovies.length > 0 && (
        <div className="!text-center !py-8 !border-t !border-gray-100 !mt-6">
          <div className="!text-sm !text-gray-500 !font-medium !mb-2">
            🎬 You&apos;ve seen all {filteredMovies.length} movies!
          </div>
          <div className="!text-xs !text-gray-400">
            New movies are added regularly
          </div>
        </div>
      )}

      {/* Enhanced No Results State */}
      {debouncedSearchQuery.trim() &&
        filteredMovies.length === 0 &&
        !loading && (
          <div className="!text-center !py-12 !px-4">
            <div className="!max-w-md !mx-auto">
              <div className="!text-6xl !mb-4">🔍</div>
              <h3 className="!text-lg !font-semibold !text-gray-900 !mb-2">
                No movies found
              </h3>
              <div className="!text-sm !text-gray-600 !mb-4">
                We couldn&apos;t find any movies matching{" "}
                <span className="!font-medium !text-gray-900">
                  &quot;{debouncedSearchQuery}&quot;
                </span>
              </div>
              <div className="!space-y-2 !text-xs !text-gray-500">
                <p>• Try different keywords</p>
                <p>• Check your spelling</p>
                <p>• Use more general terms</p>
              </div>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilteredMovies(movies);
                }}
                className="!mt-6 !px-4 !py-2 !bg-blue-500 !text-white !text-sm !font-medium !rounded-lg hover:!bg-blue-600 !transition-colors !duration-200"
              >
                Clear Search
              </button>
            </div>
          </div>
        )}

      {/* Empty State - No movies at all */}
      {!loading && filteredMovies.length === 0 && !debouncedSearchQuery && (
        <div className="!text-center !py-12 !px-4">
          <div className="!max-w-md !mx-auto">
            <div className="!text-6xl !mb-4">🎭</div>
            <h3 className="!text-lg !font-semibold !text-gray-900 !mb-2">
              No movies available
            </h3>
            <p className="!text-sm !text-gray-600">
              Movies will appear here once they&apos;re added to the database
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
