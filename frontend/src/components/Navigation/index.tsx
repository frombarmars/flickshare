import { TabItem, Tabs } from '@worldcoin/mini-apps-ui-kit-react';
import { Home, User, Plus, Gift, Film } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDevice } from '@/hooks/useDevice';

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

  useEffect(() => {
    if (value) {
      window.location.href = `/${value}`;
    }
  }, [value]);

  return (
    <Tabs value={value} onValueChange={setValue} className={`h-12 border-t border-gray-500 custom-tabs z-40 sticky ${os === 'android' ? 'mb-0 shadow-md' : ''}`}>
      <TabItem value="home" icon={<Home color='black' strokeWidth={2} size={24} />} className="py-3 custom-tab-item px-4" />
      <TabItem value="movie" icon={<Film color='black' strokeWidth={2} size={24} />} className="py-3 custom-tab-item px-4" />
      <TabItem value="new" icon={<Plus color='black' strokeWidth={2} size={24} />} className="py-3 custom-tab-item px-4" />
      <TabItem value="reward" icon={<Gift color='black' strokeWidth={2} size={24} />} className="py-3 custom-tab-item px-4" />
      <TabItem value="profile" icon={<User color='black' strokeWidth={2} size={24} />} className="py-3 custom-tab-item px-4" />
    </Tabs>
  );
};
