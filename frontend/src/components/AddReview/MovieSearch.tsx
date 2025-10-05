
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import { ENV_VARIABLES } from "@/constants/env_variables";

import { MovieSuggestion } from "@/types/add-review";

interface MovieSearchProps {
  movie: string;
  setMovie: (movie: string) => void;
  setMovieId: (movieId: number) => void;
  error?: string;
}

export const MovieSearch = ({ movie, setMovie, setMovieId, error }: MovieSearchProps) => {
  const [searchResults, setSearchResults] = useState<MovieSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

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
            Authorization: `Bearer ${ENV_VARIABLES.TMDB_API_KEY}`,
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

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (movie) fetchMovies(movie);
    }, 600);
    return () => clearTimeout(delayDebounce);
  }, [movie, fetchMovies]);

  const handleMovieSelect = (title: string, id: number) => {
    setMovie(title);
    setMovieId(id);
    setShowDropdown(false);
  };

  return (
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
          error
            ? "!border-red-300 !focus:border-red-400"
            : "!border-gray-200 !focus:border-gray-400 !hover:border-gray-300"
        }`}
      />
      <Search className="!absolute !right-6 !top-1/2 !-translate-y-1/2 !text-gray-400" />
      {error && (
        <p className="mt-2 text-sm text-red-500 px-2">{error}</p>
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
  );
};
