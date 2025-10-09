'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { NotificationApi } from '@/lib/api-client';

interface NotificationContextType {
  unreadCount: number;
  refresh: () => Promise<void>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  refresh: async () => {},
  isLoading: false,
});

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  // Simple, single API call for unread count
  const { data, isLoading, mutate } = useSWR(
    userId ? `/api/notifications/unread-count/${userId}` : null,
    (url: string) => fetch(url).then(res => res.json()),
    {
      refreshInterval: 180000, // 3 minutes - simple and reasonable
      dedupingInterval: 60000, // Cache for 1 minute
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const refresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  const contextValue: NotificationContextType = {
    unreadCount: data?.unreadCount || 0,
    refresh,
    isLoading,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationCount = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationCount must be used within NotificationProvider');
  }
  return context;
};