import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reviewIdParam = searchParams.get("reviewId");

  if (!reviewIdParam) {
    return NextResponse.json({ error: "Review ID is required" }, { status: 400 });
  }

  const reviewId = Number(reviewIdParam);
  if (isNaN(reviewId)) {
    return NextResponse.json({ error: "Invalid Review ID" }, { status: 400 });
  }

  try {
    const reviewObject = await prisma.review.findFirst({
      where: { numericId: reviewId },
    });

    if (!reviewObject) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    const comments = await prisma.comment.findMany({
      where: { reviewId: reviewObject.id },
      include: {
        author: { select: { username: true, profilePicture: true } },
        replies: {
          include: {
            author: { select: { username: true, profilePicture: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Failed to fetch comments:", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { reviewId, content, parentId } = await req.json();
    if (!reviewId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const reviewIdParam = Number(reviewId);
    if (isNaN(reviewIdParam)) {
      return NextResponse.json({ error: "Invalid Review ID" }, { status: 400 });
    }

    // Find review by numericId
    const reviewObject = await prisma.review.findFirst({
      where: { numericId: reviewIdParam },
      select: {
        id: true,
        reviewerId: true,
        numericId: true,
        movie: { select: { title: true } },
      },
    });

    if (!reviewObject) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        reviewId: reviewObject.id,
        content,
        authorId: session.user.id,
        parentId,
      },
      include: {
        author: { select: { username: true, profilePicture: true } },
      },
    });

    // 🔔 Create notifications
    if (parentId) {
      // It's a reply → notify parent comment's author
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { authorId: true },
      });

      if (parentComment && parentComment.authorId !== session.user.id && reviewObject.numericId) {
        await prisma.notification.create({
          data: {
            recipientId: parentComment.authorId,
            triggeredById: session.user.id,
            type: "REPLY",
            message: `replied to your comment on ${reviewObject.movie.title}`,
            entityId: reviewObject.numericId.toString(), // Use numericId instead of ObjectId
          },
        });
      }
    } else if (reviewObject.reviewerId !== session.user.id && reviewObject.numericId) {
      await prisma.notification.create({
        data: {
          recipientId: reviewObject.reviewerId!,
          triggeredById: session.user.id,
          type: "COMMENT",
          message: `commented on your review for ${reviewObject.movie.title}`,
          entityId: reviewObject.numericId.toString(), // Use numericId instead of ObjectId
        },
      });
    }

    return NextResponse.json({ comment });
  } catch (error) {
    console.error("Failed to create comment:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
