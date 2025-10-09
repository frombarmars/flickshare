import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  context: { params: Promise<{ objectId: string }> }
) {
  try {
    const { objectId } = await context.params;

    if (!objectId) {
      return NextResponse.json(
        { error: "Invalid objectId" },
        { status: 400 }
      );
    }

    // Check if it's a valid ObjectId format
    if (objectId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(objectId)) {
      return NextResponse.json(
        { error: "Invalid ObjectId format" },
        { status: 400 }
      );
    }

    const review = await prisma.review.findUnique({
      where: { id: objectId },
      select: {
        numericId: true,
      },
    });

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      numericId: review.numericId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch numeric ID" },
      { status: 500 }
    );
  }
}