'use client';
import { useLocale } from "@/context/LocaleContext";
import { useState, useEffect } from "react";

export default function LanguageSwitcher() {
  const { locale, changeLocale } = useLocale();
  const [activeLocale, setActiveLocale] = useState(locale);

  // Sync with context locale changes
  useEffect(() => {
    setActiveLocale(locale);
  }, [locale]);

  const handleLocaleChange = (newLocale: string) => {
    setActiveLocale(newLocale); // Immediate visual feedback
    changeLocale(newLocale); // Update context
  };

  return (
    <div className="inline-flex items-center gap-1 bg-white rounded-lg p-1 border border-gray-300 shadow-sm">
      <button
        onClick={() => handleLocaleChange('th')}
        className={`min-w-[56px] px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${
          activeLocale === 'th'
            ? 'bg-gray-900 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        ไทย
      </button>
      <button
        onClick={() => handleLocaleChange('en')}
        className={`min-w-[56px] px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${
          activeLocale === 'en'
            ? 'bg-gray-900 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        EN
      </button>
    </div>
  );
}
