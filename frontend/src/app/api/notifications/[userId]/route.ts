
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, 
    context: { params: Promise<{ userId: string }> }
) {
  const params = await context.params;

  const userId = params.userId;

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const notifications = await prisma.notification.findMany({
    where: {
      recipientId: userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      triggeredBy: {
        select: {
          username: true,
          profilePicture: true,
        },
      },
    },
  });

  return NextResponse.json(notifications);
}
