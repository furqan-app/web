'use client';

import { useRouter, usePathname } from 'next/navigation';

export const LanguageToggle = () => {
  const router = useRouter();
  const pathname = usePathname();
  const currentLang = pathname.startsWith('/ar') ? 'ar' : 'en';

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'ar' : 'en';
    const newPath = pathname.replace(/^\/[a-z]{2}/, `/${newLang}`);
    router.push(newPath);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded transition-colors"
      aria-label="Toggle language"
    >
      <span className="text-sm font-medium">
        {currentLang === 'en' ? 'عربي' : 'English'}
      </span>
    </button>
  );
};