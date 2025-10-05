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


    
    const review = await prisma.review.findFirst({
      where: { numericId: parseInt(reviewId), isBanned: false },
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
            walletAddress: true,
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
      likes: review.ReviewLike.length, // 👈 include like count
      date: review.createdAt.toISOString().split("T")[0],
      reviewId: review.id,
      movieTitle: review.movie.title,
      posterPath: review.movie.posterPath,
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
