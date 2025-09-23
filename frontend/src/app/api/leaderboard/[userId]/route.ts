// app/api/leaderboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // make sure you have this prisma client instance

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUserId = (await context.params).userId;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        totalPoints: true,
      },
      orderBy: {
        totalPoints: "desc",
      },
    });

    // map into simple format
    const leaderboard = users.map((u, idx) => ({
      id: u.id,
      username: u.username ?? "Anonymous",
      points: u.totalPoints,
      level:
        u.totalPoints > 15000
          ? "Critic Legend"
          : u.totalPoints > 10000
          ? "Master Reviewer"
          : u.totalPoints > 7000
          ? "Senior Reviewer"
          : "Reviewer",
      rank: idx + 1,
    }));

    // just take top 50 for main display
    const top50 = leaderboard.slice(0, 50);

    // find current user rank
    const currentUser = currentUserId
      ? leaderboard.find((u) => u.id === currentUserId)
      : null;

    return NextResponse.json({
      leaderboard: top50,
      currentUser: currentUser ?? null,
    });
  } catch (err) {
    console.error("Leaderboard error:", err);
    return NextResponse.json(
      { error: "Failed to load leaderboard" },
      { status: 500 }
    );
  }
}
