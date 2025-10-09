'use client';

/* eslint-disable react/prop-types */
import { useState, useEffect, useCallback } from 'react';
import { X, Bell, Heart, MessageCircle, UserPlus, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface NotificationToastProps {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'review' | 'support' | 'mention' | 'achievement' | 'system';
  message: string;
  triggeredBy?: {
    username: string;
    profilePicture: string;
  };
  actionUrl?: string;
  onDismiss: (id: string) => void;
  autoHide?: boolean;
  duration?: number;
}

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

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'like':
      return 'border-red-200 bg-red-50';
    case 'comment':
      return 'border-blue-200 bg-blue-50';
    case 'follow':
      return 'border-green-200 bg-green-50';
    case 'review':
      return 'border-yellow-200 bg-yellow-50';
    default:
      return 'border-gray-200 bg-gray-50';
  }
};

export const NotificationToast: React.FC<NotificationToastProps> = ({
  id,
  type,
  message,
  triggeredBy,
  actionUrl,
  onDismiss,
  autoHide = true,
  duration = 5000
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(id);
    }, 300);
  }, [onDismiss, id]);

  useEffect(() => {
    // Entrance animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    if (autoHide) {
      const hideTimer = setTimeout(() => {
        handleDismiss();
      }, duration);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(hideTimer);
      };
    }
    
    return () => clearTimeout(timer);
  }, [autoHide, duration, handleDismiss]);

  const handleClick = (e: React.MouseEvent) => {
    if (actionUrl) {
      e.preventDefault();
      window.location.href = actionUrl;
    }
    handleDismiss();
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm w-full
        transform transition-all duration-300 ease-out
        ${isVisible && !isExiting 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
        }
      `}
    >
      <div
        className={`
          border rounded-xl shadow-lg backdrop-blur-sm
          ${getNotificationColor(type)}
          cursor-pointer group hover:shadow-xl transition-all duration-200
        `}
        onClick={handleClick}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getNotificationIcon(type)}
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                {type}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              className="p-1 hover:bg-white hover:bg-opacity-50 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex items-start gap-3">
            {triggeredBy && (
              <Image
                src={triggeredBy.profilePicture || '/placeholder.jpeg'}
                alt={triggeredBy.username}
                width={32}
                height={32}
                className="rounded-full ring-2 ring-white shadow-sm flex-shrink-0"
              />
            )}
            
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 leading-relaxed">
                {triggeredBy && (
                  <span className="font-semibold text-gray-900">
                    {triggeredBy.username}
                  </span>
                )}
                {triggeredBy && ' '}
                {message}
              </p>
            </div>
          </div>

          {/* Action indicator */}
          {actionUrl && (
            <div className="mt-3 text-xs text-gray-500 flex items-center gap-1">
              <span>Tap to view</span>
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" />
            </div>
          )}
        </div>

        {/* Progress bar for auto-hide */}
        {autoHide && (
          <div className="h-1 bg-gray-200 rounded-b-xl overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all ease-linear"
              style={{
                width: '100%',
                animation: `shrink ${duration}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// CSS for the progress bar animation
const style = `
  @keyframes shrink {
    from { width: 100%; }
    to { width: 0%; }
  }
`;

// Inject the CSS
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = style;
  document.head.appendChild(styleElement);
}