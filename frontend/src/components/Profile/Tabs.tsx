
import { Bell } from 'lucide-react';

interface TabsProps {
  tab: string;
  setTab: (tab: string) => void;
  isOwner?: boolean;
  unreadCount?: number;
}

export const Tabs = ({ tab, setTab, isOwner = false, unreadCount = 0 }: TabsProps) => {
  const tabs = isOwner ? ["review", "support", "notifications"] : ["review", "support"];
  
  return (
    <nav className="mb-6">
      <div className="bg-gray-50 rounded-2xl p-1 border border-gray-100">
        <div className={`grid ${isOwner ? 'grid-cols-3' : 'grid-cols-2'} gap-1`}>
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`!py-2 !px-2 text-center text-sm font-semibold rounded-xl transition-all duration-200 touch-manipulation active:scale-95 relative ${tab === t
                ? "!bg-white !text-black !shadow-sm border !border-gray-200"
                : "!text-gray-600 !hover:bg-black !hover:text-white !active:bg-black !active:text-white"
                }`}
            >
              <div className="flex items-center justify-center gap-1">
                {t === 'notifications' && (
                  <Bell className="w-3.5 h-3.5" />
                )}
                <span>{t.charAt(0).toUpperCase() + t.slice(1)}</span>
                {t === 'notifications' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};
