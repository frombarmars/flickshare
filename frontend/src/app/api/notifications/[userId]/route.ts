
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, 
    context: { params: Promise<{ userId: string }> }
) {
  const params = await context.params;
  const { searchParams } = new URL(req.url);
  
  const userId = params.userId;
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const unreadOnly = searchParams.get('unreadOnly') === 'true';

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const whereClause: any = {
      recipientId: userId,
    };

    if (unreadOnly) {
      whereClause.isRead = false;
    }

    const [notifications, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
        include: {
          triggeredBy: {
            select: {
              username: true,
              profilePicture: true,
            },
          },
        },
      }),
      prisma.notification.count({
        where: whereClause,
      })
    ]);
    

    // Add action URLs based on notification type and entityId
    const enhancedNotifications = notifications.map(notification => {
      let actionUrl = '';
      
      switch (notification.type) {
        case 'like':
        case 'comment':
          actionUrl = `/review/${notification.entityId}`;
          break;
        case 'follow':
          actionUrl = `/profile/${notification.triggeredBy?.username}`;
          break;
        case 'review':
          actionUrl = `/review/${notification.entityId}`;
          break;
        default:
          actionUrl = '';
      }

      return {
        ...notification,
        actionUrl,
        entityType: getEntityType(notification.type)
      };
    });

    return NextResponse.json({
      notifications: enhancedNotifications,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' }, 
      { status: 500 }
    );
  }
}

function getEntityType(notificationType: string): string {
  switch (notificationType) {
    case 'like':
    case 'comment':
    case 'review':
      return 'review';
    case 'follow':
      return 'user';
    default:
      return 'unknown';
  }
}
