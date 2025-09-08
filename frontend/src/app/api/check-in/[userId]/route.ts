import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { awardPoints } from "@/lib/points";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const userId = (await context.params).userId;

  // Check if user already checked in today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const already = await prisma.checkIn.findFirst({
    where: {
      userId,
      createdAt: { gte: today },
    },
  });

  if (already) {
    return NextResponse.json({ ok: false, message: "Already checked in today" });
  }

  // Create new check-in
  const checkIn = await prisma.checkIn.create({
    data: { userId },
  });

  // Airdrop: Check-in → +5 (daily idempotency enforced in awardPoints)
  await awardPoints(userId, "CHECKIN", 5);

  return NextResponse.json({ ok: true, checkIn });
}