'use client';

import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { useCallback, useMemo } from 'react';
import { INotification } from '@/types/interfaces/interface';

interface UseNotificationsResult {
  notifications: INotification[];
  unreadCount: number;
  isLoading: boolean;
  error: any;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const useNotificationsData = (): UseNotificationsResult => {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // Fetch notifications using existing endpoint
  const {
    data: notificationData,
    error: notificationError,
    mutate: mutateNotifications,
    isLoading: notificationsLoading
  } = useSWR<{
    notifications: INotification[];
    pagination: any;
  }>(
    userId ? `/api/notifications/${userId}` : null,
    (url: string) => fetch(url).then(res => res.json()),
    {
      refreshInterval: 120000, // 2 minutes
      dedupingInterval: 60000, // Cache for 1 minute
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  // Fetch unread count using existing endpoint
  const {
    data: unreadData,
    mutate: mutateUnreadCount,
    isLoading: unreadLoading
  } = useSWR<{
    unreadCount: number;
  }>(
    userId ? `/api/notifications/unread-count/${userId}` : null,
    (url: string) => fetch(url).then(res => res.json()),
    {
      refreshInterval: 120000, // 2 minutes
      dedupingInterval: 60000, // Cache for 1 minute
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const data = {
    notifications: notificationData?.notifications || [],
    unreadCount: unreadData?.unreadCount || 0
  };
  const error = notificationError;
  const isLoading = notificationsLoading || unreadLoading;
  const mutate = useCallback(async () => {
    await Promise.all([mutateNotifications(), mutateUnreadCount()]);
  }, [mutateNotifications, mutateUnreadCount]);

  const notifications = useMemo(() => data?.notifications || [], [data?.notifications]);
  const unreadCount = data?.unreadCount || 0;

  const markAsRead = useCallback(async (id: string): Promise<void> => {
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [id], userId })
      });
      
      // Optimistically update both caches
      mutate();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }, [userId, mutate]);

  const markAllAsRead = useCallback(async (): Promise<void> => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) return;

    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: unreadIds, userId })
      });
      
      // Optimistic updates for both hooks
      mutateNotifications(current => current ? {
        ...current,
        notifications: current.notifications.map(n => ({ ...n, isRead: true }))
      } : current, false);
      
      mutateUnreadCount(current => ({ unreadCount: 0 }), false);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      throw error;
    }
  }, [mutateNotifications, mutateUnreadCount, userId, notifications]);

  const refresh = useCallback(async (): Promise<void> => {
    await mutate();
  }, [mutate]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh,
  };
};