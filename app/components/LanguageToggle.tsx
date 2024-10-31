'use client';

import { useLanguage } from '@contexts/LanguageContext';

export const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
      className="hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded transition-colors"
      aria-label="Toggle language"
    >
      <span className="text-sm font-medium">
        {language === 'en' ? 'عربي' : 'English'}
      </span>
    </button>
  );
};