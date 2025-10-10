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
      return <Heart className="w-4 h-4 text-red-500" />;
    case 'comment':
      return <MessageCircle className="w-4 h-4 text-blue-500" />;
    case 'follow':
      return <UserPlus className="w-4 h-4 text-green-500" />;
    case 'review':
      return <Star className="w-4 h-4 text-yellow-500" />;
    default:
      return <Bell className="w-4 h-4 text-gray-500" />;
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
      className={`relative group transition-all duration-200 ${
        notification.isRead 
          ? 'bg-gray-50/80 border-gray-100' 
          : 'bg-white border-blue-100 shadow-sm hover:shadow-md'
      } border rounded-xl p-3 ${isActionable ? 'cursor-pointer hover:border-blue-200' : 'cursor-default'}`}
      onClick={handleClick}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <div className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full" />
      )}
      
      <div className="flex items-start gap-3">
        {/* Notification icon */}
        <div className="flex-shrink-0 mt-0.5">
          <div className="p-1.5 rounded-full bg-gray-100">
            {getNotificationIcon(notification.type)}
          </div>
        </div>

        {/* User avatar */}
        <div className="flex-shrink-0">
          <Image
            src={notification.triggeredBy?.profilePicture || '/placeholder.jpeg'}
            alt={notification.triggeredBy?.username || 'User'}
            width={36}
            height={36}
            className="rounded-full ring-2 ring-white shadow-sm"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <Link 
              href={`/profile/${notification.triggeredBy?.username}`} 
              className="font-semibold text-gray-900 hover:text-blue-600 transition-colors text-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {notification.triggeredBy?.username || 'Unknown User'}
            </Link>
            {notification.isRead && (
              <CheckCheck className="w-3 h-3 text-green-500" />
            )}
          </div>
          
          <p className="text-gray-700 text-sm leading-relaxed">
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between">
            <time className="text-xs text-gray-500">
              {formatTimeAgo(notification.createdAt)}
            </time>
            
            {isMarking && (
              <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
      <Bell className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-base font-semibold text-gray-900 mb-2">No notifications yet</h3>
    <p className="text-gray-500 text-sm max-w-sm">
      When someone likes your reviews or follows you, you&apos;ll see notifications here.
    </p>
  </div>
);

const LoadingSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="bg-white border border-gray-100 rounded-xl p-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
          <div className="w-9 h-9 bg-gray-200 rounded-full animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
            <div className="h-2 bg-gray-200 rounded animate-pulse w-1/4" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

interface NotificationsListProps {
  unreadCount: number;
}

export const NotificationsList = ({ unreadCount }: NotificationsListProps) => {
  const router = useRouter();
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const {
    notifications,
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

  // Helper function to get numeric ID from entityId
  const getNumericId = useCallback(async (entityId: string): Promise<string> => {
    if (/^\d+$/.test(entityId)) {
      return entityId;
    }
    
    if (entityId.length === 24 && /^[0-9a-fA-F]{24}$/.test(entityId)) {
      try {
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
      let redirectUrl = '/home';

      if (notification.actionUrl) {
        redirectUrl = notification.actionUrl;
      } else if (notification.entityId) {
        if (['LIKE', 'COMMENT', 'SUPPORT'].includes(notification.type)) {
          const numericId = await getNumericId(notification.entityId);
          redirectUrl = `/review/${numericId}`;
        }
      } else if (notification.type === 'follow' && notification.triggeredBy?.username) {
        redirectUrl = `/profile/${notification.triggeredBy.username}`;
      } else if (notification.type === 'review' && notification.entityId) {
        const numericId = await getNumericId(notification.entityId);
        redirectUrl = `/review/${numericId}`;
      }

      await router.push(redirectUrl);
    } catch (error) {
      console.error('Failed to navigate from notification:', error);
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

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3 mx-auto">
          <Bell className="w-6 h-6 text-red-500" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Failed to load notifications</h3>
        <p className="text-gray-500 text-xs mb-3">Please try again later</p>
        <button
          onClick={handleRefresh}
          className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              className="px-2 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {isMarkingAll ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Marking...
                </>
              ) : (
                <>
                  <Check className="w-3 h-3" />
                  Mark all read
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : !notifications || notifications.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {notifications.slice(0, 10).map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              onNotificationClick={handleNotificationClick}
              isMarking={markingIds.has(notification.id)}
            />
          ))}
          {notifications.length > 10 && (
            <div className="text-center py-2">
              <p className="text-xs text-gray-500">Showing recent 10 notifications</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};