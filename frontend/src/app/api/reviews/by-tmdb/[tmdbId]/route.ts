// app/api/reviews/[tmdbId]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  context: { params: Promise<{ tmdbId: string }> }
) {
  try {
    const tmdbId = parseInt((await context.params).tmdbId);

    if (isNaN(tmdbId)) {
      return NextResponse.json(
        { error: "Invalid tmdbId" },
        { status: 400 }
      );
    }

    // Find the movie by tmdbId
    const movie = await prisma.movie.findUnique({
      where: { tmdbId },
      select: { id: true },
    });

    if (!movie) {
      return NextResponse.json(
        { error: "Movie not found" },
        { status: 404 }
      );
    }

    // Fetch reviews for this movie
    const reviews = await prisma.review.findMany({
      where: { 
        movieId: movie.id, 
        isBanned: false,
        reviewer: {
          OR: [
            { isAdmin: false },
            { isAdmin: null },
          ],
        },
      },
      include: {
        reviewer: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
            isAdmin: true,
          },
        },
        supports: {
          select: {
            id: true,
            amount: true,
            userId: true,
          },
        },
        ReviewLike: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ reviews });
  } catch (err) {
    console.error("Error fetching reviews:", err);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
