import { NextRequest, NextResponse } from 'next/server';
import { tmdbSync } from '@/lib/tmdb-sync';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { tmdbId } = await request.json();

    if (!tmdbId || isNaN(parseInt(tmdbId))) {
      return NextResponse.json(
        { error: 'Valid TMDB ID is required' },
        { status: 400 }
      );
    }

    const tmdbIdNumber = parseInt(tmdbId);

    // Check if movie already exists in our database
    const existingMovie = await prisma.movie.findUnique({
      where: { tmdbId: tmdbIdNumber },
      include: {
        movieGenres: {
          include: {
            genre: true
          }
        },
        cast: {
          include: {
            person: true
          }
        },
        crew: {
          include: {
            person: true
          }
        }
      }
    });

    if (existingMovie) {
      // Movie exists, check if it needs updating (older than 24 hours)
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);

      if (existingMovie.updatedAt < dayAgo) {
        console.log(`Updating existing movie: ${existingMovie.title}`);
        await tmdbSync.updateExistingMovie(tmdbIdNumber);
        
        // Fetch updated movie data
        const updatedMovie = await prisma.movie.findUnique({
          where: { tmdbId: tmdbIdNumber },
          include: {
            movieGenres: {
              include: {
                genre: true
              }
            },
            cast: {
              include: {
                person: true
              }
            },
            crew: {
              include: {
                person: true
              }
            }
          }
        });

        return NextResponse.json({ 
          movie: updatedMovie,
          action: 'updated'
        });
      }

      return NextResponse.json({ 
        movie: existingMovie,
        action: 'found'
      });
    }

    // Movie doesn't exist, sync it from TMDB
    console.log(`Syncing new movie with TMDB ID: ${tmdbIdNumber}`);
    const movieId = await tmdbSync.syncMovieToDatabase(tmdbIdNumber);

    // Fetch the newly created movie with all relations
    const newMovie = await prisma.movie.findUnique({
      where: { id: movieId },
      include: {
        movieGenres: {
          include: {
            genre: true
          }
        },
        cast: {
          include: {
            person: true
          }
        },
        crew: {
          include: {
            person: true
          }
        }
      }
    });

    return NextResponse.json({ 
      movie: newMovie,
      action: 'created'
    });

  } catch (error) {
    console.error('Error in TMDB sync API:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to sync movie data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check sync status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tmdbId = searchParams.get('tmdbId');

    if (!tmdbId) {
      return NextResponse.json(
        { error: 'TMDB ID is required' },
        { status: 400 }
      );
    }

    const movie = await prisma.movie.findUnique({
      where: { tmdbId: parseInt(tmdbId) },
      select: {
        id: true,
        tmdbId: true,
        title: true,
        updatedAt: true,
        createdAt: true
      }
    });

    if (!movie) {
      return NextResponse.json({ 
        exists: false,
        needsSync: true
      });
    }

    // Check if movie needs updating (older than 24 hours)
    const dayAgo = new Date();
    dayAgo.setDate(dayAgo.getDate() - 1);
    const needsUpdate = movie.updatedAt < dayAgo;

    return NextResponse.json({
      exists: true,
      needsSync: needsUpdate,
      movie: {
        id: movie.id,
        title: movie.title,
        lastUpdated: movie.updatedAt,
        createdAt: movie.createdAt
      }
    });

  } catch (error) {
    console.error('Error checking sync status:', error);
    return NextResponse.json(
      { error: 'Failed to check sync status' },
      { status: 500 }
    );
  }
}