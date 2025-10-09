
'use client';

import { INotification } from '@/types/interfaces/interface';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef, useCallback } from 'react';
import { 
  Heart, 
  MessageCircle, 
  UserPlus, 
  Star, 
  Bell,
  ChevronLeft,
  Check,
  CheckCheck,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useNotificationsData } from '@/hooks/useNotificationsData';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'like':
      return <Heart className="w-5 h-5 text-red-500" />;
    case 'comment':
      return <MessageCircle className="w-5 h-5 text-blue-500" />;
    case 'follow':
      return <UserPlus className="w-5 h-5 text-green-500" />;
    case 'review':
      return <Star className="w-5 h-5 text-yellow-500" />;
    default:
      return <Bell className="w-5 h-5 text-gray-500" />;
  }
};

const formatTimeAgo = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  
  return date.toLocaleDateString();
};

const NotificationItem = ({ 
  notification, 
  onMarkAsRead, 
  isMarking,
  onNotificationClick
}: { 
  notification: INotification; 
  onMarkAsRead: (id: string) => void;
  isMarking: boolean;
  onNotificationClick: (notification: INotification) => void;
}) => {
  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
    onNotificationClick(notification);
  };

  const isActionable = ['like', 'comment', 'support', 'follow', 'review'].includes(notification.type);

  return (
    <div
      className={`relative group transition-all duration-300 ease-out transform hover:scale-[1.02] ${
        notification.isRead 
          ? 'bg-gray-50/80 border-gray-100' 
          : 'bg-white border-blue-100 shadow-sm hover:shadow-md'
      } border rounded-xl p-4 ${isActionable ? 'cursor-pointer hover:border-blue-200' : 'cursor-default'}`}
      onClick={handleClick}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
      )}
      
      <div className="flex items-start gap-3">
        {/* Notification icon */}
        <div className="flex-shrink-0 mt-1">
          <div className="p-2 rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors">
            {getNotificationIcon(notification.type)}
          </div>
        </div>

        {/* User avatar */}
        <div className="flex-shrink-0">
          <Image
            src={notification.triggeredBy?.profilePicture || '/placeholder.jpeg'}
            alt={notification.triggeredBy?.username || 'User'}
            width={44}
            height={44}
            className="rounded-full ring-2 ring-white shadow-sm"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <Link 
              href={`/profile/${notification.triggeredBy?.username}`} 
              className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {notification.triggeredBy?.username || 'Unknown User'}
            </Link>
            {notification.isRead && (
              <CheckCheck className="w-4 h-4 text-green-500" />
            )}
          </div>
          
          <p className="text-gray-700 text-sm leading-relaxed">
            {notification.message}
          </p>
          
          {/* Click hint for actionable notifications */}
          {['like', 'comment', 'support'].includes(notification.type) && (
            <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
              <span>Tap to view review</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </p>
          )}
          
          {notification.type === 'follow' && (
            <p className="text-xs text-green-600 font-medium flex items-center gap-1">
              <span>Tap to view profile</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </p>
          )}
          
          <div className="flex items-center justify-between">
            <time className="text-xs text-gray-500 font-medium">
              {formatTimeAgo(notification.createdAt)}
            </time>
            
            {isMarking && (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
      <Bell className="w-10 h-10 text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications yet</h3>
    <p className="text-gray-500 text-sm max-w-sm">
      When someone likes your reviews or follows you, you&apos;ll see notifications here.
    </p>
  </div>
);

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
          <div className="w-11 h-11 bg-gray-200 rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/4" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const NotificationPage = () => {
  const router = useRouter();
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = useRef<number>(0);
  const isPulling = useRef<boolean>(false);
  
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead: markAsReadHook,
    markAllAsRead: markAllAsReadHook,
    refresh
  } = useNotificationsData();

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    if (markingIds.has(notificationId)) return;

    setMarkingIds(prev => new Set(prev).add(notificationId));

    try {
      await markAsReadHook(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    } finally {
      setMarkingIds(prev => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }
  }, [markAsReadHook, markingIds]);

  // Helper function to get numeric ID from entityId (handles both numeric strings and ObjectIds)
  const getNumericId = useCallback(async (entityId: string): Promise<string> => {
    // If it's already a numeric string, return it
    if (/^\d+$/.test(entityId)) {
      return entityId;
    }
    
    // If it looks like an ObjectId, try to convert it via API
    if (entityId.length === 24 && /^[0-9a-fA-F]{24}$/.test(entityId)) {
      try {
        // Call an API to get numericId from ObjectId (we'll need to create this endpoint)
        const response = await fetch(`/api/reviews/numeric-id/${entityId}`);
        if (response.ok) {
          const data = await response.json();
          return data.numericId?.toString() || entityId;
        }
      } catch (error) {
        console.error('Failed to convert ObjectId to numericId:', error);
      }
    }
    
    return entityId;
  }, []);

  const handleNotificationClick = useCallback(async (notification: INotification) => {
    try {
      // Determine redirect URL based on notification type and data
      console.log("Called in handle noti");
      console.log(notification);
      
      
      let redirectUrl = '/home'; // Default fallback

      if (notification.actionUrl) {
        // Use actionUrl if provided
        redirectUrl = notification.actionUrl;
        console.log('Using actionUrl:', redirectUrl);
      } else if (notification.entityId) {
        // For review-related notifications (like, comment, support)
        if (['LIKE', 'COMMENT', 'SUPPORT'].includes(notification.type)) {
          const numericId = await getNumericId(notification.entityId);
          redirectUrl = `/review/${numericId}`;
          console.log(`Redirecting to review for ${notification.type}:`, redirectUrl);
        }
      } else if (notification.type === 'follow' && notification.triggeredBy?.username) {
        // For follow notifications, redirect to the follower's profile
        redirectUrl = `/profile/${notification.triggeredBy.username}`;
        console.log('Redirecting to profile:', redirectUrl);
      } else if (notification.type === 'review' && notification.entityId) {
        // For new review notifications, redirect to the review
        const numericId = await getNumericId(notification.entityId);
        redirectUrl = `/review/${numericId}`;
        console.log('Redirecting to new review:', redirectUrl);
      }

      console.log(`Notification clicked - Type: ${notification.type}, EntityId: ${notification.entityId}, Redirecting to: ${redirectUrl}`);
      
      // Navigate to the determined URL
      await router.push(redirectUrl);
    } catch (error) {
      console.error('Failed to navigate from notification:', error);
      // Fallback to home page if navigation fails
      router.push('/home');
    }
  }, [router, getNumericId]);

  const handleMarkAllAsRead = useCallback(async () => {
    if (!notifications || isMarkingAll) return;

    const unreadNotificationIds = notifications
      .filter((n) => !n.isRead)
      .map((n) => n.id);

    if (unreadNotificationIds.length === 0) return;

    setIsMarkingAll(true);

    try {
      await markAllAsReadHook();
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
    } finally {
      setIsMarkingAll(false);
    }
  }, [notifications, markAllAsReadHook, isMarkingAll]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [refresh]);

  const handleTouchStart = (e: React.TouchEvent) => {
    pullStartY.current = e.touches[0].clientY;
    isPulling.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - pullStartY.current;
    
    if (diff > 50 && window.scrollY === 0 && !isPulling.current) {
      isPulling.current = true;
      handleRefresh();
    }
  };



  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
            <Bell className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load notifications</h3>
          <p className="text-gray-500 text-sm mb-4">Please try again later</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gray-50"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
                {unreadCount > 0 && (
                  <p className="text-sm text-gray-500">{unreadCount} unread</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAll}
                  className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isMarkingAll ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Marking...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Mark all read
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        {isLoading ? (
          <LoadingSkeleton />
        ) : !notifications || notifications.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onNotificationClick={handleNotificationClick}
                isMarking={markingIds.has(notification.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPage;
