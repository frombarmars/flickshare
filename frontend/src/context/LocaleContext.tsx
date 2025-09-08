// src/context/LocaleContext.tsx or similar

'use client';

import { createContext, useState, useEffect, useContext } from 'react';

type LocaleContextType = {
    locale: string;
    changeLocale: (locale: string) => void;
};

const LocaleContext = createContext<LocaleContextType>({
    locale: 'th',
    changeLocale: () => {},
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
    const [locale, setLocale] = useState('th');

    useEffect(() => {
        const savedLocale = localStorage.getItem('locale');
        if (savedLocale) {
            setLocale(savedLocale);
        } else {
            const userLanguage = navigator.language || 'en';
            setLocale(userLanguage.startsWith('th') ? 'th' : 'en');
        }
    }, []);

    const changeLocale = (newLocale: string) => {
        setLocale(newLocale);
        localStorage.setItem('locale', newLocale);
    };

    return (
        <LocaleContext.Provider value={{ locale, changeLocale }}>
            {children}
        </LocaleContext.Provider>
    );
}

export function useLocale() {
    return useContext(LocaleContext);
}