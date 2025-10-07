import { useSession } from 'next-auth/react';
import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Home, User, Plus, Gift, Film, AlarmCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import useSWR, { mutate } from 'swr';

/**
 * This component uses the UI Kit to navigate between pages
 * Bottom navigation is the most common navigation pattern in Mini Apps
 * We require mobile first design patterns for mini apps
 * Read More: https://docs.world.org/mini-apps/design/app-guidelines#mobile-first
 */

import { useDevice } from '@/hooks/useDevice';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * A bottom navigation component that navigates between
 * different pages in the app.
 * It uses the Tabs component from the UI Kit.
 * The tabs are Home, Movie, New, Reward, Profile, and Transaction.
 * When a tab is pressed, it navigates to the corresponding page.
*/
export const Navigation = () => {
  const [value, setValue] = useState('');
  const os = useDevice();
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { data } = useSWR(userId ? `/api/notifications/unread-count/${userId}` : null, fetcher, { refreshInterval: 5000 });

  useEffect(() => {
    if (value) {
      if (value === 'notification') {
        mutate(userId ? `/api/notifications/unread-count/${userId}` : null);
      }
      window.location.href = `/${value}`;
    }
  }, [value, userId]);

  return (
    <Tabs value={value} onValueChange={setValue} className={`h-12 border-t border-gray-500 custom-tabs ${os === 'android' ? 'mb-0 shadow-md' : ''}`}>
      <TabItem value="home" icon={<Home color='black' strokeWidth={2} size={24} />} className="py-3 custom-tab-item px-4" />
      <TabItem value="movie" icon={<Film color='black' strokeWidth={2} size={24} />} className="py-3 custom-tab-item px-4" />
      <TabItem value="new" icon={<Plus color='black' strokeWidth={2} size={24} />} className="py-3 custom-tab-item px-4" />
      <TabItem
        value="notification"
        icon={
          <div className="relative">
            <AlarmCheck color='black' strokeWidth={2} size={24} />
            {data?.unreadCount > 0 && (
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500" />
            )}
          </div>
        }
        className="py-3 custom-tab-item px-4"
      />
      <TabItem value="reward" icon={<Gift color='black' strokeWidth={2} size={24} />} className="py-3 custom-tab-item px-4" />
      <TabItem value="profile" icon={<User color='black' strokeWidth={2} size={24} />} className="py-3 custom-tab-item px-4" />
    </Tabs>
  );
};
