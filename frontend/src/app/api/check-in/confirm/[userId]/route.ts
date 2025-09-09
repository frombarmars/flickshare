import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ userId: string }> },
) {
    const userId = (await context.params).userId;
    // Safety check: only allow once per day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alreadyCheckedIn = await prisma.checkIn.findFirst({
        where: {
            userId,
            createdAt: { gte: today },
        },
    });

    if (alreadyCheckedIn) {
        return NextResponse.json({ ok: false, message: "Already checked in today" });
    }

    // Create CheckIn record
    await prisma.checkIn.create({
        data: { userId },
    });

    // Add points transaction
    const points = 5;
    await prisma.pointTransaction.create({
        data: {
            userId,
            type: "CHECKIN",
            points,
        },
    });

    // Update total points (optional: you can compute client-side too)
    const totalPoints = await prisma.pointTransaction.aggregate({
        _sum: { points: true },
        where: { userId },
    });

    return NextResponse.json({
        ok: true,
        message: "Check-in confirmed",
        totalPoints: totalPoints._sum.points ?? 0,
    });
}
