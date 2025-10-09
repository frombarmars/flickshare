'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { NotificationToast } from '../NotificationToast';

interface NotificationData {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'review' | 'support' | 'mention' | 'achievement' | 'system';
  message: string;
  triggeredBy?: {
    username: string;
    profilePicture: string;
  };
  actionUrl?: string;
  autoHide?: boolean;
  duration?: number;
}

interface NotificationContextType {
  showNotification: (notification: Omit<NotificationData, 'id'>) => void;
  dismissNotification: (id: string) => void;
  dismissAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const showNotification = useCallback((notification: Omit<NotificationData, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: NotificationData = {
      ...notification,
      id,
      autoHide: notification.autoHide ?? true,
      duration: notification.duration ?? 5000
    };

    setNotifications(prev => [...prev, newNotification]);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const value: NotificationContextType = {
    showNotification,
    dismissNotification,
    dismissAll
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      
      {/* Render notifications */}
      <div className="fixed top-0 right-0 z-50 p-4 pointer-events-none">
        <div className="space-y-3">
          {notifications.map((notification, index) => (
            <div 
              key={notification.id}
              style={{
                transform: `translateY(${index * 10}px)`,
                zIndex: 1000 - index
              }}
              className="pointer-events-auto"
            >
              <NotificationToast
                {...notification}
                onDismiss={dismissNotification}
              />
            </div>
          ))}
        </div>
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};