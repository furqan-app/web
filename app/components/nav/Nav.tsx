"use client"

import { useLanguage } from '@contexts/LanguageContext';

export const Nav = () => {
    const { language, setLanguage, isRTL } = useLanguage();

    return (
        <nav className="bg-white dark:bg-black text-black dark:text-white px-4 shadow dark:shadow-slate-600 h-14 flex items-center"
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            <button 
                className="hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded transition-colors"
                onClick={() => document.documentElement.classList.toggle('dark')}
            >
                Toggle Dark Mode
            </button>

            <div className="flex-1" />

            <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'ar')}
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 
                    rounded px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors 
                    cursor-pointer outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option value="en">English</option>
                <option value="ar">العربية</option>
            </select>
        </nav>
    )
}