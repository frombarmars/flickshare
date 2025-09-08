'use client';
import { useLocale } from "@/context/LocaleContext";

export default function LanguageSwitcher() {
  const { locale, changeLocale } = useLocale();

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <button
        onClick={() => changeLocale('th')}
        className={`min-w-[64px] px-4 py-2 rounded-xl text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${locale === 'th'
          ? 'bg-gray-400 text-gray-800 hover:bg-gray-200'
          : 'bg-blue-600 text-white'
          }`}
      >
        ไทย
      </button>
      <button
        onClick={() => changeLocale('en')}
        className={`min-w-[64px] px-4 py-2 rounded-xl text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${locale === 'en'
          ? 'bg-gray-400 text-gray-800 hover:bg-gray-200'
          : 'bg-blue-600 text-white'
          }`}
      >
        EN
      </button>
    </div>
  );
}
