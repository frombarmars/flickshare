// src/app/api/user/upsert-discord/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // your Prisma client

export async function POST(req: Request) {
    try {
        const { discordUsername, userWalletAddress } = await req.json();

        if (!discordUsername) {
            return NextResponse.json({ error: "No discordUsername provided" }, { status: 400 });
        }


        const updatedUser = await prisma.user.update({
            where: { walletAddress: userWalletAddress.toLowerCase() },
            data: { discordUsername },
        });

        return NextResponse.json({ success: true, user: updatedUser });
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to upsert Discord username" }, { status: 500 });
    }
}
