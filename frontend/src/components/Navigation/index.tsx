import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Home, User, Plus, Gift, Film, BellRing } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDevice } from '@/hooks/useDevice';
import { useNotificationCount } from '@/context/NotificationContext';

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
  const { unreadCount, refresh } = useNotificationCount();

  useEffect(() => {
    if (value) {
      if (value === 'notification') {
        refresh(); // Simple refresh when going to notifications
      }
      window.location.href = `/${value}`;
    }
  }, [value, refresh]);

  return (
    <Tabs value={value} onValueChange={setValue} className={`h-12 border-t border-gray-500 custom-tabs z-40 ${os === 'android' ? 'mb-0 shadow-md' : ''}`}>
      <TabItem value="home" icon={<Home color='black' strokeWidth={2} size={24} />} className="py-3 custom-tab-item px-4" />
      <TabItem value="movie" icon={<Film color='black' strokeWidth={2} size={24} />} className="py-3 custom-tab-item px-4" />
      <TabItem value="new" icon={<Plus color='black' strokeWidth={2} size={24} />} className="py-3 custom-tab-item px-4" />
      <TabItem
        value="notification"
        icon={
          <div className="relative">
            <BellRing 
              color={unreadCount > 0 ? '#2563eb' : 'black'} 
              strokeWidth={2} 
              size={24} 
              className={unreadCount > 0 ? 'animate-pulse' : ''}
            />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold shadow-lg animate-bounce">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
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
