import prisma from "@/lib/prisma";

/**
 * Award points to a user with optional one-time enforcement by type,
 * and built-in daily idempotency for CHECKIN.
 *
 * - type is a string category (e.g., "REVIEW_SUBMIT", "SUPPORT_SPEND", "CHECKIN", "FOLLOW_X")
 * - points is an integer
 * - once: if true, only award once per user/type (social tasks)
 */
export async function awardPoints(
  userId: string,
  type: string,
  points: number,
  opts?: { once?: boolean }
) {
  // Daily idempotency for CHECKIN
  if (type === "CHECKIN") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alreadyCheckedIn = await prisma.pointTransaction.findFirst({
      where: {
        userId,
        type: "CHECKIN",
        createdAt: { gte: today },
      },
    });

    if (alreadyCheckedIn) {
      return { ok: false, message: "Already checked in today" };
    }
  }

  // One-time idempotency (e.g., social tasks)
  if (opts?.once) {
    const already = await prisma.pointTransaction.findFirst({
      where: { userId, type },
    });
    if (already) {
      return { ok: false, message: `Already awarded for ${type}` };
    }
  }

  // Record transaction
  await prisma.pointTransaction.create({
    data: {
      userId,
      type,
      points,
    },
  });

  // Increment user total
  await prisma.user.update({
    where: { id: userId },
    data: { totalPoints: { increment: points } },
  });

  return { ok: true, points };
}