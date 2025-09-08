import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { awardPoints } from "@/lib/points";

/**
 * Records a support and applies points:
 * - Supporter: +20 points per 1 "amount" unit (proportional)
 * - Review author: +50 points if this supporter is unique for that review (first time)
 * - Anti-abuse: no points if supporter === author
 *
 * Body:
 * {
 *   reviewId: string,
 *   supporterId: string,
 *   amount: number,       // business-level units used across the app (not wei)
 *   txHash?: string       // optional but recommended for idempotency
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const { reviewId, supporterId, amount, txHash } = await req.json();

    if (!reviewId || !supporterId || typeof amount !== "number") {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Fetch review with author
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { reviewerId: true },
    });

    if (!review) {
      return NextResponse.json(
        { ok: false, error: "Review not found" },
        { status: 404 }
      );
    }

    const authorId = review.reviewerId;

    // Determine if this is the first support by this supporter for this review
    const priorCount = await prisma.support.count({
      where: { userId: supporterId, reviewId },
    });

    // Create support record (txHash is unique in schema if provided)
    const support = await prisma.support.create({
      data: {
        user: { connect: { id: supporterId } },
        review: { connect: { id: reviewId } },
        amount: Math.max(0, Math.floor(amount)), // keep amount as integer units
        txHash,
      },
    });

    // Anti-abuse: no points if self-support
    if (supporterId !== authorId) {
      // Supporter proportional reward
      const supporterPoints = Math.max(0, Math.floor(amount * 20));
      if (supporterPoints > 0) {
        await awardPoints(supporterId, "SUPPORT_SPEND", supporterPoints);
      }

      // Author unique-supporter bonus (once per supporter per review)
      if (priorCount === 0) {
        await awardPoints(authorId, "REVIEW_UNIQUE_SUPPORTER_BONUS", 50);
      }
    }

    return NextResponse.json({ ok: true, support });
  } catch (err: any) {
    console.error("Support create error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to record support" },
      { status: 500 }
    );
  }
}