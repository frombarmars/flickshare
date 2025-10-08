import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reviewIdParam = searchParams.get("reviewId");

  if (!reviewIdParam) {
    return NextResponse.json(
      { error: "Review ID is required" },
      { status: 400 }
    );
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
        author: {
          select: {
            username: true,
            profilePicture: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                username: true,
                profilePicture: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Failed to fetch comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
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

    const reviewObject = await prisma.review.findFirst({
      where: { numericId: reviewIdParam },
      select: { id: true },
    });

    if (!reviewObject) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

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

    return NextResponse.json({ comment });
  } catch (error) {
    console.error("Failed to create comment:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}