import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const ctx = (await context.params);
  const userId = ctx.userId;
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const transactions = await prisma.pointTransaction.findMany({
    where: { userId: userId },
    select: { type: true, points: true },
  });

  const totalPoints = transactions.reduce((sum, t) => sum + t.points, 0);

  const completedTasks: Record<string, boolean> = {};
  for (const t of transactions) {
    completedTasks[t.type] = true; // one-time tasks are considered completed
  }

  return NextResponse.json({
    ok: true,
    totalPoints,
    completedTasks,
  });
}
