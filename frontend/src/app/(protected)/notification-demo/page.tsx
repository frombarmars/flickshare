'use client';

import { useNotifications } from '@/components/NotificationProvider';
import { useState } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, Star } from 'lucide-react';

const NotificationDemo = () => {
  const { showNotification } = useNotifications();
  const [counter, setCounter] = useState(1);

  const testNotifications = [
    {
      type: 'like' as const,
      message: 'liked your review of "The Matrix"',
      triggeredBy: {
        username: 'moviefan123',
        profilePicture: '/placeholder.jpeg'
      },
      actionUrl: '/review/123'
    },
    {
      type: 'comment' as const,
      message: 'commented on your review',
      triggeredBy: {
        username: 'cinephile_jane',
        profilePicture: '/placeholder.jpeg'
      },
      actionUrl: '/review/456'
    },
    {
      type: 'follow' as const,
      message: 'started following you',
      triggeredBy: {
        username: 'film_critic',
        profilePicture: '/placeholder.jpeg'
      },
      actionUrl: '/profile/film_critic'
    },
    {
      type: 'review' as const,
      message: 'reviewed a movie you might like',
      triggeredBy: {
        username: 'top_reviewer',
        profilePicture: '/placeholder.jpeg'
      },
      actionUrl: '/review/789'
    }
  ];

  const showRandomNotification = () => {
    const randomNotification = testNotifications[Math.floor(Math.random() * testNotifications.length)];
    showNotification({
      ...randomNotification,
      message: `${randomNotification.message} (Test #${counter})`
    });
    setCounter(prev => prev + 1);
  };

  const showSystemNotification = () => {
    showNotification({
      type: 'system',
      message: `System notification test #${counter}`,
      autoHide: true,
      duration: 3000
    });
    setCounter(prev => prev + 1);
  };

  const showPersistentNotification = () => {
    showNotification({
      type: 'achievement',
      message: `Achievement unlocked! Test #${counter}`,
      autoHide: false,
      triggeredBy: {
        username: 'FlickShare',
        profilePicture: '/logo.svg'
      }
    });
    setCounter(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-6 h-6 text-blue-500" />
            <h1 className="text-xl font-bold text-gray-900">Notification Demo</h1>
          </div>

          <div className="space-y-4">
            <button
              onClick={showRandomNotification}
              className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <Heart className="w-4 h-4" />
              Show Random Notification
            </button>

            <button
              onClick={showSystemNotification}
              className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
            >
              <Bell className="w-4 h-4" />
              Show System Notification
            </button>

            <button
              onClick={showPersistentNotification}
              className="w-full px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
            >
              <Star className="w-4 h-4" />
              Show Persistent Notification
            </button>
          </div>

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Test Features:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Auto-hide notifications (5s default)</li>
              <li>• Persistent notifications (manual dismiss)</li>
              <li>• Different notification types with icons</li>
              <li>• Smooth animations and transitions</li>
              <li>• Click to navigate functionality</li>
              <li>• Progress bar for auto-hide timing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationDemo;