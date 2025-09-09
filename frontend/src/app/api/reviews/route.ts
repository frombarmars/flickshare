import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { awardPoints } from "@/lib/points";
import { ENV_VARIABLES } from "@/constants/env_variables";

/**
 * POST /api/reviews
 * Body: { movieId: string (tmdbId), reviewerId: string, comment: string, rating: number, txHash?: string }
 *
 * Behavior:
 * - If movie exists → do NOT update or call TMDB; use it directly.
 * - If movie is missing → fetch from TMDB, ensure genres, create movie and genre links.
 * - Create review.
 * - Award points (+10).
 */
export async function POST(req: NextRequest) {
  const { movieId, reviewerId, comment, rating, txHash, numericId } = await req.json();

  if (!movieId || !reviewerId || !comment || !rating) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const tmdbId = parseInt(movieId);

    // Idempotency if txHash provided
    if (txHash) {
      const existing = await prisma.review.findUnique({
        where: { txHash }, // txHash is unique in schema
      });
      if (existing) {
        return NextResponse.json({ review: existing, existed: true });
      }
    }

    // 1) Try to find the movie (id only to keep a consistent type)
    let movie = await prisma.movie.findUnique({
      where: { tmdbId },
      select: { id: true },
    });

    // 2) If movie missing → fetch from TMDB and create it
    if (!movie) {
      const detailsRes = await fetch(
        `${ENV_VARIABLES.TMDB_BASE_URL}/movie/${tmdbId}?language=en-US`,
        { headers: { Authorization: `Bearer ${ENV_VARIABLES.TMDB_API_KEY}` } }
      );

      if (!detailsRes.ok) {
        return NextResponse.json(
          { error: "Failed to fetch movie details from TMDB" },
          { status: 502 }
        );
      }

      const movieData = await detailsRes.json();

      // Ensure genres exist (safe even if you've already seeded)
      const genreIds: string[] = [];
      for (const g of movieData.genres || []) {
        const genre = await prisma.genre.upsert({
          where: { tmdbId: g.id },
          update: { name: g.name },
          create: { tmdbId: g.id, name: g.name },
        });
        genreIds.push(genre.id);
      }

      // Create movie and link genres
      movie = await prisma.movie.create({
        data: {
          tmdbId,
          title: movieData.title,
          description: movieData.overview,
          releaseDate: movieData.release_date ? new Date(movieData.release_date) : null,
          runtime: movieData.runtime,
          posterPath: movieData.poster_path,
          backdropPath: movieData.backdrop_path,
          imdbId: movieData.imdb_id,
          popularity: movieData.popularity,
          voteAverage: movieData.vote_average,
          voteCount: movieData.vote_count,
          tagline: movieData.tagline,
          status: movieData.status,
          originalLang: movieData.original_language,
          adult: movieData.adult,
          movieGenres: {
            create: genreIds.map((gid) => ({ genreId: gid })),
          },
        },
        select: { id: true },
      });
    }
    // If movie exists, no update is performed.

    // 3) Create the review
    const review = await prisma.review.create({
      data: {
        movie: { connect: { id: movie.id } },
        reviewer: { connect: { id: reviewerId } },
        numericId,
        comment,
        rating,
        txHash, // optional; unique if provided
      },
    });

    // 4) Award points for review submission (+10)
    await awardPoints(reviewerId, "REVIEW_SUBMIT", 10);

    return NextResponse.json({ review, existed: false });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save review" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "4");

    const reviews = await prisma.review.findMany({
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        reviewer: {
          select: {
            username: true,
            profilePicture: true,
            walletAddress: true,
          },
        },
        movie: {
          select: {
            title: true,
            posterPath: true,
          },
        },
        supports: {
          select: {
            amount: true,
          },
        },
        _count: {
          select: {
            supports: true,
            ReviewLike: true, // 👈 count ReviewLike array
          },
        },
      },
    });

    const formattedReviews = reviews.map((review) => ({
      id: review.id,
      user:
        review.reviewer.username ||
        `User_${review.reviewer.walletAddress.substring(2, 6)}`,
      handle: `@${review.reviewer.username || "user"
        }_${review.reviewer.walletAddress.substring(2, 6)}`,
      avatar: review.reviewer.profilePicture || "/placeholder.jpeg",
      text: review.comment,
      rating: review.rating,
      reviewIdOnChain: review.numericId,
      coins: review.supports.reduce((sum, support) => sum + support.amount, 0),
      likes: review._count.ReviewLike, // 👈 include like count
      date: review.createdAt.toISOString().split("T")[0],
      reviewId: review.id,
      movieTitle: review.movie.title,
      posterPath: review.movie.posterPath,
    }));

    const lastReview = reviews[reviews.length - 1];
    const nextCursor = lastReview?.id || null;

    return NextResponse.json({
      reviews: formattedReviews,
      nextCursor,
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}