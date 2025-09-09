import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { reviewId, userId, txHash } = await req.json();

    // Convert reviewId to the correct type if needed
    const numericReviewId = parseInt(reviewId, 10);
    console.log("Review Numeric ID in api:");
    console.log(numericReviewId);

    // Find the review with better error handling
    const currentReview = await prisma.review.findFirst({
      where: { numericId: numericReviewId },
    });

    if (!currentReview) {
      console.error(`Review with numericId ${numericReviewId} not found in database`);
      return NextResponse.json({
        error: "Review not found in database",
        details: `Review ID: ${numericReviewId}`
      }, { status: 404 });
    }

    const reviewIdOffChain = currentReview.id;

    if (!reviewId || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if user already liked this review
    const existing = await prisma.reviewLike.findFirst({
      where: { reviewId: reviewIdOffChain, userId },
    });

    if (existing) {
      return NextResponse.json({ error: "Already liked" }, { status: 400 });
    }

    // Save like in DB
    const like = await prisma.reviewLike.create({
      data: {
        review: { connect: { id: reviewIdOffChain } },
        user: { connect: { id: userId } },
        txHash,
      },
    });

    console.log(`Like created successfully for review ${numericReviewId}, user ${userId}`);
    return NextResponse.json({ like });
  } catch (err) {
    console.error("Error in like API:", err);
    return NextResponse.json({
      error: "Failed to save like",
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}