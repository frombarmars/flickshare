
'use client';

import useSWR, { mutate } from 'swr';
import { INotification } from '@/types/interfaces/interface';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const NotificationPage = () => {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { data: notifications, error, mutate } = useSWR<INotification[]>(
    userId ? `/api/notifications/${userId}` : null,
    fetcher
  );

  const handleNotificationClick = async (notification: INotification) => {
    if (notification.isRead) return;

    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds: [notification.id], userId }),
      });
      mutate();
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const markAllAsRead = async () => {
    if (!notifications) return;

    const unreadNotificationIds = notifications
      .filter((n) => !n.isRead)
      .map((n) => n.id);

    if (unreadNotificationIds.length === 0) return;

    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds: unreadNotificationIds, userId }),
      });
      mutate();
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
    }
  };

  if (error) return <div>Failed to load notifications</div>;
  if (!notifications) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button
          onClick={markAllAsRead}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Mark all as read
        </button>
      </div>
      <div className="space-y-4">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 border rounded-lg shadow-sm flex items-center space-x-4 ${
              notification.isRead ? 'bg-gray-100' : 'bg-white'
            }`}
            onClick={() => handleNotificationClick(notification)}
          >
            <Image
              src={notification.triggeredBy.profilePicture || '/placeholder.jpeg'}
              alt={notification.triggeredBy.username}
              width={40}
              height={40}
              className="rounded-full"
            />
            <div>
              <p>
                <Link href={`/profile/${notification.triggeredBy.username}`} className="font-bold">
                  {notification.triggeredBy.username}
                </Link> {notification.message}
              </p>
              <p className="text-sm text-gray-500">{new Date(notification.createdAt).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationPage;
