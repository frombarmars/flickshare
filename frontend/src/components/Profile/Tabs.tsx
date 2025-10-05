
interface TabsProps {
  tab: string;
  setTab: (tab: string) => void;
}

export const Tabs = ({ tab, setTab }: TabsProps) => {
  return (
    <nav className="mb-6">
      <div className="bg-gray-50 rounded-2xl p-1 border border-gray-100">
        <div className="grid grid-cols-2 gap-1">
          {["review", "support"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`!py-2 !px-2 text-center text-sm font-semibold rounded-xl transition-all duration-200 touch-manipulation active:scale-95 ${tab === t
                ? "!bg-white !text-black !shadow-sm border !border-gray-200"
                : "!text-gray-600 !hover:bg-black !hover:text-white !active:bg-black !active:text-white"
                }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};
