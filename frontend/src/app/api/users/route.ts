import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const cursor = searchParams.get('cursor');
    const q = searchParams.get('q');

    const where = q
    ? {
        OR: [
          { username: { contains: q } },
          { walletAddress: { contains: q } },
          { discordUsername: { contains: q } },
          { twitterUsername: { contains: q } },
        ],
      }
    : {};

    const users = await prisma.user.findMany({
      take: limit,
      ...(cursor && {
        skip: 1, // Skip the cursor
        cursor: {
          id: cursor,
        },
      }),
      where,
      select: {
        id: true,
        username: true,
        walletAddress: true,
        profilePicture: true,
        discordUsername: true,
        twitterUsername: true,
        _count: {
          select: {
            reviews: true,
            supports: true,
            referrals: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const usersWithScore = users.map(user => {
      const activityScore = Math.min(100,
        (user._count.reviews * 5) +
        (user._count.supports * 2) +
        (user._count.referrals * 10)
      );

      return {
        ...user,
        activityScore
      };
    });

    let nextCursor: string | null = null;
    if (users.length === limit) {
      nextCursor = users[users.length - 1].id;
    }

    return NextResponse.json({
      users: usersWithScore,
      nextCursor,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
