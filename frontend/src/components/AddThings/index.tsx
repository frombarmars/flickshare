'use client';
import { useLocale } from '@/context/LocaleContext';

export const AddThings = () => {
    const { locale } = useLocale();
    return (
        <div className="flex flex-col gap-4 rounded-xl w-full border-2 border-gray-200 p-4">
            {locale}
        </div>
    );
};