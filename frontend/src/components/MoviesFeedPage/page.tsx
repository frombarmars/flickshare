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
  avgRating: number; // Our own calculated average from reviews
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

        const url = `/api/movies?${params.toString()}`;
        console.log('🎬 Fetching movies:', url);
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch movies");

        const data = await response.json();
        console.log('✅ Received movies:', data.movies.length, 'movies');

        // Update states using functional updates to avoid dependency on movies
        setMovies((prevMovies) => {
          if (reset) return data.movies;
          
          // Filter out duplicates when appending
          const existingIds = new Set(prevMovies.map(m => m.id));
          const newMovies = data.movies.filter((m: Movie) => !existingIds.has(m.id));
          return [...prevMovies, ...newMovies];
        });
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore ?? !!data.nextCursor);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [nextCursor, hasMore, debouncedSearchQuery]
  );

  useEffect(() => {
    // Reset and fetch on search change
    setMovies([]);
    setNextCursor(null);
    setHasMore(true);
    fetchMovies(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery]); // Only trigger on search change

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

  // Sort movies based on sort option (API already handles search filtering)
  useEffect(() => {
    const result = [...movies];

    // Sort by selected option (API already handles search filtering)
    switch (sortBy) {
      case "mostReviewed":
        result.sort((a, b) => b._count.reviews - a._count.reviews);
        break;
      case "bestRated":
        result.sort((a, b) => b.avgRating - a.avgRating);
        break;
      case "relevance":
      default:
        // Sort by popularity (reviews + rating)
        result.sort((a, b) => {
          const aPopularity = (a._count?.reviews || 0) + (a.avgRating || 0);
          const bPopularity = (b._count?.reviews || 0) + (b.avgRating || 0);
          return bPopularity - aPopularity;
        });
        break;
    }

    setFilteredMovies(result);
  }, [movies, sortBy]);

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

  // Current sort label for UI
  const currentSortLabel = sortOptions.find((o) => o.value === sortBy)?.label || "Sort";

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header - matching UsersFeedPage style */}
      <div className="top-0 bg-white border-b border-gray-100 shadow-sm mt-2 pr-4 pl-4">
        {/* Search and Filter Bar - Condensed */}
        <div className="flex gap-2">
          <div className="flex-1 bg-gray-100 rounded-lg p-2 flex items-center border border-gray-200">
            <Search size={14} className="text-gray-500 mr-2 ml-1" />
            <input
              type="text"
              placeholder="Search movies..."
              className="flex-1 bg-transparent border-none outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: '16px' }}
              autoComplete="off"
              spellCheck="false"
              autoCapitalize="off"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="!text-gray-400 !hover:text-gray-600 !transition-colors !flex-shrink-0 !mr-1"
                aria-label="Clear search"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M2 2L14 14M14 2L2 14" />
                </svg>
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              className="!w-10 !h-10 !bg-gray-100 !flex !items-center !justify-center !border !border-gray-200"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              aria-label="Sort options"
            >
              <Filter size={16} className="!text-black" />
            </button>

            {showSortDropdown && (
              <div className="!absolute !right-0 !top-12 !bg-white !border !border-gray-200 !rounded-lg !shadow-lg !z-10 !min-w-[140px]">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`!w-full !text-left !px-3 !py-2 !text-xs !hover:bg-gray-100 !first:rounded-t-lg !last:rounded-b-lg !flex !items-center ${
                      sortBy === option.value ? "bg-gray-100 font-medium" : ""
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

        {/* Search Status */}
        {searchQuery.trim() && (
          <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
            {searchQuery !== debouncedSearchQuery ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 border-2 border-gray-300 border-t-black rounded-full animate-spin"></span>
                Searching...
              </span>
            ) : (
              <span>
                {filteredMovies.length} result{filteredMovies.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Mobile-Optimized Movies Grid */}
      <div className="!px-3 !pt-3">
        <div className="grid grid-cols-2 gap-3">
          {filteredMovies.map((movie, i) => {
            const isLast =
              i === filteredMovies.length - 1 && !debouncedSearchQuery;
            return (
              <div
                key={`${movie.id}-${movie.tmdbId}`}
                ref={isLast ? lastMovieRef : null}
                className="bg-white rounded-xl overflow-hidden border border-gray-200 active:border-black transition-colors"
                onClick={() => handleMovieClick(movie.tmdbId)}
              >
                {/* Movie Poster */}
                <div className="relative aspect-[2/3] overflow-hidden bg-gray-100">
                  <Image
                    src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
                    alt={movie.title}
                    fill
                    className="object-cover"
                    sizes="50vw"
                    priority={i < 4}
                  />

                  {/* Rating Badge */}
                  {movie.avgRating > 0 && (
                    <div className="absolute top-1.5 left-1.5 bg-black/90 backdrop-blur-sm text-white text-[11px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Star size={9} fill="currentColor" />
                      {movie.avgRating.toFixed(1)}
                    </div>
                  )}
                </div>

                {/* Movie Info */}
                <div className="p-2.5">
                  <h3 className="font-semibold text-gray-900 text-xs mb-1 line-clamp-2 leading-tight">
                    {movie.title}
                  </h3>

                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span className="font-medium">{new Date(movie.releaseDate).getFullYear()}</span>
                    {movie._count.reviews > 0 && (
                      <div className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded">
                        <MessageSquare size={10} />
                        <span className="font-medium">{movie._count.reviews}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Loading */}
      {loading && (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-200 border-t-black"></div>
        </div>
      )}

      {/* Mobile End State */}
      {!hasMore && !debouncedSearchQuery && filteredMovies.length > 0 && (
        <div className="text-center py-6 mt-3">
          <p className="text-xs text-gray-400">All movies loaded</p>
        </div>
      )}

      {/* Mobile No Results */}
      {debouncedSearchQuery.trim() &&
        filteredMovies.length === 0 &&
        !loading && (
          <div className="text-center py-12 px-4">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-600 text-sm mb-3 font-medium">No movies found</p>
            <button
              onClick={() => setSearchQuery("")}
              className="text-sm text-black font-medium active:opacity-70 transition-opacity"
            >
              Clear search
            </button>
          </div>
        )}

      {/* Mobile Empty State */}
      {!loading && filteredMovies.length === 0 && !debouncedSearchQuery && (
        <div className="text-center py-12 px-4">
          <div className="text-4xl mb-3">🎬</div>
          <p className="text-gray-600 text-sm">No movies available</p>
        </div>
      )}
    </div>
  );
}
