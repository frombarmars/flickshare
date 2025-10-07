
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const { notificationIds, userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  if (!notificationIds || !Array.isArray(notificationIds)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  await prisma.notification.updateMany({
    where: {
      id: {
        in: notificationIds,
      },
      recipientId: userId,
    },
    data: {
      isRead: true,
    },
  });

  return NextResponse.json({ success: true });
}
