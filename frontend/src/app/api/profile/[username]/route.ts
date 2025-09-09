import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ username: string }> }
) {
  const params = await context.params;

  const username = params.username;

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        walletAddress: true,
        username: true,
        profilePicture: true,
        twitterUsername: true,
        createdAt: true,
        updatedAt: true,
        reviews: {
          select: {
            id: true,
            numericId: true, // 👈 explicitly include numericId
            comment: true,
            rating: true,
            createdAt: true,
            updatedAt: true,
            movie: true, // or select fields explicitly
          },
          orderBy: { createdAt: "desc" },
        },
        supports: {
          include: {
            review: {
              select: {
                id: true,
                numericId: true, // 👈 include numericId for supported reviews
                comment: true,
                rating: true,
                movie: true,
                reviewer: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });


    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
