import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const { txHash, userId, reviewId, amount } = body;

    if (!userId || !reviewId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const support = await prisma.support.create({
      data: {
        txHash,
        userId,
        reviewId,
        amount,
      },
    });

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { movie: { select: { title: true } } },
    });

    if (review && review.reviewerId && review.numericId) {
      await prisma.notification.create({
        data: {
          recipientId: review.reviewerId,
          triggeredById: userId, // Associate the notification with the user who supported the review
          type: "SUPPORT",
          message: `supported your review for ${review.movie.title} with ${amount} WLDs`,
          entityId: review.numericId.toString(), // Use numericId instead of ObjectId
        },
      });
    }

    return NextResponse.json({ success: true, support });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to save support" },
      { status: 500 }
    );
  }
}