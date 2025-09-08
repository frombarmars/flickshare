"use client";
import { MessageSquare, Star, Play, Calendar, User, Search, Filter } from "lucide-react";
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

type SortOption = 'relevance' | 'mostReviewed' | 'bestRated';

export default function MovieFeedPage() {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const scrollObserver = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchMovies = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const url = nextCursor
        ? `/api/movies?cursor=${nextCursor}&limit=6`
        : `/api/movies?limit=6`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch movies');
      }

      const data = await response.json();
      console.log(data.movies);

      if (data.movies.length) {
        setMovies((prev) => [...prev, ...data.movies]);
        setNextCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Error fetching movies:", err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [nextCursor, hasMore]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  // Filter and sort movies based on search query and sort option
  useEffect(() => {
    let result = [...movies];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(movie =>
        movie.title.toLowerCase().includes(query) ||
        movie.description.toLowerCase().includes(query) ||
        movie.crew.some(crew => crew.person.name.toLowerCase().includes(query))
      );
    }

    // Sort by selected option
    switch (sortBy) {
      case 'mostReviewed':
        result.sort((a, b) => b._count.reviews - a._count.reviews);
        break;
      case 'bestRated':
        result.sort((a, b) => b.voteAverage - a.voteAverage);
        break;
      case 'relevance':
      default:
        // Keep original order (relevance/chronological)
        break;
    }

    setFilteredMovies(result);
  }, [movies, searchQuery, sortBy]);

  const lastMovieRef = useCallback(
    (node: HTMLElement | null) => {
      if (loading) return;
      if (scrollObserver.current) scrollObserver.current.disconnect();

      scrollObserver.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMovieClick = (movie: Movie) => {
    router.push(`/movie/${movie.id}`);
  };

  const handleSortChange = (option: SortOption) => {
    setSortBy(option);
    setShowSortDropdown(false);
  };

  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'mostReviewed', label: 'Most Reviewed' },
    { value: 'bestRated', label: 'Best Rated' }
  ];

  // Get director from crew
  const getDirector = (movie: Movie) => {
    const director = movie.crew.find(person => person.job === "Director");
    return director ? director.person.name : "Unknown Director";
  };

  return (
    <div className="p-3 bg-white min-h-screen">

      {/* Stats Section - Refined */}
      {/* <div className="w-full mb-0">
        <div className="flex items-center justify-center gap-8 py-3 border-y border-gray-100">
          <div className="text-center">
            <div className="text-lg font-light text-black">{movies.length}</div>
            <div className="text-xs uppercase tracking-wider text-gray-400 mt-0.5">Films</div>
          </div>
          
          <div className="w-px h-8 bg-gray-200"></div>
          
          <div className="text-center">
            <div className="text-lg font-light text-black">{averageRating}</div>
            <div className="text-xs uppercase tracking-wider text-gray-400 mt-0.5">Rating</div>
          </div>
          
          <div className="w-px h-8 bg-gray-200"></div>
          
          <div className="text-center">
            <div className="text-lg font-light text-black">{totalReviews.toLocaleString()}</div>
            <div className="text-xs uppercase tracking-wider text-gray-400 mt-0.5">Reviews</div>
          </div>
        </div>
      </div> */}

      {/* Search and Filter Bar - Condensed */}
      <div className="mb-4 flex gap-2">
        <div className="flex-1 bg-gray-100 rounded-lg p-2 flex items-center border border-gray-200">
          <Search size={14} className="text-gray-500 mr-2 ml-2" />
          <input
            type="text"
            placeholder="Search movies in the on-chain database"
            className="flex-1 bg-transparent border-none outline-none text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Sort Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            className="!w-10 !h-10 !bg-gray-100 !rounded-lg !flex !items-center !justify-center"
            onClick={() => setShowSortDropdown(!showSortDropdown)}
          >
            <Filter size={16} className="text-black" />
          </button>
          
          {showSortDropdown && (
            <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[140px]">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  className={`!w-full !text-left!px-3 py-2 !text-xs !hover:bg-gray-100 !first:rounded-t-lg !last:rounded-b-lg ${
                    sortBy === option.value ? '!bg-gray-100 !font-medium' : ''
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

      {/* Sort Indicator */}
      {searchQuery && (
        <div className="mb-3 text-xs text-gray-600">
          Showing {filteredMovies.length} results for &quot;{searchQuery}&quot; sorted by {sortOptions.find(opt => opt.value === sortBy)?.label?.toLowerCase()}
        </div>
      )}

      {/* Movies Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filteredMovies.map((movie, i) => {
          const isLast = i === filteredMovies.length - 1 && !searchQuery;
          return (
            <div
              key={movie.id}
              ref={isLast ? lastMovieRef : null}
              className="bg-white rounded-lg overflow-hidden shadow border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer group"
              onClick={() => handleMovieClick(movie)}
            >
              {/* Movie Poster */}
              <div className="relative aspect-[3/4] overflow-hidden">
                <Image
                  src={`https://image.tmdb.org/t/p/original${movie.posterPath}`}
                  alt={movie.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 50vw, 33vw"
                />

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-transparent flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <div className="bg-white rounded-full p-2 shadow-lg">
                      <Play size={14} fill="black" />
                    </div>
                  </div>
                </div>

                {/* Rating badge */}
                <div className="absolute top-2 left-2 bg-black text-white text-xs font-semibold px-1.5 py-1 rounded-full flex items-center">
                  <Star size={8} fill="currentColor" className="mr-0.5" />
                  {movie.voteAverage.toFixed(1)}
                </div>
              </div>

              {/* Movie Info - Condensed */}
              <div className="p-2.5">
                <h3 className="font-semibold text-black text-xs mb-1 line-clamp-1">{movie.title}</h3>

                <div className="flex items-center text-xs text-gray-600 mb-1.5">
                  <User size={8} className="mr-1" />
                  <span className="line-clamp-1 text-xs">{getDirector(movie)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center text-xs text-gray-600">
                    <MessageSquare size={8} className="mr-1" />
                    <span>{movie._count.reviews.toLocaleString()}</span>
                  </div>

                  <div className="text-xs text-black px-1.5 py-0.5 rounded-full flex items-center">
                    <Calendar size={8} className="mr-1" />
                    {new Date(movie.releaseDate).getFullYear()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Loading indicator */}
      {loading && !searchQuery && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
        </div>
      )}

      {/* End of content message */}
      {!hasMore && !searchQuery && (
        <div className="text-center py-6 text-gray-500 text-xs">
          You have reached the end of all movies
        </div>
      )}

      {/* No results message */}
      {searchQuery && filteredMovies.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500 text-xs">
          No movies found for &quot;{searchQuery}&quot;
        </div>
      )}
    </div>
  );
};