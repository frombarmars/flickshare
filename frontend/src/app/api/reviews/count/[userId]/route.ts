import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  // Get start and end of today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  try {
    const count = await prisma.review.count({
      where: {
        reviewerId: userId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    return NextResponse.json({ count });
  } catch (err) {
    console.error("Error fetching daily review count:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
