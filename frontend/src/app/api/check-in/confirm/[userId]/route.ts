import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
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
    return NextResponse.json({
      ok: false,
      message: "Already checked in today",
    });
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

  await prisma.user.update({
    where: { id: userId },
    data: {
      totalPoints: { increment: points },
    },
  });

  const updatedUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalPoints: true },
  });

  return NextResponse.json({
    ok: true,
    message: "Check-in confirmed",
    totalPoints: updatedUser?.totalPoints ?? 0,
  });
}
