import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";


export async function GET(
    req: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {

    const userId = (await context.params).userId;


    const inviteCode = await prisma.inviteCode.findFirst({
        where: {
            userId
        },
    });

    if (inviteCode) {
        return NextResponse.json({ code: inviteCode, message: "Invite code found" });
    }
    return NextResponse.json({ code: null, message: "No invite code found" });
}
