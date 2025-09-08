// app/api/leaderboard/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // make sure you have this prisma client instance

export async function GET() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                totalPoints: true,
            },
            orderBy: {
                totalPoints: "desc",
            },
            take: 50, // limit leaderboard size
        });

        // map into simple format
        const leaderboard = users.map((u) => ({
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
        }));

        return NextResponse.json(leaderboard);
    } catch (err) {
        console.error("Leaderboard error:", err);
        return NextResponse.json({ error: "Failed to load leaderboard" }, { status: 500 });
    }
}
