// app/api/user/me/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
    const session = await auth();
    if (!session?.user?.walletAddress) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { walletAddress: session.user.walletAddress.toLowerCase() },
        select: {
            username: true,
            discordUsername: true,
            twitterUsername: true,
            walletAddress: true,
            profilePicture: true,
        },
    });

    return NextResponse.json(user);
}
