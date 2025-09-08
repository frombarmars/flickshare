import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
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
          }
        }
      },
      orderBy: {
        reviews: {
          _count: 'desc'
        }
      }
    });

    // Calculate activity score for each user
    const usersWithScore = users.map(user => {
      // Simple algorithm to calculate activity score
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

    return NextResponse.json({
      users: usersWithScore
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}