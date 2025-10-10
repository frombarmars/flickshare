import { NextRequest, NextResponse } from 'next/server';
import { tmdbSync } from '@/lib/tmdb-sync';
import prisma from '@/lib/prisma';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY!;
const TMDB_BASE_URL = process.env.NEXT_PUBLIC_TMDB_API_BASE!;

interface TMDBSearchResult {
  page: number;
  results: Array<{
    adult: boolean;
    backdrop_path: string | null;
    genre_ids: number[];
    id: number;
    original_language: string;
    original_title: string;
    overview: string;
    popularity: number;
    poster_path: string | null;
    release_date: string;
    title: string;
    video: boolean;
    vote_average: number;
    vote_count: number;
  }>;
  total_pages: number;
  total_results: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const page = searchParams.get('page') || '1';
    const autoSync = searchParams.get('autoSync') === 'true';

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Search TMDB
    const tmdbResponse = await fetch(
      `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(query)}&page=${page}`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!tmdbResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to search movies' },
        { status: 502 }
      );
    }

    const tmdbData: TMDBSearchResult = await tmdbResponse.json();

    // Check which movies exist in our database
    const tmdbIds = tmdbData.results.map(movie => movie.id);
    const existingMovies = await prisma.movie.findMany({
      where: {
        tmdbId: { in: tmdbIds }
      },
      select: {
        tmdbId: true,
        id: true,
        updatedAt: true
      }
    });

    const existingMoviesMap = new Map(
      existingMovies.map(movie => [movie.tmdbId, movie])
    );

    // Enhanced results with database info
    const enhancedResults = tmdbData.results.map(movie => {
      const existingMovie = existingMoviesMap.get(movie.id);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      return {
        ...movie,
        existsInDatabase: !!existingMovie,
        databaseId: existingMovie?.id || null,
        needsUpdate: existingMovie ? existingMovie.updatedAt < weekAgo : false,
        lastUpdated: existingMovie?.updatedAt || null
      };
    });

    // Auto-sync popular movies if requested
    if (autoSync && tmdbData.results.length > 0) {
      // Sync top 3 most popular movies that don't exist or need updates
      const moviesToSync = enhancedResults
        .filter(movie => !movie.existsInDatabase || movie.needsUpdate)
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 3);

      // Start async sync (don't wait for completion)
      Promise.all(
        moviesToSync.map(async (movie) => {
          try {
            if (movie.existsInDatabase && movie.needsUpdate) {
              await tmdbSync.updateExistingMovie(movie.id);
              console.log(`Auto-updated movie: ${movie.title}`);
            } else if (!movie.existsInDatabase) {
              await tmdbSync.syncMovieToDatabase(movie.id);
              console.log(`Auto-synced movie: ${movie.title}`);
            }
          } catch (error) {
            console.error(`Auto-sync failed for ${movie.title}:`, error);
          }
        })
      ).catch(error => {
        console.error('Auto-sync batch failed:', error);
      });
    }

    return NextResponse.json({
      page: tmdbData.page,
      results: enhancedResults,
      total_pages: tmdbData.total_pages,
      total_results: tmdbData.total_results,
      autoSyncEnabled: autoSync
    });

  } catch (error) {
    console.error('Error in movie search:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}