// app/api/reviews/[reviewId]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  context: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await context.params;

    if (!reviewId) {
      return NextResponse.json(
        { error: "Invalid reviewId" },
        { status: 400 }
      );
    }

    // Find the review by reviewId
    console.log("Route : API/REVIEWS/[reviewId]/route.ts");
    
    console.log(reviewId);
    
    const review = await prisma.review.findUnique({
      where: { numericId: parseInt(reviewId) },
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            posterPath: true,
            releaseDate: true,
            movieGenres:
            {
              select:
              {
                genre: true,
              }
            }
          },
        },
        reviewer: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
        supports: {
          select: {
            id: true,
            amount: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                username: true,
              },
            },
            txHash: true,
          },
        },
        ReviewLike: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    // Flatten supports into "transactions" for the frontend
    const transactions = review.supports.map((s) => ({
      id: s.id,
      from: s.user?.username ?? "@unknown",
      to: review.reviewer?.username ?? "@unknown",
      amount: s.amount,
      createdAt: s.createdAt,
      txHash: s.txHash ?? "",
    }));

    // Shape the review for frontend
    const reviewData = {
      id: review.id,
      username: review.reviewer?.username ?? "@user",
      rating: review.rating,
      title: review.movie.title,
      totalSupport: review.supports.reduce((sum, s) => sum + s.amount, 0),
      reviewText: review.comment,
      userProfile: review.reviewer.profilePicture,
      poster: review.movie.posterPath ?? "/placeholder.png",
      likeCount: review.ReviewLike.length,
      // TODO: get user session to determine if current user liked it
      isLikedByMe: false,
    };

    return NextResponse.json({
      review: reviewData,
      transactions,
    });
  } catch (err) {
    console.error("Error fetching review:", err);
    return NextResponse.json(
      { error: "Failed to fetch review" },
      { status: 500 }
    );
  }
}
