import { useState } from 'react';
import { toast } from 'react-toastify';

interface Movie {
  id: string;
  tmdbId: number;
  title: string;
  description: string;
  releaseDate: Date | null;
  runtime: number | null;
  posterPath: string | null;
  backdropPath: string | null;
  imdbId: string | null;
  popularity: number | null;
  voteAverage: number | null;
  voteCount: number | null;
  tagline: string | null;
  status: string | null;
  originalLang: string | null;
  adult: boolean;
  movieGenres: Array<{
    genre: {
      id: string;
      name: string;
      tmdbId: number;
    };
  }>;
  cast: Array<{
    character: string;
    person: {
      id: string;
      name: string;
      tmdbId: number;
      photoPath: string | null;
    };
  }>;
  crew: Array<{
    job: string;
    person: {
      id: string;
      name: string;
      tmdbId: number;
      photoPath: string | null;
    };
  }>;
}

interface SyncResponse {
  movie: Movie;
  action: 'found' | 'updated' | 'created';
}

interface SyncError {
  error: string;
  details?: string;
}

export const useTMDBSync = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncMovie = async (tmdbId: number): Promise<Movie | null> => {
    if (!tmdbId || isNaN(tmdbId)) {
      const errorMsg = 'Invalid TMDB ID provided';
      setError(errorMsg);
      toast.error(errorMsg);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tmdb/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tmdbId }),
      });

      const data: SyncResponse | SyncError = await response.json();

      if (!response.ok) {
        const errorData = data as SyncError;
        throw new Error(errorData.details || errorData.error || 'Failed to sync movie');
      }

      const syncData = data as SyncResponse;
      
      // Show appropriate success message based on action
      switch (syncData.action) {
        case 'created':
          toast.success(`Successfully added "${syncData.movie.title}" to database`);
          break;
        case 'updated':
          toast.success(`Updated "${syncData.movie.title}" with latest data`);
          break;
        case 'found':
          // Don't show toast for existing movies that don't need updates
          break;
      }

      return syncData.movie;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync movie data';
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const checkSyncStatus = async (tmdbId: number) => {
    try {
      const response = await fetch(`/api/tmdb/sync?tmdbId=${tmdbId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check sync status');
      }

      return {
        exists: data.exists,
        needsSync: data.needsSync,
        movie: data.movie
      };
    } catch (err) {
      console.error('Error checking sync status:', err);
      return null;
    }
  };

  const syncMovieIfNeeded = async (tmdbId: number): Promise<Movie | null> => {
    // First check if sync is needed
    const status = await checkSyncStatus(tmdbId);
    
    if (!status) {
      // If we can't check status, try to sync anyway
      return syncMovie(tmdbId);
    }

    if (!status.exists || status.needsSync) {
      // Movie doesn't exist or needs updating
      return syncMovie(tmdbId);
    }

    // Movie exists and is up to date, fetch it from our API
    try {
      const response = await fetch(`/api/movies/${tmdbId}`);
      if (response.ok) {
        const movieData = await response.json();
        return movieData;
      }
    } catch (err) {
      console.error('Error fetching existing movie:', err);
    }

    // Fallback to sync if we can't fetch existing movie
    return syncMovie(tmdbId);
  };

  return {
    syncMovie,
    checkSyncStatus,
    syncMovieIfNeeded,
    isLoading,
    error,
    clearError: () => setError(null)
  };
};