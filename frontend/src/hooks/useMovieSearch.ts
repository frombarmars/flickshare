
import { useState, useEffect, useCallback } from "react";
import { ENV_VARIABLES } from "@/constants/env_variables";

import { MovieSuggestion } from "@/types/add-review";

export const useMovieSearch = (tmdbId?: string) => {
  const [movie, setMovie] = useState("");
  const [movieId, setMovieId] = useState(0);
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

  useEffect(() => {
    if (!tmdbId) return;

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

  const handleMovieSelect = (title: string, id: number) => {
    setMovie(title);
    setMovieId(id);
    setShowDropdown(false);
  };

  return {
    movie,
    setMovie,
    movieId,
    setMovieId,
    searchResults,
    searchLoading,
    showDropdown,
    setShowDropdown,
    handleMovieSelect,
  };
};
