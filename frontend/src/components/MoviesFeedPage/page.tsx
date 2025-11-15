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
import { useTranslation } from "@/translations";

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
  const { t } = useTranslation();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const scrollObserver = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const nextCursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);

  const fetchMovies = useCallback(
    async () => {
      if (loadingRef.current || !hasMoreRef.current) return;
      loadingRef.current = true;
      setLoading(true);

      try {
        const params = new URLSearchParams();
        params.set("limit", "6");
        if (nextCursorRef.current) {
          params.set("cursor", nextCursorRef.current);
        }
        if (debouncedSearchQuery.trim()) {
          params.set("search", debouncedSearchQuery.trim());
        }

        const url = `/api/movies?${params.toString()}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch movies");

        const data = await response.json();

        if (data.movies.length) {
          setMovies((prev) => [...prev, ...data.movies]);
          nextCursorRef.current = data.nextCursor;
          hasMoreRef.current = !!data.nextCursor;
        } else {
          hasMoreRef.current = false;
        }
      } catch (err) {
        console.error("Error fetching movies:", err);
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [debouncedSearchQuery]
  );

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  useEffect(() => {
    // Reset and fetch on search change
    setMovies([]);
    nextCursorRef.current = null;
    hasMoreRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchQuery]);

  // Debounce search query for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const lastMovieRef = useCallback(
    (node: HTMLElement | null) => {
      if (loading) return;
      if (scrollObserver.current) scrollObserver.current.disconnect();

      scrollObserver.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current) {
          fetchMovies();
        }
      });

      if (node) scrollObserver.current.observe(node);
    },
    [loading, fetchMovies]
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
    { value: "relevance", label: t.common('relevance') },
    { value: "mostReviewed", label: t.common('mostReviewed') },
    { value: "bestRated", label: t.common('bestRated') },
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
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b z-50 px-4 py-3 border-gray-100 shadow-sm">
        {/* Search and Filter Bar - Condensed */}
        <div className="flex gap-2">
          <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2.5 flex items-center border border-gray-200 transition-all duration-200 focus-within:border-gray-900 focus-within:bg-white">
            <Search size={16} className="text-gray-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              placeholder={t.common('searchMovies')}
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-400"
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
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 p-1 hover:bg-gray-100 rounded-lg"
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
              className="w-10 h-10 bg-gray-50 flex items-center justify-center border border-gray-200 rounded-xl transition-all duration-200 hover:border-gray-900 hover:bg-white active:scale-95"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              aria-label="Sort options"
            >
              <Filter size={16} className="text-gray-900" />
            </button>

            {showSortDropdown && (
              <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-xl shadow-xl z-30 min-w-[160px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-gray-100 last:border-b-0 ${
                      sortBy === option.value 
                        ? "bg-gray-50 font-semibold text-gray-900" 
                        : "text-gray-700 hover:bg-gray-50"
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
      </div>

      {/* Mobile-Optimized Movies Grid */}
      <div className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          {movies.map((movie, i) => {
            const isLast = i === movies.length - 1;
            return (
              <div
                key={`${movie.id}-${movie.tmdbId}`}
                ref={isLast ? lastMovieRef : null}
                className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
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
                    <div className="absolute top-2 left-2 bg-black/90 backdrop-blur-sm text-white text-[11px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-lg">
                      <Star size={10} fill="currentColor" />
                      {movie.avgRating.toFixed(1)}
                    </div>
                  )}
                </div>

                {/* Movie Info */}
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 leading-tight">
                    {movie.title}
                  </h3>

                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span className="font-medium">{new Date(movie.releaseDate).getFullYear()}</span>
                    {movie._count.reviews > 0 && (
                      <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                        <MessageSquare size={11} className="text-gray-500" />
                        <span className="font-semibold text-gray-900">{movie._count.reviews}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-6">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
            <span className="text-xs">{t.common('loading')}</span>
          </div>
        </div>
      )}

      {/* End message */}
      {!hasMoreRef.current && movies.length > 0 && (
        <div className="px-4 py-6">
          <div className="text-center py-4 border-t border-gray-200">
            <p className="text-gray-500 text-xs">{t.common('allMoviesLoaded')}</p>
          </div>
        </div>
      )}

      <div className="h-16"></div>
    </div>
  );
}
