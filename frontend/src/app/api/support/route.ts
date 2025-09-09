import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log(body);
    
    const { txHash, userId, reviewId, amount } = body;

    if (!userId || !reviewId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const support = await prisma.support.create({
      data: {
        txHash,
        userId,
        reviewId,
        amount,
      },
    });

    return NextResponse.json({ success: true, support });
  } catch (err) {
    console.error("Error saving support:", err);
    return NextResponse.json(
      { error: "Failed to save support" },
      { status: 500 }
    );
  }
}
