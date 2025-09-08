import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { awardPoints } from "@/lib/points";

// ACTION_MAP extension
const ACTION_MAP: Record<string, { points?: number; once?: boolean; dynamic?: boolean }> = {
  REVIEW_SUBMIT: { points: 10 },

  // Social (one-time)
  FOLLOW_DISCORD: { points: 20, once: true },
  FOLLOW_X: { points: 20, once: true },
  FOLLOW_INSTAGRAM: { points: 20, once: true },
  FOLLOW_FACEBOOK: { points: 20, once: true },
  FOLLOW_LINKEDIN: { points: 20, once: true },
  REACT_TO_TWEET: { points: 5, once: true },

  // Check-in (daily)
  CHECKIN: { points: 5 },

  // Refer
  REFER_A_FRIEND: { points: 50 },
  BEING_REFERRED: { points: 50, once: true },

  // New: Supporting a review with WLD
  SUPPORT_REVIEW: { dynamic: true }, // points depend on amount
};


export async function POST(
  req: NextRequest,
  context: { params: Promise<{ action: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { action } = await context.params;
  const body = await req.json().catch(() => ({}));

  const key = (action || "").toUpperCase();
  const config = ACTION_MAP[key];

  if (!config) {
    return NextResponse.json({ ok: false, error: `Unsupported action: ${key}` }, { status: 400 });
  }

  let points = config.points ?? 0;

  if (key === "SUPPORT_REVIEW") {
    const { amountWLD } = body; // e.g., { amountWLD: 3 }
    if (!amountWLD || amountWLD <= 0) {
      return NextResponse.json({ ok: false, error: "Missing or invalid amountWLD" }, { status: 400 });
    }
    points = 10 * amountWLD; // 1 WLD = 1 point (tweak as needed)
  }

  const result = await awardPoints(session.user.id, key, points, {
    once: !!config.once,
  });

  const status = result.ok ? 200 : 409;
  return NextResponse.json(result, { status });
}
